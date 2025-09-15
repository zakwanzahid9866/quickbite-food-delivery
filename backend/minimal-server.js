const express = require('express');
const cors = require('cors');

console.log('🚀 Starting minimal QuickBite server for Railway...');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(cors());
app.use(express.json());

// Health check endpoint - FIRST PRIORITY
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    port: PORT,
    message: 'QuickBite minimal server is running'
  });
});

// Basic API routes
app.get('/api/menu', (req, res) => {
  res.json({
    menu: [
      { id: 1, name: 'Classic Burger', price: 12.99, category: 'burgers' },
      { id: 2, name: 'Margherita Pizza', price: 15.99, category: 'pizza' },
      { id: 3, name: 'Chicken Wings', price: 9.99, category: 'appetizers' }
    ]
  });
});

app.post('/api/orders', (req, res) => {
  const order = {
    id: Date.now(),
    ...req.body,
    status: 'placed',
    createdAt: new Date().toISOString()
  };
  res.status(201).json(order);
});

// Catch all other routes
app.get('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    availableRoutes: ['/health', '/api/menu', '/api/orders']
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ QuickBite minimal server running on port ${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 Menu API: http://localhost:${PORT}/api/menu`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;