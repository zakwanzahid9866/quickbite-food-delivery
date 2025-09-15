#!/usr/bin/env node

// Railway Production Startup Script
console.log('🚀 Starting QuickBite Backend for Railway Production...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port:', process.env.PORT || 3000);

// Set default environment variables if not provided
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = process.env.PORT || 3000;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'quickbite-railway-default-secret';

// Handle Railway database environment variables
if (process.env.DATABASE_URL) {
  console.log('✅ Database URL detected from Railway');
} else {
  console.log('⚠️ No DATABASE_URL found, will attempt local connection');
}

if (process.env.REDIS_URL) {
  console.log('✅ Redis URL detected from Railway');
} else {
  console.log('⚠️ No REDIS_URL found, Redis will be optional');
}

// Start the server
try {
  require('./src/server.js');
  console.log('✅ QuickBite server started successfully');
} catch (error) {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
}