const { Pool } = require('pg');

console.log('Testing connection to default postgres database...');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'postgres', // Default database
  user: 'postgres',
  password: 'Zakwan123@@AA',
  ssl: false
});

async function testDefault() {
  try {
    const client = await pool.connect();
    console.log('✅ Connected to default postgres database!');
    
    // Try to list databases
    const result = await client.query('SELECT datname FROM pg_database;');
    console.log('Available databases:');
    result.rows.forEach(row => console.log('  -', row.datname));
    
    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
  }
}

testDefault();