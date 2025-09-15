# QuickBite Food Delivery System

A complete, professional food delivery platform with real-time order management.

## 🚀 Features

- **Customer Web App**: Modern, responsive ordering interface
- **Kitchen Display**: Real-time order management system  
- **Admin Dashboard**: Complete business management interface
- **Real-time Updates**: Live order tracking with Socket.IO
- **Mobile Ready**: React Native apps for customers and drivers
- **Professional UI**: Modern design with smooth animations

## 🛠 Tech Stack

- **Backend**: Node.js + Express + Socket.IO
- **Database**: PostgreSQL + Redis
- **Frontend**: React (Kitchen), HTML/CSS/JS (Web apps)
- **Mobile**: React Native
- **Deployment**: Docker, Railway, Netlify

## 📱 Live Demo

- **Customer App**: [Your Netlify URL]
- **Kitchen Dashboard**: [Your Railway URL]
- **Admin Panel**: [Your Vercel URL]

## 🚀 Quick Start

### Development
```bash
# Clone repository
git clone https://github.com/yourusername/quickbite-system
cd quickbite-system

# Start services
docker-compose up -d
cd backend && npm run dev
cd kitchen-display && npm run dev

# Access apps
open quickbite-pro.html
open admin-dashboard.html
```

### Production Deployment

#### Option 1: Railway (Recommended)
1. Push to GitHub
2. Connect to Railway
3. Add PostgreSQL + Redis
4. Deploy automatically

#### Option 2: Manual Setup
```bash
# Environment variables
NODE_ENV=production
DATABASE_URL=your-db-url
REDIS_URL=your-redis-url
```

## 📋 API Documentation

### Authentication
```bash
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password"
}
```

### Orders
```bash
# Create order
POST /api/orders
{
  "customerId": 1,
  "items": [...],
  "totalAmount": 25.99
}

# Update status
PATCH /api/orders/:id/status
{
  "status": "preparing"
}
```

### Real-time Events
```javascript
// New order
socket.on('newOrder', (order) => {
  // Handle new order
});

// Status update
socket.emit('updateOrderStatus', {
  orderId: 123,
  status: 'ready'
});
```

## 🏗 Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Customer App  │    │   Admin Panel   │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          └──────────┬───────────┘
                     │
            ┌─────────▼───────┐
            │   Backend API   │
            │   + Socket.IO   │
            └─────────┬───────┘
                      │
        ┌─────────────▼─────────────┐
        │                          │
   ┌────▼────┐              ┌──────▼──────┐
   │PostgreSQL│              │    Redis    │
   └─────────┘              └─────────────┘
```

## 🔧 Configuration

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:pass@host:port/db
REDIS_URL=redis://host:port

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m

# CORS
CORS_ORIGINS=https://your-domain.com

# Server
PORT=3000
NODE_ENV=production
```

### Docker Compose
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
  
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: fastfood_db
      POSTGRES_PASSWORD: ${DB_PASSWORD}
  
  redis:
    image: redis:7-alpine
```

## 📊 Order State Machine

```
placed → accepted → preparing → ready → out_for_delivery → delivered
   ↓        ↓          ↓         ↓            ↓
cancelled cancelled cancelled cancelled   cancelled
```

## 🧪 Testing

```bash
# Run system tests
node system-test.js

# Health check
curl http://localhost:3000/health

# Load test
npm run test:load
```

## 📱 Mobile Apps

### Customer App
- Order placement and tracking
- Real-time status updates
- Payment integration
- Order history

### Driver App  
- Order assignment
- GPS navigation
- Status updates
- Earnings tracking

## 🔒 Security

- JWT authentication
- CORS protection
- Rate limiting
- Input validation
- SQL injection prevention

## 📈 Monitoring

- Health check endpoints
- Real-time metrics
- Error logging
- Performance monitoring

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- Email: support@quickbite.com
- Documentation: [Your docs URL]
- Issues: GitHub Issues

---

**Made with ❤️ for the food delivery industry**