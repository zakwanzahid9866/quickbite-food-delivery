const express = require('express');
const Joi = require('joi');
const { query } = require('../database/connection');
const { authenticateToken, requireRole } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get customer addresses
router.get('/addresses', authenticateToken, requireRole(['customer']), async (req, res) => {
  try {
    const result = await query(
      `SELECT id, label, address_line_1, address_line_2, city, state, postal_code,
              latitude, longitude, is_default, created_at
       FROM customer_addresses
       WHERE customer_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [req.user.id]
    );

    res.json({ addresses: result.rows });
  } catch (error) {
    logger.error('Addresses fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

// Add new address
router.post('/addresses', authenticateToken, requireRole(['customer']), async (req, res) => {
  try {
    const schema = Joi.object({
      label: Joi.string().max(50).required(),
      address_line_1: Joi.string().max(255).required(),
      address_line_2: Joi.string().max(255).allow(''),
      city: Joi.string().max(100).required(),
      state: Joi.string().max(100).required(),
      postal_code: Joi.string().max(20).required(),
      latitude: Joi.number().min(-90).max(90),
      longitude: Joi.number().min(-180).max(180),
      is_default: Joi.boolean().default(false)
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // If this is default, unset other default addresses
    if (value.is_default) {
      await query(
        'UPDATE customer_addresses SET is_default = false WHERE customer_id = $1',
        [req.user.id]
      );
    }

    const result = await query(
      `INSERT INTO customer_addresses (
        customer_id, label, address_line_1, address_line_2, city, state, 
        postal_code, latitude, longitude, is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        req.user.id, value.label, value.address_line_1, value.address_line_2,
        value.city, value.state, value.postal_code, value.latitude,
        value.longitude, value.is_default
      ]
    );

    res.status(201).json({
      message: 'Address added successfully',
      address: result.rows[0]
    });
  } catch (error) {
    logger.error('Address creation error:', error);
    res.status(500).json({ error: 'Failed to add address' });
  }
});

// Update address
router.put('/addresses/:addressId', authenticateToken, requireRole(['customer']), async (req, res) => {
  try {
    const { addressId } = req.params;
    
    const schema = Joi.object({
      label: Joi.string().max(50),
      address_line_1: Joi.string().max(255),
      address_line_2: Joi.string().max(255).allow(''),
      city: Joi.string().max(100),
      state: Joi.string().max(100),
      postal_code: Joi.string().max(20),
      latitude: Joi.number().min(-90).max(90),
      longitude: Joi.number().min(-180).max(180),
      is_default: Joi.boolean()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Verify address belongs to customer
    const existingResult = await query(
      'SELECT id FROM customer_addresses WHERE id = $1 AND customer_id = $2',
      [addressId, req.user.id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // If setting as default, unset other defaults
    if (value.is_default) {
      await query(
        'UPDATE customer_addresses SET is_default = false WHERE customer_id = $1 AND id != $2',
        [req.user.id, addressId]
      );
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    Object.entries(value).forEach(([key, val]) => {
      if (val !== undefined) {
        updateFields.push(`${key} = $${paramCount}`);
        updateValues.push(val);
        paramCount++;
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(addressId, req.user.id);

    const result = await query(
      `UPDATE customer_addresses SET ${updateFields.join(', ')}
       WHERE id = $${paramCount} AND customer_id = $${paramCount + 1}
       RETURNING *`,
      updateValues
    );

    res.json({
      message: 'Address updated successfully',
      address: result.rows[0]
    });
  } catch (error) {
    logger.error('Address update error:', error);
    res.status(500).json({ error: 'Failed to update address' });
  }
});

// Delete address
router.delete('/addresses/:addressId', authenticateToken, requireRole(['customer']), async (req, res) => {
  try {
    const { addressId } = req.params;

    const result = await query(
      'DELETE FROM customer_addresses WHERE id = $1 AND customer_id = $2 RETURNING id',
      [addressId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    logger.error('Address deletion error:', error);
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

// Save push notification token
router.post('/push-token', authenticateToken, async (req, res) => {
  try {
    const schema = Joi.object({
      device_token: Joi.string().required(),
      platform: Joi.string().valid('ios', 'android').required()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    // Upsert push token
    await query(
      `INSERT INTO push_tokens (user_id, device_token, platform)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, device_token) 
       DO UPDATE SET platform = $3, is_active = true`,
      [req.user.id, value.device_token, value.platform]
    );

    res.json({ message: 'Push token saved successfully' });
  } catch (error) {
    logger.error('Push token save error:', error);
    res.status(500).json({ error: 'Failed to save push token' });
  }
});

module.exports = router;