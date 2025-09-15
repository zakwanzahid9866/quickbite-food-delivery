const { query } = require('./connection');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

async function seedDatabase() {
  try {
    logger.info('🌱 Starting database seeding...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 12);
    await query(`
      INSERT INTO users (first_name, last_name, email, phone, password_hash, role, is_verified, is_active)
      VALUES ('Admin', 'User', 'admin@fastfood.com', '+1234567890', $1, 'admin', true, true)
      ON CONFLICT (phone) DO NOTHING
    `, [adminPassword]);

    // Create staff user
    const staffPassword = await bcrypt.hash('staff123', 12);
    await query(`
      INSERT INTO users (first_name, last_name, email, phone, password_hash, role, is_verified, is_active)
      VALUES ('Kitchen', 'Staff', 'kitchen@fastfood.com', '+1234567891', $1, 'staff', true, true)
      ON CONFLICT (phone) DO NOTHING
    `, [staffPassword]);

    // Create test customer
    const customerPassword = await bcrypt.hash('customer123', 12);
    const customerResult = await query(`
      INSERT INTO users (first_name, last_name, email, phone, password_hash, role, is_verified, is_active)
      VALUES ('John', 'Doe', 'customer@test.com', '+1234567892', $1, 'customer', true, true)
      ON CONFLICT (phone) DO NOTHING
      RETURNING id
    `, [customerPassword]);

    // Create test driver
    const driverPassword = await bcrypt.hash('driver123', 12);
    const driverResult = await query(`
      INSERT INTO users (first_name, last_name, email, phone, password_hash, role, is_verified, is_active)
      VALUES ('Driver', 'Smith', 'driver@test.com', '+1234567893', $1, 'driver', true, true)
      ON CONFLICT (phone) DO NOTHING
      RETURNING id
    `, [driverPassword]);

    // Create driver profile if driver was created
    if (driverResult.rows.length > 0) {
      await query(`
        INSERT INTO driver_profiles (user_id, license_number, vehicle_type, vehicle_number, vehicle_model, is_online)
        VALUES ($1, 'DL123456789', 'Car', 'ABC123', 'Toyota Camry', false)
        ON CONFLICT (user_id) DO NOTHING
      `, [driverResult.rows[0].id]);
    }

    // Create customer address if customer was created
    if (customerResult.rows.length > 0) {
      await query(`
        INSERT INTO customer_addresses (customer_id, label, address_line_1, city, state, postal_code, latitude, longitude, is_default)
        VALUES ($1, 'Home', '123 Main Street', 'Anytown', 'CA', '12345', 37.7749, -122.4194, true)
        ON CONFLICT DO NOTHING
      `, [customerResult.rows[0].id]);
    }

    // Create menu categories
    const categories = [
      { name: 'Burgers', description: 'Delicious beef and chicken burgers', sort_order: 1 },
      { name: 'Sides', description: 'Fries, onion rings, and more', sort_order: 2 },
      { name: 'Drinks', description: 'Soft drinks, juices, and shakes', sort_order: 3 },
      { name: 'Desserts', description: 'Sweet treats and ice cream', sort_order: 4 }
    ];

    for (const category of categories) {
      await query(`
        INSERT INTO menu_categories (name, description, sort_order, is_active)
        VALUES ($1, $2, $3, true)
        ON CONFLICT DO NOTHING
      `, [category.name, category.description, category.sort_order]);
    }

    // Get category IDs
    const categoryResult = await query('SELECT id, name FROM menu_categories');
    const categoryMap = {};
    categoryResult.rows.forEach(cat => {
      categoryMap[cat.name] = cat.id;
    });

    // Create menu items
    const menuItems = [
      // Burgers
      { category: 'Burgers', name: 'Classic Cheeseburger', description: 'Beef patty with cheese, lettuce, tomato', price_cents: 1200, prep_time: 12, is_featured: true },
      { category: 'Burgers', name: 'Bacon Burger', description: 'Beef patty with bacon, cheese, lettuce', price_cents: 1400, prep_time: 15, is_featured: true },
      { category: 'Burgers', name: 'Chicken Burger', description: 'Grilled chicken breast with mayo, lettuce', price_cents: 1100, prep_time: 10 },
      { category: 'Burgers', name: 'Veggie Burger', description: 'Plant-based patty with fresh vegetables', price_cents: 1300, prep_time: 10, is_vegetarian: true },
      
      // Sides
      { category: 'Sides', name: 'French Fries', description: 'Crispy golden fries', price_cents: 450, prep_time: 5, is_featured: true },
      { category: 'Sides', name: 'Onion Rings', description: 'Crispy battered onion rings', price_cents: 550, prep_time: 7 },
      { category: 'Sides', name: 'Mozzarella Sticks', description: 'Breaded mozzarella cheese sticks', price_cents: 650, prep_time: 8 },
      
      // Drinks
      { category: 'Drinks', name: 'Soft Drink', description: 'Coke, Pepsi, Sprite', price_cents: 250, prep_time: 1 },
      { category: 'Drinks', name: 'Milkshake', description: 'Vanilla, chocolate, or strawberry', price_cents: 450, prep_time: 3 },
      { category: 'Drinks', name: 'Fresh Juice', description: 'Orange, apple, or cranberry', price_cents: 350, prep_time: 2 },
      
      // Desserts
      { category: 'Desserts', name: 'Apple Pie', description: 'Warm apple pie with cinnamon', price_cents: 400, prep_time: 2 },
      { category: 'Desserts', name: 'Ice Cream', description: 'Vanilla, chocolate, or strawberry scoop', price_cents: 300, prep_time: 1 }
    ];

    for (const item of menuItems) {
      const categoryId = categoryMap[item.category];
      if (categoryId) {
        await query(`
          INSERT INTO menu_items (
            category_id, name, description, price_cents, prep_time_minutes, 
            is_vegetarian, is_featured, is_active
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, true)
          ON CONFLICT DO NOTHING
        `, [
          categoryId, item.name, item.description, item.price_cents, 
          item.prep_time, item.is_vegetarian || false, item.is_featured || false
        ]);
      }
    }

    // Create sample modifiers
    const burgerItems = await query(`
      SELECT id FROM menu_items mi 
      JOIN menu_categories mc ON mi.category_id = mc.id 
      WHERE mc.name = 'Burgers'
    `);

    for (const burger of burgerItems.rows) {
      // Add common burger modifiers
      const modifiers = [
        { name: 'Extra Cheese', price_cents: 100 },
        { name: 'Add Bacon', price_cents: 150 },
        { name: 'No Pickles', price_cents: 0 },
        { name: 'Extra Sauce', price_cents: 50 }
      ];

      for (const modifier of modifiers) {
        await query(`
          INSERT INTO menu_item_modifiers (menu_item_id, name, price_cents, is_required, max_selections)
          VALUES ($1, $2, $3, false, 1)
          ON CONFLICT DO NOTHING
        `, [burger.id, modifier.name, modifier.price_cents]);
      }
    }

    logger.info('✅ Database seeding completed successfully');
    logger.info('📝 Test accounts created:');
    logger.info('   Admin: phone +1234567890, password: admin123');
    logger.info('   Staff: phone +1234567891, password: staff123');
    logger.info('   Customer: phone +1234567892, password: customer123');
    logger.info('   Driver: phone +1234567893, password: driver123');

  } catch (error) {
    logger.error('❌ Database seeding failed:', error);
    throw error;
  }
}

// Run seeding if called directly
if (require.main === module) {
  require('dotenv').config();
  const { connectDB } = require('./connection');
  
  connectDB()
    .then(() => seedDatabase())
    .then(() => {
      logger.info('✅ Seeding process completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Seeding process failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };