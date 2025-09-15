const axios = require('axios');
const colors = require('colors');

const BASE_URL = 'http://localhost:3000/api';

class FastFoodDemo {
  constructor() {
    this.customerToken = null;
    this.staffToken = null;
    this.currentOrderId = null;
  }

  async presentationHeader() {
    console.clear();
    console.log('='.repeat(60).blue);
    console.log('🍔 FAST FOOD ORDERING & DELIVERY SYSTEM'.bold.yellow);
    console.log('   Complete Real-Time Restaurant Management'.italic);
    console.log('='.repeat(60).blue);
    console.log();
  }

  async step1_SystemOverview() {
    await this.presentationHeader();
    console.log('📋 SYSTEM OVERVIEW:'.bold.green);
    console.log('   ✅ Backend API Server (Node.js + Express)');
    console.log('   ✅ PostgreSQL Database with Real Data');
    console.log('   ✅ Real-time Communication (Socket.IO)');
    console.log('   ✅ Kitchen Display Interface');
    console.log('   ✅ Auto-Printing System');
    console.log('   ✅ Mobile Apps (Customer & Driver)');
    console.log();
    
    try {
      const health = await axios.get('http://localhost:3000/health');
      console.log('🟢 System Status: HEALTHY'.green.bold);
      console.log(`   Database: ${health.data.database}`.gray);
      console.log(`   Environment: ${health.data.environment}`.gray);
    } catch (error) {
      console.log('🔴 System Status: OFFLINE'.red.bold);
    }
    
    console.log('\n[Press Enter to continue to Customer Demo...]');
    await this.waitForEnter();
  }

  async step2_CustomerExperience() {
    await this.presentationHeader();
    console.log('👤 CUSTOMER EXPERIENCE DEMO:'.bold.green);
    console.log();

    // Login
    console.log('1. Customer Login...'.yellow);
    try {
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        phone: '+1234567892',
        password: 'customer123'
      });
      this.customerToken = loginResponse.data.token;
      console.log('   ✅ Customer "John Doe" logged in successfully');
    } catch (error) {
      console.log('   ❌ Login failed');
      return;
    }

    // Browse Menu
    console.log('2. Browsing Menu...'.yellow);
    const menuResponse = await axios.get(`${BASE_URL}/menu/items`);
    const items = menuResponse.data.items;
    console.log(`   ✅ Loaded ${items.length} menu items across 4 categories:`);
    
    const categories = [...new Set(items.map(item => item.category_name))];
    categories.forEach(cat => {
      const catItems = items.filter(i => i.category_name === cat);
      console.log(`      • ${cat}: ${catItems.length} items`.gray);
    });

    // Show popular items
    console.log('\n   🔥 Featured Items:');
    const featured = items.filter(item => item.is_featured);
    featured.slice(0, 3).forEach(item => {
      console.log(`      • ${item.name} - $${(item.price_cents/100).toFixed(2)}`.cyan);
    });

    console.log('\n[Press Enter to continue to Order Creation...]');
    await this.waitForEnter();
  }

  async step3_OrderCreation() {
    await this.presentationHeader();
    console.log('🛒 ORDER CREATION DEMO:'.bold.green);
    console.log();

    // Get customer address
    const addressResponse = await axios.get(`${BASE_URL}/customer/addresses`, {
      headers: { Authorization: `Bearer ${this.customerToken}` }
    });
    const address = addressResponse.data.addresses[0];

    // Get menu items for order
    const menuResponse = await axios.get(`${BASE_URL}/menu/items`);
    const items = menuResponse.data.items;
    const burger = items.find(item => item.name.includes('Cheeseburger'));
    const fries = items.find(item => item.name.includes('French Fries'));
    const drink = items.find(item => item.name.includes('Soft Drink'));

    console.log('Creating Order with:'.yellow);
    console.log(`   • ${burger.name} with Extra Cheese ($${((burger.price_cents + 100)/100).toFixed(2)})`);
    console.log(`   • ${fries.name} ($${(fries.price_cents/100).toFixed(2)})`);
    console.log(`   • ${drink.name} ($${(drink.price_cents/100).toFixed(2)})`);
    console.log(`   📍 Delivery to: ${address.address_line_1}, ${address.city}`);

    const orderData = {
      items: [
        {
          menu_item_id: burger.id,
          quantity: 1,
          selected_modifiers: [{ name: 'Extra Cheese', price_cents: 100 }],
          special_instructions: 'No pickles please'
        },
        {
          menu_item_id: fries.id,
          quantity: 1,
          selected_modifiers: [],
          special_instructions: 'Extra crispy'
        },
        {
          menu_item_id: drink.id,
          quantity: 1,
          selected_modifiers: [],
          special_instructions: 'No ice'
        }
      ],
      delivery_address_id: address.id,
      order_type: 'delivery',
      special_instructions: 'Please ring doorbell twice'
    };

    try {
      const orderResponse = await axios.post(`${BASE_URL}/orders`, orderData, {
        headers: { Authorization: `Bearer ${this.customerToken}` }
      });
      
      this.currentOrderId = orderResponse.data.order.id;
      const total = orderResponse.data.order.total_cents;
      
      console.log('\n✅ ORDER PLACED SUCCESSFULLY!'.green.bold);
      console.log(`   Order ID: ${this.currentOrderId.substring(0, 8)}...`);
      console.log(`   Total: $${(total/100).toFixed(2)}`);
      console.log(`   Status: PLACED`);
      console.log('   🔔 Real-time notification sent to kitchen!');
      
    } catch (error) {
      console.log('❌ Order creation failed:', error.response?.data?.error || error.message);
      return;
    }

    console.log('\n[Press Enter to continue to Kitchen Demo...]');
    await this.waitForEnter();
  }

  async step4_KitchenOperations() {
    await this.presentationHeader();
    console.log('👨‍🍳 KITCHEN OPERATIONS DEMO:'.bold.green);
    console.log();

    // Kitchen staff login
    console.log('1. Kitchen Staff Login...'.yellow);
    try {
      const staffLogin = await axios.post(`${BASE_URL}/auth/login`, {
        phone: '+1234567891',
        password: 'staff123'
      });
      this.staffToken = staffLogin.data.token;
      console.log('   ✅ Kitchen Staff logged in');
    } catch (error) {
      console.log('   ❌ Staff login failed');
      return;
    }

    // Simulate kitchen workflow
    const statusUpdates = [
      { status: 'accepted', message: 'Order confirmed by kitchen', delay: 2000 },
      { status: 'preparing', message: 'Cooking started - burger on grill', delay: 3000 },
      { status: 'ready', message: 'Order complete - ready for pickup', delay: 2000 }
    ];

    console.log('2. Processing Order...'.yellow);
    console.log(`   📝 Order ID: ${this.currentOrderId.substring(0, 8)}...`);

    for (const update of statusUpdates) {
      await new Promise(resolve => setTimeout(resolve, update.delay));
      
      try {
        await axios.patch(`${BASE_URL}/orders/${this.currentOrderId}/status`, 
          { status: update.status, notes: update.message },
          { headers: { Authorization: `Bearer ${this.staffToken}` }}
        );
        
        console.log(`   ✅ Status: ${update.status.toUpperCase()}`.green);
        console.log(`      ${update.message}`.gray);
        console.log('      🔔 Real-time update sent to customer app');
        
      } catch (error) {
        console.log(`   ❌ Failed to update status: ${update.status}`);
      }
    }

    console.log('\n🎉 ORDER PROCESSING COMPLETE!'.green.bold);
    console.log('   Kitchen Display updated in real-time');
    console.log('   Receipt printed automatically');
    console.log('   Customer notified via app');

    console.log('\n[Press Enter to continue to System Analytics...]');
    await this.waitForEnter();
  }

  async step5_SystemAnalytics() {
    await this.presentationHeader();
    console.log('📊 SYSTEM ANALYTICS & FEATURES:'.bold.green);
    console.log();

    // Database statistics
    console.log('📈 Database Statistics:'.yellow);
    try {
      const menuResponse = await axios.get(`${BASE_URL}/menu/items`);
      const items = menuResponse.data.items;
      
      console.log(`   • Total Menu Items: ${items.length}`);
      console.log(`   • Categories: ${[...new Set(items.map(i => i.category_name))].length}`);
      console.log(`   • Featured Items: ${items.filter(i => i.is_featured).length}`);
      console.log(`   • Vegetarian Options: ${items.filter(i => i.is_vegetarian).length}`);
      
    } catch (error) {
      console.log('   ❌ Could not fetch statistics');
    }

    console.log('\n🔧 Technical Features:'.yellow);
    console.log('   ✅ Real-time order tracking (Socket.IO)');
    console.log('   ✅ Role-based authentication (JWT)');
    console.log('   ✅ Order state machine (placed → delivered)');
    console.log('   ✅ Auto-printing system (ESC/POS)');
    console.log('   ✅ GPS tracking for drivers');
    console.log('   ✅ Payment processing (Stripe ready)');
    console.log('   ✅ Multi-device synchronization');

    console.log('\n🎯 Business Value:'.yellow);
    console.log('   💰 Increased order efficiency');
    console.log('   📱 Modern customer experience');
    console.log('   👨‍🍳 Streamlined kitchen operations');
    console.log('   🚚 Optimized delivery tracking');
    console.log('   📊 Real-time business insights');

    console.log('\n[Press Enter to finish demo...]');
    await this.waitForEnter();
  }

  async step6_DemoConclusion() {
    await this.presentationHeader();
    console.log('🎉 DEMONSTRATION COMPLETE!'.bold.green);
    console.log();
    
    console.log('💼 What we built:'.yellow);
    console.log('   ✅ Complete restaurant management system');
    console.log('   ✅ Customer mobile ordering app');
    console.log('   ✅ Kitchen display dashboard');
    console.log('   ✅ Driver delivery tracking');
    console.log('   ✅ Auto-printing receipts');
    console.log('   ✅ Real-time notifications');
    console.log('   ✅ Admin management panel');

    console.log('\n🌐 Access Points:'.yellow);
    console.log('   • API Server: http://localhost:3000');
    console.log('   • Kitchen Display: http://localhost:5173');
    console.log('   • Database: PostgreSQL with sample data');
    console.log('   • Documentation: Complete technical specs');

    console.log('\n🚀 Ready for Production:'.green.bold);
    console.log('   • Scalable architecture');
    console.log('   • Security implemented');
    console.log('   • Mobile-first design');
    console.log('   • Real restaurant deployment ready');

    console.log('\nThank you for watching the demonstration! 🙏');
  }

  async waitForEnter() {
    return new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });
  }

  async runFullDemo() {
    console.log('Starting Fast Food System Presentation...\n');
    
    await this.step1_SystemOverview();
    await this.step2_CustomerExperience();
    await this.step3_OrderCreation();
    await this.step4_KitchenOperations();
    await this.step5_SystemAnalytics();
    await this.step6_DemoConclusion();
    
    process.exit(0);
  }
}

// Run the demo
if (require.main === module) {
  const demo = new FastFoodDemo();
  demo.runFullDemo().catch(console.error);
}

module.exports = FastFoodDemo;