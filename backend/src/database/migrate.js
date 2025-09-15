const fs = require('fs');
const path = require('path');
const { query } = require('./connection');
const logger = require('../utils/logger');

async function runMigrations() {
  try {
    logger.info('🔄 Running database migrations...');
    
    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = schema.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      await query(statement);
    }
    
    logger.info('✅ Database migrations completed successfully');
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migrations if called directly
if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
  const { connectDB } = require('./connection');
  
  connectDB()
    .then(() => runMigrations())
    .then(() => {
      logger.info('✅ All migrations completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Migration error:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations };