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

// For Railway health checks, prioritize ultra-minimal server
const useMinimal = process.env.USE_MINIMAL_SERVER === 'true';

try {
  if (useMinimal) {
    console.log('🏥 Loading ULTRA MINIMAL server for Railway health checks...');
    require('./ultra-minimal.js');
  } else {
    console.log('Loading full server module...');
    require('./src/server.js');
  }
} catch (error) {
  console.error('❌ Failed to start server:', error);
  console.error('Stack trace:', error.stack);
  
  // Fallback chain: ultra-minimal -> minimal -> exit
  console.log('🔄 Attempting fallback to ultra minimal server...');
  try {
    require('./ultra-minimal.js');
  } catch (ultraError) {
    console.log('🔄 Ultra minimal failed, trying regular minimal...');
    try {
      require('./minimal-server.js');
    } catch (fallbackError) {
      console.error('❌ All fallbacks failed:', fallbackError);
      process.exit(1);
    }
  }
}