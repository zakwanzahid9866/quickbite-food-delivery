const { Pool } = require('pg');

console.log('Testing direct connection...');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'fastfood_db',
  user: 'postgres',
  password: 'Zakwan123@@AA',
  ssl: false
});

async function testDirect() {
  try {
    const client = await pool.connect();
    console.log('✅ Direct connection successful!');
    const result = await client.query('SELECT version()');
    console.log('Database version:', result.rows[0].version);
    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Direct connection failed:', error.message);
    console.error('Error code:', error.code);
  }
}

testDirect();