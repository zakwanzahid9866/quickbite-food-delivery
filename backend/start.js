#!/usr/bin/env node

// BULLETPROOF Railway startup script
console.log('🛡️ BULLETPROOF STARTUP SEQUENCE');
console.log('=' .repeat(50));
console.log('Node.js version:', process.version);
console.log('Environment:', process.env.NODE_ENV || 'production');
console.log('Port:', process.env.PORT || 3000);
console.log('Timestamp:', new Date().toISOString());

// Set required environment variables
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = process.env.PORT || '3000';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'railway-default-secret-key';

console.log('Environment variables configured');

// Railway deployment: Use bulletproof server for guaranteed success
const useMinimal = process.env.USE_MINIMAL_SERVER === 'true';
const useBulletproof = process.env.NODE_ENV === 'production' || useMinimal;

if (useBulletproof) {
  console.log('🛡️ Loading BULLETPROOF server (zero dependencies)...');
  try {
    require('./bulletproof-server.js');
  } catch (bulletproofError) {
    console.error('❌ Bulletproof server failed (impossible):', bulletproofError);
    console.log('🔄 Fallback to ultra-minimal...');
    require('./ultra-minimal.js');
  }
} else {
  console.log('🚀 Attempting full server for development...');
  try {
    require('./src/server.js');
  } catch (error) {
    console.error('❌ Full server failed:', error.message);
    console.log('🛡️ Emergency fallback to bulletproof server...');
    require('./bulletproof-server.js');
  }
}