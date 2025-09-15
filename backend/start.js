#!/usr/bin/env node

// Simplified Railway startup script
console.log('🚀 Starting QuickBite Backend...');
console.log('Node.js version:', process.version);
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port:', process.env.PORT || 3000);

// Set required environment variables with defaults
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = process.env.PORT || '3000';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'railway-default-secret-key';

console.log('Environment variables set');

// Start with minimal server first (for debugging)
const useMinimal = process.env.USE_MINIMAL_SERVER === 'true';

try {
  if (useMinimal) {
    console.log('Loading minimal server for debugging...');
    require('./minimal-server.js');
  } else {
    console.log('Loading full server module...');
    require('./src/server.js');
  }
} catch (error) {
  console.error('❌ Failed to start server:', error);
  console.error('Stack trace:', error.stack);
  
  // Fallback to minimal server
  console.log('🔄 Attempting fallback to minimal server...');
  try {
    require('./minimal-server.js');
  } catch (fallbackError) {
    console.error('❌ Fallback also failed:', fallbackError);
    process.exit(1);
  }
}