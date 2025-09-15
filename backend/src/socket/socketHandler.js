const jwt = require('jsonwebtoken');
const { query } = require('../database/connection');
const logger = require('../utils/logger');

// Store active connections
const activeConnections = new Map();

function socketHandler(io) {
  // Middleware for Socket.IO authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      const role = socket.handshake.auth.role;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // For print agents, use special token verification
      if (role === 'printer') {
        if (token !== process.env.PRINT_AGENT_TOKEN) {
          return next(new Error('Invalid print agent token'));
        }
        socket.userId = 'print_agent';
        socket.userRole = 'printer';
        socket.agentId = socket.handshake.auth.agentId || socket.id;
        return next();
      }

      // For kitchen displays, use kitchen token (could be same as admin token)
      if (role === 'kitchen') {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const result = await query(
            'SELECT id, role, first_name, last_name FROM users WHERE id = $1 AND role IN ($2, $3)',
            [decoded.userId, 'staff', 'admin']
          );

          if (result.rows.length === 0) {
            return next(new Error('Unauthorized for kitchen access'));
          }

          socket.userId = result.rows[0].id;
          socket.userRole = 'kitchen';
          socket.userName = `${result.rows[0].first_name} ${result.rows[0].last_name}`;
          return next();
        } catch (error) {
          return next(new Error('Invalid kitchen token'));
        }
      }

      // Regular user authentication
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await query(
        'SELECT id, role, first_name, last_name, is_active FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length === 0 || !result.rows[0].is_active) {
        return next(new Error('User not found or inactive'));
      }

      const user = result.rows[0];
      socket.userId = user.id;
      socket.userRole = user.role;
      socket.userName = `${user.first_name} ${user.last_name}`;

      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return next(new Error('Invalid or expired token'));
      }
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} - User: ${socket.userId} (${socket.userRole})`);

    // Store connection info
    activeConnections.set(socket.id, {
      userId: socket.userId,
      userRole: socket.userRole,
      userName: socket.userName,
      connectedAt: new Date()
    });

    // Join appropriate rooms based on user role
    joinUserRooms(socket);

    // Handle role-specific events
    setupRoleHandlers(socket, io);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} - Reason: ${reason}`);
      activeConnections.delete(socket.id);
      
      // Handle driver going offline
      if (socket.userRole === 'driver') {
        handleDriverOffline(socket);
      }
    });

    // Send connection confirmation
    socket.emit('connected', {
      message: 'Successfully connected to real-time service',
      userId: socket.userId,
      role: socket.userRole,
      rooms: Array.from(socket.rooms)
    });
  });

  // Expose io instance to routes
  io.on('mount', (app) => {
    app.set('io', io);
  });
}

function joinUserRooms(socket) {
  switch (socket.userRole) {
    case 'customer':
      // Customers join their personal room for order updates
      socket.join(`customer_${socket.userId}`);
      break;

    case 'driver':
      // Drivers join drivers room and their personal room
      socket.join('drivers');
      socket.join(`driver_${socket.userId}`);
      handleDriverOnline(socket);
      break;

    case 'kitchen':
    case 'staff':
    case 'admin':
      // Kitchen staff join kitchen room for new orders
      socket.join('kitchen');
      break;

    case 'printer':
      // Print agents join printers room
      socket.join('printers');
      break;
  }

  logger.info(`User ${socket.userId} joined rooms: ${Array.from(socket.rooms).join(', ')}`);
}

function setupRoleHandlers(socket, io) {
  // Customer-specific handlers
  if (socket.userRole === 'customer') {
    setupCustomerHandlers(socket, io);
  }

  // Driver-specific handlers
  if (socket.userRole === 'driver') {
    setupDriverHandlers(socket, io);
  }

  // Kitchen staff handlers
  if (socket.userRole === 'kitchen' || socket.userRole === 'staff' || socket.userRole === 'admin') {
    setupKitchenHandlers(socket, io);
  }

  // Print agent handlers
  if (socket.userRole === 'printer') {
    setupPrintHandlers(socket, io);
  }
}

function setupCustomerHandlers(socket, io) {
  // Customer can join specific order room for tracking
  socket.on('join_order_tracking', async (data) => {
    try {
      const { orderId } = data;
      
      // Verify order belongs to customer
      const result = await query(
        'SELECT id FROM orders WHERE id = $1 AND customer_id = $2',
        [orderId, socket.userId]
      );

      if (result.rows.length > 0) {
        socket.join(`order_${orderId}`);
        socket.emit('joined_order_tracking', { orderId });
        logger.info(`Customer ${socket.userId} joined tracking for order ${orderId}`);
      } else {
        socket.emit('error', { message: 'Order not found or unauthorized' });
      }
    } catch (error) {
      logger.error('Join order tracking error:', error);
      socket.emit('error', { message: 'Failed to join order tracking' });
    }
  });

  // Customer can leave order tracking
  socket.on('leave_order_tracking', (data) => {
    const { orderId } = data;
    socket.leave(`order_${orderId}`);
    socket.emit('left_order_tracking', { orderId });
  });
}

function setupDriverHandlers(socket, io) {
  // Driver location updates
  socket.on('driver_location_update', async (data) => {
    try {
      const { orderId, latitude, longitude, speed, heading, accuracy } = data;

      // Validate data
      if (!latitude || !longitude) {
        socket.emit('error', { message: 'Invalid location data' });
        return;
      }

      // Update driver's current location
      await query(
        `UPDATE driver_profiles 
         SET current_latitude = $1, current_longitude = $2, last_location_update = NOW()
         WHERE user_id = $3`,
        [latitude, longitude, socket.userId]
      );

      // If driver has an active order, save location history and broadcast
      if (orderId) {
        // Verify driver is assigned to this order
        const orderResult = await query(
          'SELECT id FROM orders WHERE id = $1 AND driver_id = $2',
          [orderId, socket.userId]
        );

        if (orderResult.rows.length > 0) {
          // Save location history
          await query(
            `INSERT INTO driver_location_history 
             (driver_id, order_id, latitude, longitude, speed, heading, accuracy)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [socket.userId, orderId, latitude, longitude, speed, heading, accuracy]
          );

          // Broadcast to customer following this order
          io.to(`order_${orderId}`).emit('driver_location_update', {
            latitude,
            longitude,
            speed: speed || 0,
            heading: heading || 0,
            timestamp: new Date().toISOString()
          });

          // Calculate and emit ETA (simplified calculation)
          const estimatedMinutes = Math.round(Math.random() * 10 + 5); // Mock ETA
          io.to(`order_${orderId}`).emit('estimated_delivery_time', {
            eta_minutes: estimatedMinutes,
            updated_at: new Date().toISOString()
          });
        }
      }

      socket.emit('location_update_confirmed', { timestamp: new Date().toISOString() });
    } catch (error) {
      logger.error('Driver location update error:', error);
      socket.emit('error', { message: 'Failed to update location' });
    }
  });

  // Driver accepts order
  socket.on('accept_order', async (data) => {
    try {
      const { orderId } = data;

      // Verify order is available for pickup
      const orderResult = await query(
        'SELECT id, status FROM orders WHERE id = $1 AND driver_id IS NULL AND status = $2',
        [orderId, 'ready']
      );

      if (orderResult.rows.length === 0) {
        socket.emit('error', { message: 'Order not available' });
        return;
      }

      // Assign driver to order
      await query(
        'UPDATE orders SET driver_id = $1, status = $2, updated_at = NOW() WHERE id = $3',
        [socket.userId, 'out_for_delivery', orderId]
      );

      // Log status change
      await query(
        'INSERT INTO order_status_history (order_id, status, changed_by) VALUES ($1, $2, $3)',
        [orderId, 'out_for_delivery', socket.userId]
      );

      // Join order room for location updates
      socket.join(`order_${orderId}`);

      // Notify customer and kitchen
      io.to(`order_${orderId}`).emit('order_status_update', {
        orderId,
        status: 'out_for_delivery',
        driver_name: socket.userName,
        timestamp: new Date().toISOString()
      });

      io.to('kitchen').emit('order_update', {
        id: orderId,
        status: 'out_for_delivery',
        driver_id: socket.userId
      });

      socket.emit('order_accepted', { orderId });
      logger.info(`Driver ${socket.userId} accepted order ${orderId}`);
    } catch (error) {
      logger.error('Accept order error:', error);
      socket.emit('error', { message: 'Failed to accept order' });
    }
  });

  // Driver updates order status
  socket.on('update_order_status', async (data) => {
    try {
      const { orderId, status, notes } = data;

      // Verify driver is assigned to order
      const orderResult = await query(
        'SELECT id FROM orders WHERE id = $1 AND driver_id = $2',
        [orderId, socket.userId]
      );

      if (orderResult.rows.length === 0) {
        socket.emit('error', { message: 'Order not found or unauthorized' });
        return;
      }

      // Update order status
      await query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
        [status, orderId]
      );

      // Log status change
      await query(
        'INSERT INTO order_status_history (order_id, status, changed_by, notes) VALUES ($1, $2, $3, $4)',
        [orderId, status, socket.userId, notes]
      );

      // If delivered, record delivery time
      if (status === 'delivered') {
        await query(
          'UPDATE orders SET actual_delivery_time = NOW() WHERE id = $1',
          [orderId]
        );
      }

      // Broadcast status update
      io.to(`order_${orderId}`).emit('order_status_update', {
        orderId,
        status,
        timestamp: new Date().toISOString()
      });

      io.to('kitchen').emit('order_update', {
        id: orderId,
        status
      });

      socket.emit('status_update_confirmed', { orderId, status });
      logger.info(`Driver ${socket.userId} updated order ${orderId} to ${status}`);
    } catch (error) {
      logger.error('Order status update error:', error);
      socket.emit('error', { message: 'Failed to update order status' });
    }
  });
}

function setupKitchenHandlers(socket, io) {
  // Kitchen staff can update order status
  socket.on('update_order_status', async (data) => {
    try {
      const { orderId, status, notes } = data;

      // Validate status
      const validStatuses = ['accepted', 'preparing', 'ready', 'cancelled'];
      if (!validStatuses.includes(status)) {
        socket.emit('error', { message: 'Invalid status' });
        return;
      }

      // Update order
      await query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
        [status, orderId]
      );

      // Log status change
      await query(
        'INSERT INTO order_status_history (order_id, status, changed_by, notes) VALUES ($1, $2, $3, $4)',
        [orderId, status, socket.userId, notes]
      );

      // Broadcast to all relevant parties
      io.to(`order_${orderId}`).emit('order_status_update', {
        orderId,
        status,
        updated_by: socket.userName,
        timestamp: new Date().toISOString()
      });

      io.to('kitchen').emit('order_update', {
        id: orderId,
        status,
        updated_by: socket.userName
      });

      // If order is ready, notify available drivers
      if (status === 'ready') {
        io.to('drivers').emit('order_available', {
          orderId,
          estimated_prep_time: new Date().toISOString()
        });
      }

      socket.emit('status_update_confirmed', { orderId, status });
      logger.info(`Kitchen ${socket.userId} updated order ${orderId} to ${status}`);
    } catch (error) {
      logger.error('Kitchen order update error:', error);
      socket.emit('error', { message: 'Failed to update order status' });
    }
  });

  // Get active orders for kitchen display
  socket.on('get_active_orders', async () => {
    try {
      const result = await query(
        `SELECT o.id, o.status, o.created_at, o.estimated_prep_time, o.special_instructions,
                u.first_name, u.last_name, u.phone
         FROM orders o
         JOIN users u ON o.customer_id = u.id
         WHERE o.status IN ('placed', 'accepted', 'preparing', 'ready')
         ORDER BY o.created_at ASC`
      );

      const orders = [];
      for (const order of result.rows) {
        // Get line items
        const itemsResult = await query(
          `SELECT oli.quantity, oli.special_instructions, oli.selected_modifiers,
                  mi.name as menu_item_name
           FROM order_line_items oli
           JOIN menu_items mi ON oli.menu_item_id = mi.id
           WHERE oli.order_id = $1`,
          [order.id]
        );

        orders.push({
          ...order,
          customer_name: `${order.first_name} ${order.last_name}`,
          line_items: itemsResult.rows
        });
      }

      socket.emit('active_orders', { orders });
    } catch (error) {
      logger.error('Get active orders error:', error);
      socket.emit('error', { message: 'Failed to fetch active orders' });
    }
  });
}

function setupPrintHandlers(socket, io) {
  // Print agent confirms successful print
  socket.on('print_confirmation', async (data) => {
    try {
      const { order_id, print_type, status } = data;

      await query(
        'INSERT INTO print_confirmations (order_id, print_type, agent_id, status) VALUES ($1, $2, $3, $4)',
        [order_id, print_type || 'kitchen', socket.agentId, status || 'success']
      );

      logger.info(`Print confirmation received for order ${order_id} from agent ${socket.agentId}`);
    } catch (error) {
      logger.error('Print confirmation error:', error);
    }
  });

  // Print agent reports online status
  socket.on('printer_agent_online', (data) => {
    const { agent_id, printers } = data;
    socket.agentId = agent_id;
    logger.info(`Print agent ${agent_id} online with printers: ${printers?.join(', ') || 'unknown'}`);
    
    socket.emit('agent_status_confirmed', {
      agent_id,
      status: 'online',
      timestamp: new Date().toISOString()
    });
  });

  socket.on('printer_agent_offline', () => {
    logger.info(`Print agent ${socket.agentId} going offline`);
  });
}

async function handleDriverOnline(socket) {
  try {
    // Update driver online status
    await query(
      'UPDATE driver_profiles SET is_online = true WHERE user_id = $1',
      [socket.userId]
    );

    logger.info(`Driver ${socket.userId} is now online`);
  } catch (error) {
    logger.error('Driver online update error:', error);
  }
}

async function handleDriverOffline(socket) {
  try {
    // Update driver offline status
    await query(
      'UPDATE driver_profiles SET is_online = false WHERE user_id = $1',
      [socket.userId]
    );

    logger.info(`Driver ${socket.userId} is now offline`);
  } catch (error) {
    logger.error('Driver offline update error:', error);
  }
}

module.exports = socketHandler;