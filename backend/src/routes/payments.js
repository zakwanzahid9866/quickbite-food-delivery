const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { query } = require('../database/connection');
const { authenticateToken, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Create payment intent for order
router.post('/create-intent', authenticateToken, requireRole(['customer']), async (req, res) => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Get order details
    const orderResult = await query(
      'SELECT id, total_cents, customer_id, status FROM orders WHERE id = $1',
      [order_id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Verify order belongs to customer
    if (order.customer_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if order is in correct status for payment
    if (order.status !== 'placed') {
      return res.status(400).json({ error: 'Order cannot be paid at this stage' });
    }

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: order.total_cents,
      currency: 'usd',
      metadata: {
        order_id: order.id,
        customer_id: req.user.id
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Update order with payment intent ID
    await query(
      'UPDATE orders SET stripe_payment_intent_id = $1 WHERE id = $2',
      [paymentIntent.id, order.id]
    );

    logger.info(`Payment intent created for order ${order.id}: ${paymentIntent.id}`);

    res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id
    });
  } catch (error) {
    logger.error('Payment intent creation error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook handling error:', error);
    res.status(500).json({ error: 'Webhook handling failed' });
  }
});

async function handlePaymentSucceeded(paymentIntent) {
  try {
    const orderId = paymentIntent.metadata.order_id;
    
    if (!orderId) {
      logger.error('No order_id in payment intent metadata');
      return;
    }

    // Update order payment status
    const result = await query(
      `UPDATE orders 
       SET payment_status = 'paid', status = 'accepted', updated_at = NOW()
       WHERE id = $1 AND stripe_payment_intent_id = $2
       RETURNING *`,
      [orderId, paymentIntent.id]
    );

    if (result.rows.length === 0) {
      logger.error(`Order not found for payment intent: ${paymentIntent.id}`);
      return;
    }

    const order = result.rows[0];

    // Log status change
    await query(
      'INSERT INTO order_status_history (order_id, status, notes) VALUES ($1, $2, $3)',
      [orderId, 'accepted', 'Payment completed']
    );

    // Get order details for notifications
    const orderDetailsResult = await query(
      `SELECT o.*, u.first_name, u.last_name
       FROM orders o
       JOIN users u ON o.customer_id = u.id
       WHERE o.id = $1`,
      [orderId]
    );

    if (orderDetailsResult.rows.length > 0) {
      const orderDetails = orderDetailsResult.rows[0];
      
      // Get order items
      const itemsResult = await query(
        `SELECT oli.quantity, oli.special_instructions, oli.selected_modifiers,
                mi.name as item_name
         FROM order_line_items oli
         JOIN menu_items mi ON oli.menu_item_id = mi.id
         WHERE oli.order_id = $1`,
        [orderId]
      );

      const orderForEmit = {
        ...orderDetails,
        customer_name: `${orderDetails.first_name} ${orderDetails.last_name}`,
        line_items: itemsResult.rows
      };

      // Emit to kitchen and print systems
      const io = require('../server').io;
      if (io) {
        io.to('kitchen').emit('new_order', orderForEmit);
        io.to('printers').emit('new_order', orderForEmit);
      }
    }

    logger.info(`Payment succeeded for order ${orderId}`);
  } catch (error) {
    logger.error('Payment success handling error:', error);
  }
}

async function handlePaymentFailed(paymentIntent) {
  try {
    const orderId = paymentIntent.metadata.order_id;
    
    if (!orderId) {
      logger.error('No order_id in payment intent metadata');
      return;
    }

    // Update order payment status
    await query(
      'UPDATE orders SET payment_status = $1, updated_at = NOW() WHERE id = $2',
      ['failed', orderId]
    );

    // Log the failure
    await query(
      'INSERT INTO order_status_history (order_id, status, notes) VALUES ($1, $2, $3)',
      [orderId, 'placed', 'Payment failed']
    );

    logger.info(`Payment failed for order ${orderId}`);
  } catch (error) {
    logger.error('Payment failure handling error:', error);
  }
}

// Get payment methods for customer
router.get('/methods', authenticateToken, requireRole(['customer']), async (req, res) => {
  try {
    // In a real implementation, you would retrieve saved payment methods from Stripe
    // For now, return empty array as customers will add cards during checkout
    res.json({ payment_methods: [] });
  } catch (error) {
    logger.error('Payment methods fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// Refund payment
router.post('/refund', authenticateToken, requireRole(['admin', 'staff']), async (req, res) => {
  try {
    const { order_id, amount_cents, reason } = req.body;

    // Get order payment details
    const orderResult = await query(
      'SELECT stripe_payment_intent_id, total_cents, payment_status FROM orders WHERE id = $1',
      [order_id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Order payment is not in paid status' });
    }

    const refundAmount = amount_cents || order.total_cents;

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent_id,
      amount: refundAmount,
      reason: 'requested_by_customer',
      metadata: {
        order_id,
        refund_reason: reason || 'Customer request'
      }
    });

    // Update order status
    await query(
      'UPDATE orders SET payment_status = $1, updated_at = NOW() WHERE id = $2',
      ['refunded', order_id]
    );

    // Log the refund
    await query(
      'INSERT INTO order_status_history (order_id, status, changed_by, notes) VALUES ($1, $2, $3, $4)',
      [order_id, 'refunded', req.user.id, `Refund: ${reason || 'Customer request'}`]
    );

    logger.info(`Refund created for order ${order_id}: ${refund.id}`);

    res.json({
      message: 'Refund processed successfully',
      refund_id: refund.id,
      amount_cents: refundAmount
    });
  } catch (error) {
    logger.error('Refund processing error:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

module.exports = router;