const express = require('express');
const Joi = require('joi');
const { query } = require('../database/connection');
const { authenticateToken, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Order validation schema
const createOrderSchema = Joi.object({
  delivery_address_id: Joi.string().uuid().required(),
  order_type: Joi.string().valid('delivery', 'pickup').default('delivery'),
  items: Joi.array().items(
    Joi.object({
      menu_item_id: Joi.string().uuid().required(),
      quantity: Joi.number().integer().min(1).required(),
      special_instructions: Joi.string().allow(''),
      selected_modifiers: Joi.array().items(
        Joi.object({
          id: Joi.string().uuid().required(),
          name: Joi.string().required(),
          price_cents: Joi.number().integer().min(0).required()
        })
      ).default([])
    })
  ).min(1).required(),
  special_instructions: Joi.string().allow(''),
  tip_cents: Joi.number().integer().min(0).default(0)
});

// Calculate order totals
const calculateOrderTotals = async (items) => {
  let subtotal_cents = 0;
  
  for (const item of items) {
    // Get menu item price
    const itemResult = await query(
      'SELECT price_cents FROM menu_items WHERE id = $1 AND is_active = true',
      [item.menu_item_id]
    );
    
    if (itemResult.rows.length === 0) {
      throw new Error(`Menu item ${item.menu_item_id} not found`);
    }
    
    const itemPrice = itemResult.rows[0].price_cents;
    let itemTotal = itemPrice * item.quantity;
    
    // Add modifier prices
    if (item.selected_modifiers && item.selected_modifiers.length > 0) {
      const modifierTotal = item.selected_modifiers.reduce((sum, mod) => sum + mod.price_cents, 0);
      itemTotal += (modifierTotal * item.quantity);
    }
    
    subtotal_cents += itemTotal;
  }
  
  const tax_cents = Math.round(subtotal_cents * 0.08); // 8% tax
  const delivery_fee_cents = 300; // $3.00 delivery fee
  
  return {
    subtotal_cents,
    tax_cents,
    delivery_fee_cents,
    total_cents: subtotal_cents + tax_cents + delivery_fee_cents
  };
};

// Create new order
router.post('/', authenticateToken, requireRole(['customer']), async (req, res) => {
  try {
    const { error, value } = createOrderSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { delivery_address_id, order_type, items, special_instructions, tip_cents } = value;

    // Verify delivery address belongs to customer
    const addressResult = await query(
      'SELECT id FROM customer_addresses WHERE id = $1 AND customer_id = $2',
      [delivery_address_id, req.user.id]
    );

    if (addressResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid delivery address' });
    }

    // Calculate totals
    const totals = await calculateOrderTotals(items);
    totals.total_cents += tip_cents;

    // Calculate estimated prep time
    const itemIds = items.map(item => item.menu_item_id);
    const prepTimeResult = await query(
      'SELECT MAX(prep_time_minutes) as max_prep_time FROM menu_items WHERE id = ANY($1)',
      [itemIds]
    );
    
    const estimated_prep_time = prepTimeResult.rows[0].max_prep_time || 15;
    const estimated_delivery_time = new Date(Date.now() + (estimated_prep_time + 20) * 60000);

    // Create order
    const orderResult = await query(
      `INSERT INTO orders (
        customer_id, delivery_address_id, status, order_type,
        subtotal_cents, tax_cents, delivery_fee_cents, tip_cents, total_cents,
        estimated_prep_time, estimated_delivery_time, special_instructions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        req.user.id, delivery_address_id, 'placed', order_type,
        totals.subtotal_cents, totals.tax_cents, totals.delivery_fee_cents,
        tip_cents, totals.total_cents, estimated_prep_time,
        estimated_delivery_time, special_instructions
      ]
    );

    const order = orderResult.rows[0];

    // Create order line items
    for (const item of items) {
      // Get menu item details
      const itemResult = await query(
        'SELECT price_cents FROM menu_items WHERE id = $1',
        [item.menu_item_id]
      );
      
      const unit_price_cents = itemResult.rows[0].price_cents;
      let total_price_cents = unit_price_cents * item.quantity;
      
      // Add modifier costs
      if (item.selected_modifiers && item.selected_modifiers.length > 0) {
        const modifierTotal = item.selected_modifiers.reduce((sum, mod) => sum + mod.price_cents, 0);
        total_price_cents += (modifierTotal * item.quantity);
      }

      await query(
        `INSERT INTO order_line_items (
          order_id, menu_item_id, quantity, unit_price_cents, 
          total_price_cents, special_instructions, selected_modifiers
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          order.id, item.menu_item_id, item.quantity, unit_price_cents,
          total_price_cents, item.special_instructions,
          JSON.stringify(item.selected_modifiers)
        ]
      );
    }

    // Log order status change
    await query(
      'INSERT INTO order_status_history (order_id, status, changed_by) VALUES ($1, $2, $3)',
      [order.id, 'placed', req.user.id]
    );

    // Emit to Socket.IO (will be handled by socket handler)
    req.app.get('io').to('kitchen').emit('new_order', {
      ...order,
      customer_name: `${req.user.first_name} ${req.user.last_name}`
    });

    req.app.get('io').to('printers').emit('new_order', {
      ...order,
      customer_name: `${req.user.first_name} ${req.user.last_name}`
    });

    logger.info(`Order created: ${order.id} by customer ${req.user.id}`);

    res.status(201).json({
      message: 'Order placed successfully',
      order: {
        id: order.id,
        status: order.status,
        total_cents: order.total_cents,
        estimated_delivery_time: order.estimated_delivery_time,
        created_at: order.created_at
      }
    });
  } catch (error) {
    logger.error('Order creation error:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get user's orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 20, offset = 0, status } = req.query;

    let queryStr = `
      SELECT o.id, o.status, o.order_type, o.total_cents, o.estimated_delivery_time,
             o.actual_delivery_time, o.created_at,
             ca.address_line_1, ca.city, ca.state
      FROM orders o
      LEFT JOIN customer_addresses ca ON o.delivery_address_id = ca.id
      WHERE o.customer_id = $1
    `;
    
    const queryParams = [req.user.id];
    let paramCount = 2;

    if (status) {
      queryStr += ` AND o.status = $${paramCount}`;
      queryParams.push(status);
      paramCount++;
    }

    queryStr += ` ORDER BY o.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await query(queryStr, queryParams);

    res.json({ orders: result.rows });
  } catch (error) {
    logger.error('Orders fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get specific order with details
router.get('/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Get order details
    const orderResult = await query(
      `SELECT o.*, ca.address_line_1, ca.address_line_2, ca.city, ca.state, ca.postal_code,
              ca.latitude, ca.longitude,
              u.first_name as driver_first_name, u.last_name as driver_last_name,
              u.phone as driver_phone
       FROM orders o
       LEFT JOIN customer_addresses ca ON o.delivery_address_id = ca.id
       LEFT JOIN users u ON o.driver_id = u.id
       WHERE o.id = $1 AND o.customer_id = $2`,
      [orderId, req.user.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Get order items
    const itemsResult = await query(
      `SELECT oli.quantity, oli.unit_price_cents, oli.total_price_cents,
              oli.special_instructions, oli.selected_modifiers,
              mi.name as item_name, mi.image_url
       FROM order_line_items oli
       JOIN menu_items mi ON oli.menu_item_id = mi.id
       WHERE oli.order_id = $1`,
      [orderId]
    );

    order.items = itemsResult.rows;

    res.json({ order });
  } catch (error) {
    logger.error('Order details fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch order details' });
  }
});

// Update order status (kitchen/admin only)
router.patch('/:orderId/status', authenticateToken, requireRole(['staff', 'admin']), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, notes } = req.body;

    // Validate status transition following state machine
    const validStatuses = ['placed', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get current order
    const currentOrderResult = await query(
      'SELECT id, status FROM orders WHERE id = $1',
      [orderId]
    );

    if (currentOrderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const currentOrder = currentOrderResult.rows[0];

    // Validate state transition (simplified)
    const validTransitions = {
      'placed': ['accepted', 'cancelled'],
      'accepted': ['preparing', 'cancelled'],
      'preparing': ['ready', 'cancelled'],
      'ready': ['out_for_delivery', 'cancelled'],
      'out_for_delivery': ['delivered', 'cancelled']
    };

    if (!validTransitions[currentOrder.status]?.includes(status)) {
      return res.status(400).json({ 
        error: `Invalid status transition from ${currentOrder.status} to ${status}` 
      });
    }

    // Update order status
    const updateResult = await query(
      `UPDATE orders SET status = $1, updated_at = NOW() 
       WHERE id = $2 RETURNING *`,
      [status, orderId]
    );

    // Log status change
    await query(
      'INSERT INTO order_status_history (order_id, status, changed_by, notes) VALUES ($1, $2, $3, $4)',
      [orderId, status, req.user.id, notes]
    );

    // Emit status update
    req.app.get('io').to(`order_${orderId}`).emit('order_status_update', {
      orderId,
      status,
      timestamp: new Date().toISOString()
    });

    req.app.get('io').to('kitchen').emit('order_update', updateResult.rows[0]);

    logger.info(`Order ${orderId} status updated to ${status} by ${req.user.id}`);

    res.json({
      message: 'Order status updated successfully',
      order: updateResult.rows[0]
    });
  } catch (error) {
    logger.error('Order status update error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Cancel order (customer only, within time limit)
router.patch('/:orderId/cancel', authenticateToken, requireRole(['customer']), async (req, res) => {
  try {
    const { orderId } = req.params;

    // Get order
    const orderResult = await query(
      'SELECT id, status, created_at FROM orders WHERE id = $1 AND customer_id = $2',
      [orderId, req.user.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Check if order can be cancelled
    if (!['placed', 'accepted'].includes(order.status)) {
      return res.status(400).json({ error: 'Order cannot be cancelled at this stage' });
    }

    // Check time limit (5 minutes after placing)
    const timeDiff = Date.now() - new Date(order.created_at).getTime();
    if (timeDiff > 5 * 60 * 1000) { // 5 minutes
      return res.status(400).json({ error: 'Cancellation time limit exceeded' });
    }

    // Update order status
    await query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
      ['cancelled', orderId]
    );

    // Log status change
    await query(
      'INSERT INTO order_status_history (order_id, status, changed_by, notes) VALUES ($1, $2, $3, $4)',
      [orderId, 'cancelled', req.user.id, 'Cancelled by customer']
    );

    // Emit cancellation
    req.app.get('io').to('kitchen').emit('order_cancelled', { orderId });

    logger.info(`Order ${orderId} cancelled by customer ${req.user.id}`);

    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    logger.error('Order cancellation error:', error);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// Get order tracking info
router.get('/:orderId/tracking', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Verify order belongs to customer or driver
    let orderQuery = 'SELECT id, status, estimated_delivery_time, driver_id FROM orders WHERE id = $1';
    let queryParams = [orderId];

    if (req.user.role === 'customer') {
      orderQuery += ' AND customer_id = $2';
      queryParams.push(req.user.id);
    } else if (req.user.role === 'driver') {
      orderQuery += ' AND driver_id = $2';
      queryParams.push(req.user.id);
    }

    const orderResult = await query(orderQuery, queryParams);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Get latest driver location if driver assigned
    let driverLocation = null;
    if (order.driver_id) {
      const locationResult = await query(
        `SELECT latitude, longitude, updated_at
         FROM driver_profiles
         WHERE user_id = $1`,
        [order.driver_id]
      );

      if (locationResult.rows.length > 0) {
        driverLocation = locationResult.rows[0];
      }
    }

    res.json({
      order: {
        id: order.id,
        status: order.status,
        estimated_delivery_time: order.estimated_delivery_time
      },
      driver_location: driverLocation
    });
  } catch (error) {
    logger.error('Order tracking error:', error);
    res.status(500).json({ error: 'Failed to get tracking info' });
  }
});

module.exports = router;