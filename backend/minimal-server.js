const express = require('express');
const cors = require('cors');

console.log('🚀 Starting ROBUST QuickBite minimal server for Railway...');

const app = express();
const PORT = process.env.PORT || 3000;

// Basic middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Health check endpoint - FIRST PRIORITY
app.get('/health', (req, res) => {
  console.log('Health check requested at:', new Date().toISOString());
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    port: PORT,
    message: 'QuickBite minimal server is running',
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// Basic API routes
app.get('/api/menu', (req, res) => {
  console.log('Menu API called');
  res.json({
    success: true,
    menu: [
      { id: 1, name: 'Classic Burger', description: 'Juicy beef patty with lettuce and tomato', price: 12.99, category: 'burgers', available: true },
      { id: 2, name: 'Margherita Pizza', description: 'Fresh mozzarella and basil', price: 15.99, category: 'pizza', available: true },
      { id: 3, name: 'Chicken Wings', description: 'Crispy wings with buffalo sauce', price: 9.99, category: 'appetizers', available: true },
      { id: 4, name: 'Caesar Salad', description: 'Fresh romaine with caesar dressing', price: 8.99, category: 'salads', available: true },
      { id: 5, name: 'Chocolate Cake', description: 'Rich chocolate cake with vanilla frosting', price: 6.99, category: 'desserts', available: true },
      { id: 6, name: 'Cola', description: 'Refreshing cola drink', price: 2.99, category: 'drinks', available: true }
    ],
    timestamp: new Date().toISOString()
  });
});

app.post('/api/orders', (req, res) => {
  console.log('Order API called with:', req.body);
  const order = {
    id: Date.now(),
    customerId: req.body.customerId || 1,
    customerName: req.body.customerName || 'Demo Customer',
    items: req.body.items || [],
    totalAmount: req.body.totalAmount || 0,
    status: 'placed',
    createdAt: new Date().toISOString(),
    deliveryAddress: req.body.deliveryAddress || 'Demo Address'
  };
  res.status(201).json({
    success: true,
    message: 'Order placed successfully (Demo mode)',
    order: order
  });
});

app.get('/api/orders', (req, res) => {
  console.log('Get orders API called');
  res.json({
    success: true,
    orders: [
      {
        id: 1001,
        status: 'delivered',
        totalAmount: 25.98,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        items: ['Classic Burger', 'Cola']
      },
      {
        id: 1002,
        status: 'preparing',
        totalAmount: 15.99,
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        items: ['Margherita Pizza']
      }
    ],
    timestamp: new Date().toISOString()
  });
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  console.log('Login API called');
  res.json({
    success: true,
    message: 'Login successful (Demo mode)',
    user: {
      id: 1,
      name: req.body.email?.split('@')[0] || 'Demo User',
      email: req.body.email || 'demo@quickbite.com',
      role: 'customer'
    },
    token: 'demo-jwt-token-' + Date.now()
  });
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