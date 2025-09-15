const { Pool } = require('pg');

console.log('Creating fastfood_db database...');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'postgres', // Connect to default database first
  user: 'postgres',
  password: 'Zakwan123@@AA',
  ssl: false
});

async function createDatabase() {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to postgres database');
    
    // Create the fastfood_db database
    await client.query('CREATE DATABASE fastfood_db;');
    console.log('✅ fastfood_db database created successfully!');
    
    client.release();
    await pool.end();
  } catch (error) {
    if (error.code === '42P04') {
      console.log('⚠️ Database fastfood_db already exists');
    } else {
      console.error('❌ Failed to create database:', error.message);
      console.error('Error code:', error.code);
    }
  }
}

createDatabase();