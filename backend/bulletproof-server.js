// BULLETPROOF SERVER FOR RAILWAY - CANNOT FAIL
const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3000;

console.log('🛡️ BULLETPROOF SERVER STARTING');
console.log('Time:', new Date().toISOString());
console.log('Port:', PORT);
console.log('Node:', process.version);

// Create HTTP server without Express (zero dependencies)
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');
  
  console.log(`[${new Date().toISOString()}] ${req.method} ${path}`);
  
  // Handle OPTIONS for CORS
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Railway health check endpoint
  if (path === '/health') {
    const healthData = JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      port: PORT,
      server: 'bulletproof',
      uptime: Math.floor(process.uptime())
    });
    
    res.writeHead(200);
    res.end(healthData);
    return;
  }
  
  // Root endpoint
  if (path === '/') {
    const rootData = JSON.stringify({
      message: 'QuickBite Bulletproof Server',
      status: 'online',
      timestamp: new Date().toISOString(),
      endpoints: ['/health', '/api/status', '/api/menu']
    });
    
    res.writeHead(200);
    res.end(rootData);
    return;
  }
  
  // Basic API endpoints
  if (path === '/api/status') {
    const statusData = JSON.stringify({
      server: 'bulletproof',
      status: 'operational',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
    
    res.writeHead(200);
    res.end(statusData);
    return;
  }
  
  if (path === '/api/menu') {
    const menuData = JSON.stringify({
      success: true,
      menu: [
        { id: 1, name: 'Classic Burger', price: 12.99, available: true },
        { id: 2, name: 'Pizza Margherita', price: 15.99, available: true },
        { id: 3, name: 'Chicken Wings', price: 9.99, available: true }
      ],
      timestamp: new Date().toISOString()
    });
    
    res.writeHead(200);
    res.end(menuData);
    return;
  }
  
  // 404 for other routes
  const errorData = JSON.stringify({
    error: 'Not found',
    path: path,
    timestamp: new Date().toISOString()
  });
  
  res.writeHead(404);
  res.end(errorData);
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log('🛡️ BULLETPROOF SERVER ONLINE');
  console.log(`🌐 Listening: 0.0.0.0:${PORT}`);
  console.log(`🏥 Health: http://0.0.0.0:${PORT}/health`);
  console.log('⚡ Zero dependencies - Cannot fail!');
});

// Error handling
server.on('error', (err) => {
  console.error('❌ Server error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

console.log('🛡️ Bulletproof server setup complete');