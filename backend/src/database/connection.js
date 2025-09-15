const { Pool } = require('pg');
const logger = require('../utils/logger');

let pool;

const connectDB = async () => {
  try {
    // Railway provides DATABASE_URL, use it if available
    const connectionConfig = process.env.DATABASE_URL
      ? {
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        }
      : {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT) || 5432,
          database: process.env.DB_NAME || 'fastfood_db',
          user: process.env.DB_USER || 'postgres',
          password: String(process.env.DB_PASSWORD || 'Zakwan123@@AA'),
          ssl: false,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
        };

    pool = new Pool(connectionConfig);

    // Test connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    logger.info('✅ PostgreSQL connected successfully');
    client.release();
    
    // Initialize tables for Railway
    await initializeTables();
    
    return pool;
  } catch (error) {
    logger.error('❌ PostgreSQL connection failed:', error);
    // In production, don't crash the app if DB is unavailable
    if (process.env.NODE_ENV === 'production') {
      logger.warn('⚠️ Running without database in production mode');
      return null;
    }
    throw error;
  }
};

const initializeTables = async () => {
  if (!pool) return;
  
  try {
    const client = await pool.connect();
    
    // Create tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'customer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS menu_items (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        category VARCHAR(100),
        available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER,
        customer_name VARCHAR(255),
        total_amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'placed',
        delivery_address TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Insert sample menu items
    await client.query(`
      INSERT INTO menu_items (name, description, price, category) VALUES
      ('Classic Burger', 'Juicy beef patty with lettuce and tomato', 12.99, 'burgers'),
      ('Margherita Pizza', 'Fresh mozzarella and basil', 15.99, 'pizza'),
      ('Chicken Wings', 'Crispy wings with buffalo sauce', 9.99, 'appetizers'),
      ('Caesar Salad', 'Fresh romaine with caesar dressing', 8.99, 'salads')
      ON CONFLICT DO NOTHING;
    `);
    
    logger.info('✅ Database tables initialized');
    client.release();
  } catch (error) {
    logger.warn('⚠️ Failed to initialize tables:', error.message);
  }
};

const getDB = () => {
  if (!pool) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return pool;
};

const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

module.exports = {
  connectDB,
  getDB,
  query
};