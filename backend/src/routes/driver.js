const express = require('express');
const Joi = require('joi');
const { query } = require('../database/connection');
const { authenticateToken, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get available orders for drivers
router.get('/available-orders', authenticateToken, requireRole(['driver']), async (req, res) => {
  try {
    const result = await query(
      `SELECT o.id, o.total_cents, o.estimated_delivery_time, o.special_instructions,
              ca.address_line_1, ca.city, ca.latitude, ca.longitude,
              u.first_name, u.last_name, u.phone
       FROM orders o
       JOIN customer_addresses ca ON o.delivery_address_id = ca.id
       JOIN users u ON o.customer_id = u.id
       WHERE o.status = 'ready' AND o.driver_id IS NULL
       ORDER BY o.created_at ASC`
    );

    const orders = [];
    for (const order of result.rows) {
      // Get order items for driver reference
      const itemsResult = await query(
        `SELECT oli.quantity, mi.name
         FROM order_line_items oli
         JOIN menu_items mi ON oli.menu_item_id = mi.id
         WHERE oli.order_id = $1`,
        [order.id]
      );

      orders.push({
        ...order,
        customer_name: `${order.first_name} ${order.last_name}`,
        items: itemsResult.rows
      });
    }

    res.json({ orders });
  } catch (error) {
    logger.error('Available orders fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch available orders' });
  }
});

// Accept an order
router.post('/accept-order/:orderId', authenticateToken, requireRole(['driver']), async (req, res) => {
  try {
    const { orderId } = req.params;

    // Check if driver is already assigned to an active order
    const activeOrderResult = await query(
      `SELECT id FROM orders 
       WHERE driver_id = $1 AND status IN ('out_for_delivery', 'ready')`,
      [req.user.id]
    );

    if (activeOrderResult.rows.length > 0) {
      return res.status(400).json({ error: 'You already have an active order' });
    }

    // Try to assign order to driver
    const result = await query(
      `UPDATE orders 
       SET driver_id = $1, status = 'out_for_delivery', updated_at = NOW()
       WHERE id = $2 AND driver_id IS NULL AND status = 'ready'
       RETURNING *`,
      [req.user.id, orderId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Order not available or already assigned' });
    }

    const order = result.rows[0];

    // Log status change
    await query(
      'INSERT INTO order_status_history (order_id, status, changed_by) VALUES ($1, $2, $3)',
      [orderId, 'out_for_delivery', req.user.id]
    );

    // Emit to Socket.IO - this will be handled by the socket handler
    req.app.get('io').to(`order_${orderId}`).emit('order_status_update', {
      orderId,
      status: 'out_for_delivery',
      driver_name: `${req.user.first_name} ${req.user.last_name}`,
      timestamp: new Date().toISOString()
    });

    logger.info(`Driver ${req.user.id} accepted order ${orderId}`);

    res.json({
      message: 'Order accepted successfully',
      order: {
        id: order.id,
        status: order.status,
        total_cents: order.total_cents,
        estimated_delivery_time: order.estimated_delivery_time
      }
    });
  } catch (error) {
    logger.error('Accept order error:', error);
    res.status(500).json({ error: 'Failed to accept order' });
  }
});

// Update driver location
router.post('/location', authenticateToken, requireRole(['driver']), async (req, res) => {
  try {
    const schema = Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required(),
      speed: Joi.number().min(0),
      heading: Joi.number().min(0).max(360),
      accuracy: Joi.number().min(0)
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { latitude, longitude, speed, heading, accuracy } = value;

    // Update driver profile location
    await query(
      `UPDATE driver_profiles 
       SET current_latitude = $1, current_longitude = $2, last_location_update = NOW()
       WHERE user_id = $3`,
      [latitude, longitude, req.user.id]
    );

    res.json({ 
      message: 'Location updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Location update error:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Get driver's current order
router.get('/current-order', authenticateToken, requireRole(['driver']), async (req, res) => {
  try {
    const result = await query(
      `SELECT o.id, o.status, o.total_cents, o.estimated_delivery_time, o.special_instructions,
              ca.address_line_1, ca.address_line_2, ca.city, ca.state, ca.postal_code,
              ca.latitude, ca.longitude,
              u.first_name, u.last_name, u.phone
       FROM orders o
       JOIN customer_addresses ca ON o.delivery_address_id = ca.id
       JOIN users u ON o.customer_id = u.id
       WHERE o.driver_id = $1 AND o.status IN ('out_for_delivery', 'ready')`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.json({ order: null });
    }

    const order = result.rows[0];

    // Get order items
    const itemsResult = await query(
      `SELECT oli.quantity, oli.special_instructions, oli.selected_modifiers,
              mi.name as item_name
       FROM order_line_items oli
       JOIN menu_items mi ON oli.menu_item_id = mi.id
       WHERE oli.order_id = $1`,
      [order.id]
    );

    order.customer_name = `${order.first_name} ${order.last_name}`;
    order.items = itemsResult.rows;

    res.json({ order });
  } catch (error) {
    logger.error('Current order fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch current order' });
  }
});

// Get driver earnings
router.get('/earnings', authenticateToken, requireRole(['driver']), async (req, res) => {
  try {
    const { period = 'today' } = req.query;

    let dateFilter = '';
    if (period === 'today') {
      dateFilter = "AND DATE(o.actual_delivery_time) = CURRENT_DATE";
    } else if (period === 'week') {
      dateFilter = "AND o.actual_delivery_time >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (period === 'month') {
      dateFilter = "AND o.actual_delivery_time >= CURRENT_DATE - INTERVAL '30 days'";
    }

    const result = await query(
      `SELECT 
         COUNT(*) as total_deliveries,
         COALESCE(SUM(o.tip_cents + 500), 0) as total_earnings_cents,
         COALESCE(AVG(o.tip_cents + 500), 0) as avg_earnings_per_delivery
       FROM orders o
       WHERE o.driver_id = $1 AND o.status = 'delivered' ${dateFilter}`,
      [req.user.id]
    );

    // Get driver profile for additional stats
    const profileResult = await query(
      'SELECT total_deliveries, earnings_total_cents, rating FROM driver_profiles WHERE user_id = $1',
      [req.user.id]
    );

    const earnings = result.rows[0];
    const profile = profileResult.rows[0] || {};

    res.json({
      period_earnings: {
        deliveries: parseInt(earnings.total_deliveries),
        total_cents: parseInt(earnings.total_earnings_cents),
        average_per_delivery_cents: parseInt(earnings.avg_earnings_per_delivery)
      },
      overall_stats: {
        total_deliveries: profile.total_deliveries || 0,
        total_earnings_cents: profile.earnings_total_cents || 0,
        rating: parseFloat(profile.rating) || 5.0
      }
    });
  } catch (error) {
    logger.error('Earnings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
});

// Complete delivery
router.post('/complete-delivery/:orderId', authenticateToken, requireRole(['driver']), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { notes, photo_url } = req.body;

    // Verify driver is assigned to this order
    const orderResult = await query(
      'SELECT id, status FROM orders WHERE id = $1 AND driver_id = $2',
      [orderId, req.user.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found or unauthorized' });
    }

    if (orderResult.rows[0].status !== 'out_for_delivery') {
      return res.status(400).json({ error: 'Order is not out for delivery' });
    }

    // Mark order as delivered
    await query(
      'UPDATE orders SET status = $1, actual_delivery_time = NOW(), updated_at = NOW() WHERE id = $2',
      ['delivered', orderId]
    );

    // Log status change
    await query(
      'INSERT INTO order_status_history (order_id, status, changed_by, notes) VALUES ($1, $2, $3, $4)',
      [orderId, 'delivered', req.user.id, notes]
    );

    // Update driver stats
    await query(
      `UPDATE driver_profiles 
       SET total_deliveries = total_deliveries + 1,
           earnings_today_cents = earnings_today_cents + 500,
           earnings_total_cents = earnings_total_cents + 500
       WHERE user_id = $1`,
      [req.user.id]
    );

    // Emit delivery completion
    req.app.get('io').to(`order_${orderId}`).emit('order_status_update', {
      orderId,
      status: 'delivered',
      delivered_at: new Date().toISOString(),
      notes
    });

    logger.info(`Driver ${req.user.id} completed delivery for order ${orderId}`);

    res.json({ message: 'Delivery completed successfully' });
  } catch (error) {
    logger.error('Complete delivery error:', error);
    res.status(500).json({ error: 'Failed to complete delivery' });
  }
});

// Update driver online status
router.post('/status', authenticateToken, requireRole(['driver']), async (req, res) => {
  try {
    const { is_online } = req.body;

    await query(
      'UPDATE driver_profiles SET is_online = $1 WHERE user_id = $2',
      [is_online, req.user.id]
    );

    res.json({ 
      message: `Driver status updated to ${is_online ? 'online' : 'offline'}`,
      is_online
    });
  } catch (error) {
    logger.error('Driver status update error:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

module.exports = router;