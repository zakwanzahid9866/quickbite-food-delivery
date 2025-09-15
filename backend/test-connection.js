// Manually set environment variables for testing
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'fastfood_db';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres123';
const { Pool } = require('pg');

console.log('Environment variables:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  // password: String(process.env.DB_PASSWORD), // Commented out for trust auth
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ Connected successfully!');
    const result = await client.query('SELECT version()');
    console.log('Database version:', result.rows[0].version);
    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
  }
}

testConnection();