const express = require('express');

console.log('🚀 ULTRA MINIMAL SERVER FOR RAILWAY HEALTH CHECKS');
console.log('='.repeat(50));
console.log('Timestamp:', new Date().toISOString());
console.log('Node Version:', process.version);
console.log('Platform:', process.platform);
console.log('Memory:', Math.floor(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('Target Port:', PORT);

// Absolute minimal middleware
app.use(express.json({ limit: '1mb' }));

// RAILWAY HEALTH CHECK - HIGHEST PRIORITY
app.get('/health', (req, res) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ✅ HEALTH CHECK from ${req.ip || 'unknown'}`);
  
  // Respond immediately with minimal payload
  res.status(200).json({
    status: 'healthy',
    timestamp: now,
    port: PORT
  });
});

// Basic endpoints for testing
app.get('/', (req, res) => {
  console.log('Root endpoint accessed');
  res.json({ 
    message: 'QuickBite Ultra Minimal Server', 
    timestamp: new Date().toISOString(),
    endpoints: ['/health', '/api/status']
  });
});

app.get('/api/status', (req, res) => {
  console.log('Status endpoint accessed');
  res.json({
    server: 'ultra-minimal',
    status: 'operational',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Catch all
app.get('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server with explicit binding
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log(`✅ ULTRA MINIMAL SERVER STARTED`);
  console.log(`🌐 Listening on: 0.0.0.0:${PORT}`);
  console.log(`🏥 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log('='.repeat(50));
});

// Handle errors
server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

// Graceful shutdown
const shutdown = () => {
  console.log('🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = app;