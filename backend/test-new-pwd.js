const { Pool } = require('pg');

// Test with individual parameters
console.log('Testing with individual parameters...');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'fastfood_db',
  user: 'postgres',
  password: 'Zakwan123@@AA',
  ssl: false
});

async function testIndividual() {
  try {
    const client = await pool.connect();
    console.log('✅ Individual parameters connection successful!');
    const result = await client.query('SELECT version()');
    console.log('Database version:', result.rows[0].version);
    client.release();
    await pool.end();
  } catch (error) {
    console.error('❌ Individual parameters connection failed:', error.message);
    console.error('Error code:', error.code);
  }
}

testIndividual();