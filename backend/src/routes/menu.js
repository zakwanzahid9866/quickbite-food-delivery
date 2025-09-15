const express = require('express');
const Joi = require('joi');
const { query } = require('../database/connection');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Get all menu categories
router.get('/categories', optionalAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, description, image_url, sort_order 
       FROM menu_categories 
       WHERE is_active = true 
       ORDER BY sort_order, name`
    );

    res.json({ categories: result.rows });
  } catch (error) {
    logger.error('Categories fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get menu items by category
router.get('/categories/:categoryId/items', optionalAuth, async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    const result = await query(
      `SELECT mi.id, mi.name, mi.description, mi.price_cents, mi.prep_time_minutes,
              mi.calories, mi.is_vegetarian, mi.is_vegan, mi.is_gluten_free, 
              mi.is_spicy, mi.is_featured, mi.image_url, mi.ingredients, 
              mi.nutritional_info, mi.sort_order
       FROM menu_items mi
       WHERE mi.category_id = $1 AND mi.is_active = true
       ORDER BY mi.sort_order, mi.name`,
      [categoryId]
    );

    res.json({ items: result.rows });
  } catch (error) {
    logger.error('Category items fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// Get all menu items with categories
router.get('/items', optionalAuth, async (req, res) => {
  try {
    const { featured, search, category } = req.query;
    
    let queryStr = `
      SELECT mi.id, mi.name, mi.description, mi.price_cents, mi.prep_time_minutes,
             mi.calories, mi.is_vegetarian, mi.is_vegan, mi.is_gluten_free, 
             mi.is_spicy, mi.is_featured, mi.image_url, mi.ingredients, 
             mi.nutritional_info, mi.sort_order,
             mc.name as category_name
      FROM menu_items mi
      LEFT JOIN menu_categories mc ON mi.category_id = mc.id
      WHERE mi.is_active = true
    `;
    
    const queryParams = [];
    let paramCount = 1;

    if (featured === 'true') {
      queryStr += ` AND mi.is_featured = true`;
    }

    if (search) {
      queryStr += ` AND (mi.name ILIKE $${paramCount} OR mi.description ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
      paramCount++;
    }

    if (category) {
      queryStr += ` AND mi.category_id = $${paramCount}`;
      queryParams.push(category);
      paramCount++;
    }

    queryStr += ` ORDER BY mi.sort_order, mi.name`;

    const result = await query(queryStr, queryParams);

    res.json({ items: result.rows });
  } catch (error) {
    logger.error('Menu items fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// Get single menu item with modifiers
router.get('/items/:itemId', optionalAuth, async (req, res) => {
  try {
    const { itemId } = req.params;

    // Get item details
    const itemResult = await query(
      `SELECT mi.id, mi.name, mi.description, mi.price_cents, mi.prep_time_minutes,
              mi.calories, mi.is_vegetarian, mi.is_vegan, mi.is_gluten_free, 
              mi.is_spicy, mi.is_featured, mi.image_url, mi.ingredients, 
              mi.nutritional_info, mi.sort_order,
              mc.name as category_name
       FROM menu_items mi
       LEFT JOIN menu_categories mc ON mi.category_id = mc.id
       WHERE mi.id = $1 AND mi.is_active = true`,
      [itemId]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    // Get modifiers
    const modifiersResult = await query(
      `SELECT id, name, price_cents, is_required, max_selections
       FROM menu_item_modifiers
       WHERE menu_item_id = $1
       ORDER BY is_required DESC, name`,
      [itemId]
    );

    const item = itemResult.rows[0];
    item.modifiers = modifiersResult.rows;

    res.json({ item });
  } catch (error) {
    logger.error('Menu item fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch menu item' });
  }
});

// Search menu items
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const result = await query(
      `SELECT mi.id, mi.name, mi.description, mi.price_cents, mi.image_url,
              mc.name as category_name
       FROM menu_items mi
       LEFT JOIN menu_categories mc ON mi.category_id = mc.id
       WHERE mi.is_active = true 
       AND (mi.name ILIKE $1 OR mi.description ILIKE $1 OR mc.name ILIKE $1)
       ORDER BY 
         CASE 
           WHEN mi.name ILIKE $2 THEN 1
           WHEN mi.name ILIKE $1 THEN 2
           WHEN mi.description ILIKE $1 THEN 3
           ELSE 4
         END,
         mi.name
       LIMIT $3`,
      [`%${q}%`, `${q}%`, parseInt(limit)]
    );

    res.json({ results: result.rows });
  } catch (error) {
    logger.error('Menu search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Admin: Create menu category
router.post('/categories', authenticateToken, requireRole(['admin', 'staff']), async (req, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().max(100).required(),
      description: Joi.string().allow(''),
      image_url: Joi.string().uri().allow(''),
      sort_order: Joi.number().integer().default(0)
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const result = await query(
      `INSERT INTO menu_categories (name, description, image_url, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, description, image_url, sort_order, is_active, created_at`,
      [value.name, value.description, value.image_url, value.sort_order]
    );

    res.status(201).json({
      message: 'Category created successfully',
      category: result.rows[0]
    });
  } catch (error) {
    logger.error('Category creation error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Admin: Create menu item
router.post('/items', authenticateToken, requireRole(['admin', 'staff']), async (req, res) => {
  try {
    const schema = Joi.object({
      category_id: Joi.string().uuid().required(),
      name: Joi.string().max(200).required(),
      description: Joi.string().allow(''),
      price_cents: Joi.number().integer().min(0).required(),
      prep_time_minutes: Joi.number().integer().min(1).default(15),
      calories: Joi.number().integer().min(0),
      is_vegetarian: Joi.boolean().default(false),
      is_vegan: Joi.boolean().default(false),
      is_gluten_free: Joi.boolean().default(false),
      is_spicy: Joi.boolean().default(false),
      is_featured: Joi.boolean().default(false),
      image_url: Joi.string().uri().allow(''),
      ingredients: Joi.array().items(Joi.string()),
      nutritional_info: Joi.object(),
      sort_order: Joi.number().integer().default(0)
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const result = await query(
      `INSERT INTO menu_items (
        category_id, name, description, price_cents, prep_time_minutes,
        calories, is_vegetarian, is_vegan, is_gluten_free, is_spicy,
        is_featured, image_url, ingredients, nutritional_info, sort_order
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        value.category_id, value.name, value.description, value.price_cents,
        value.prep_time_minutes, value.calories, value.is_vegetarian,
        value.is_vegan, value.is_gluten_free, value.is_spicy, value.is_featured,
        value.image_url, JSON.stringify(value.ingredients), 
        JSON.stringify(value.nutritional_info), value.sort_order
      ]
    );

    res.status(201).json({
      message: 'Menu item created successfully',
      item: result.rows[0]
    });
  } catch (error) {
    logger.error('Menu item creation error:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

module.exports = router;