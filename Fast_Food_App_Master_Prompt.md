# 🍔 Complete Fast Food Ordering & Delivery App - Master Development Prompt

## 🎯 Project Goal
Create a comprehensive fast-food restaurant ecosystem with customer mobile app, driver app, backend system, kitchen display, and automatic printing system. The system should handle real-time order tracking, live driver location updates, and seamless restaurant operations.

## 🏗️ System Architecture

### 1. Customer Mobile App (React Native)
**Core Features:**
- User registration/login (JWT + biometric)
- Menu browsing with categories, search, filters
- Shopping cart with modifiers and special instructions
- Multiple payment methods (Stripe integration)
- Real-time order tracking with status updates
- Live driver tracking on map (Google Maps)
- Push notifications for order updates
- Order history and reorder functionality
- Address management and delivery preferences

**Technical Stack:**
- React Native with Expo
- Redux Toolkit for state management
- React Navigation v6
- Socket.IO client for real-time updates
- react-native-maps for driver tracking
- Firebase Cloud Messaging for notifications

### 2. Driver Mobile App (React Native)
**Core Features:**
- Driver authentication with role verification
- Available order queue with distance/earnings
- Order acceptance/rejection system
- Turn-by-turn navigation integration
- Background GPS location sharing (every 5-10 seconds)
- Order status updates (picked up, en route, delivered)
- Earnings tracking and payment history
- Driver profile management

**Technical Implementation:**
- Background location tracking
- Real-time Socket.IO communication
- Optimized route calculation
- Offline capability with data sync

### 3. Backend System (Node.js + Express + Socket.IO)
**Architecture:**
- RESTful APIs for CRUD operations
- Real-time WebSocket events for live updates
- JWT authentication with refresh tokens
- Role-based access control
- PostgreSQL for persistent data
- Redis for caching and session management
- Stripe webhook integration for payments

**Database Schema (PostgreSQL):**
```sql
-- Core tables
users (id, role, name, phone, email, password_hash, created_at)
menu_categories (id, name, description, image_url, sort_order, is_active)
menu_items (id, category_id, name, price_cents, prep_time, is_active)
orders (id, customer_id, driver_id, status, total_cents, created_at)
order_line_items (id, order_id, menu_item_id, quantity, modifiers)
driver_locations (driver_id, latitude, longitude, updated_at)
customer_addresses (id, customer_id, address, latitude, longitude)
```

**Key API Endpoints:**
```
POST /api/auth/login
GET /api/menu/items
POST /api/orders
GET /api/orders/:id/tracking
PUT /api/orders/:id/status
POST /api/payments/create-intent
POST /api/driver/location
```

**Socket.IO Events:**
```javascript
// New order to kitchen and printers
io.to('kitchen').emit('new_order', order);
io.to('printers').emit('new_order', order);

// Driver location updates to customer
io.to(`order_${orderId}`).emit('driver_location_update', locationData);

// Order status updates to customer
io.to(`order_${orderId}`).emit('order_status_update', statusData);
```

### 4. Kitchen Display System (React Web App)
**Features:**
- Real-time incoming orders via Socket.IO
- Order status management (new → preparing → ready)
- Color-coded timers showing preparation time
- Order filtering by status
- Audio alerts for new orders
- Full-screen kiosk mode for kitchen screens
- Special instructions and modifier display

**Technical Implementation:**
```javascript
// Real-time order management
const socket = io(backendUrl, { auth: { token: kitchenToken }});

socket.on('new_order', (order) => {
  setOrders(prev => [order, ...prev]);
  playNewOrderSound();
});

socket.on('order_update', (updatedOrder) => {
  setOrders(prev => prev.map(o => 
    o.id === updatedOrder.id ? updatedOrder : o
  ));
});

// Update order status
const updateStatus = async (orderId, status) => {
  await fetch(`/api/orders/${orderId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  });
  socket.emit('order_status_update', { orderId, status });
};
```

### 5. Auto-Print System (Node.js Agent)
**Features:**
- Runs on restaurant PC connected to POS printers
- Automatically prints kitchen and customer receipts
- Supports ESC/POS thermal printers (USB/Network)
- Duplicate prevention and error handling
- Multiple printer support (kitchen, cashier)
- Retry mechanism for failed prints

**Implementation:**
```javascript
// Print agent listening for orders
const socket = io(backendUrl, { auth: { token: printToken }});

socket.on('new_order', async (order) => {
  try {
    await printKitchenCopy(order);
    await printCustomerReceipt(order);
    socket.emit('print_confirmation', { orderId: order.id });
  } catch (error) {
    console.error('Print failed:', error);
    queueForRetry(order);
  }
});

// ESC/POS printing via network
const printToNetwork = (content, printerIP) => {
  const client = new net.Socket();
  client.connect(9100, printerIP, () => {
    client.write(content);
    client.end();
  });
};
```

## 📱 Mobile App Screens & Features

### Customer App Screens:
1. **Authentication** - Login/Register with phone verification
2. **Home** - Featured items, categories, search bar
3. **Menu** - Category-wise items with filters
4. **Item Detail** - Photos, description, modifiers, add to cart
5. **Cart** - Items list, quantity controls, checkout button
6. **Checkout** - Address selection, payment method, place order
7. **Order Tracking** - Real-time status with driver location map
8. **Order History** - Past orders with reorder option
9. **Profile** - User details, addresses, payment methods

### Driver App Screens:
1. **Driver Login** - Authentication with driver credentials
2. **Dashboard** - Available orders, earnings, online status
3. **Order Details** - Pickup/delivery info, items, navigation
4. **Navigation** - Map with route, turn-by-turn directions
5. **Order Completion** - Delivery confirmation, photos

## 🔄 Real-Time Flow

### Order Placement Flow:
1. Customer places order → Backend saves to database
2. Backend emits `new_order` to kitchen displays
3. Backend emits `new_order` to print agents
4. Kitchen receives order, prints automatically
5. Staff updates status → All connected clients notified

### Delivery Tracking Flow:
1. Driver accepts order → Status updated to 'out_for_delivery'
2. Driver app sends location every 5-10 seconds
3. Backend broadcasts location to customer's order room
4. Customer sees live driver position on map
5. ETA calculated and updated in real-time

## 🔧 Technical Requirements

### Security:
- HTTPS everywhere with SSL certificates
- JWT tokens with short expiry + refresh tokens
- Role-based API access control
- Input validation and sanitization
- Payment data handled only by gateway (PCI compliance)
- Socket.IO authentication and room isolation

### Performance:
- API response times < 200ms
- Real-time events delivered < 100ms
- Mobile app cold start < 3 seconds
- Support 100+ concurrent users
- Database connection pooling
- Redis caching for frequently accessed data

### Scalability:
- Horizontal scaling with load balancers
- Socket.IO Redis adapter for multi-instance
- Database read replicas
- CDN for static assets
- Microservices architecture ready

## 🚀 Deployment & Infrastructure

### Recommended Hosting:
- **Backend**: AWS ECS, Google Cloud Run, Railway, Render
- **Database**: AWS RDS PostgreSQL, Google Cloud SQL
- **Redis**: AWS ElastiCache, Google MemoryStore
- **Frontend**: Vercel, Netlify, Cloudflare Pages
- **Mobile**: Expo EAS Build → App Store/Play Store
- **Monitoring**: Sentry, DataDog, New Relic

### Environment Variables:
```bash
# Backend
NODE_ENV=production
JWT_SECRET=secure-secret-here
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379
STRIPE_SECRET_KEY=sk_live_...
GOOGLE_MAPS_API_KEY=your-key
FIREBASE_SERVER_KEY=your-key

# Print Agent
BACKEND_URL=https://your-api.com
PRINT_TOKEN=secure-token
KITCHEN_PRINTER_IP=192.168.1.100
RECEIPT_PRINTER_IP=192.168.1.101
```

## 📋 Implementation Checklist

### Phase 1: Core Backend (Week 1)
- [ ] Database schema and migrations
- [ ] User authentication (JWT)
- [ ] Menu CRUD APIs
- [ ] Order placement API
- [ ] Basic Socket.IO setup

### Phase 2: Customer App (Week 2)
- [ ] React Native project setup
- [ ] Authentication screens
- [ ] Menu browsing and cart
- [ ] Order placement with Stripe
- [ ] Basic order tracking

### Phase 3: Real-time Features (Week 3)
- [ ] Socket.IO real-time events
- [ ] Kitchen Display System
- [ ] Order status management
- [ ] Push notifications

### Phase 4: Driver App & Tracking (Week 4)
- [ ] Driver mobile app
- [ ] Background location tracking
- [ ] Live driver tracking for customers
- [ ] Google Maps integration
- [ ] Route optimization

### Phase 5: Printing & Polish (Week 5)
- [ ] Print agent development
- [ ] ESC/POS printer integration
- [ ] Receipt templates
- [ ] Error handling and retry logic
- [ ] Final testing and deployment

## 💡 Expected Deliverables

When implementing this prompt, provide:

1. **Complete source code** for all components
2. **Database schema** with sample data
3. **API documentation** with endpoints
4. **Setup instructions** for local development
5. **Deployment guides** for production
6. **Mobile app builds** ready for app stores
7. **Print agent installer** for restaurant PCs

## 🎯 Success Criteria

The final system should achieve:
- ✅ Real-time order processing (< 100ms latency)
- ✅ Automatic receipt printing on order placement
- ✅ Live driver tracking with accurate ETA
- ✅ Scalable to handle 1000+ orders/day
- ✅ 99.9% uptime with proper error handling
- ✅ Mobile apps pass App Store review guidelines
- ✅ PCI compliant payment processing

This prompt provides a complete blueprint for building a production-ready fast food ordering and delivery system with all modern features including real-time tracking, automatic printing, and scalable architecture.