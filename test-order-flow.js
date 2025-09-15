// Test script to create a sample order
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';

async function testCompleteFlow() {
  try {
    console.log('🧪 Testing complete order flow...\n');

    // 1. Login as customer
    console.log('1. Logging in as customer...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      phone: '+1234567892',
      password: 'customer123'
    });
    
    const customerToken = loginResponse.data.accessToken;
    const customerId = loginResponse.data.user.id;
    console.log('✅ Customer logged in successfully\n');

    // 2. Get menu items
    console.log('2. Fetching menu items...');
    const menuResponse = await axios.get(`${API_BASE}/menu/items`);
    const menuItems = menuResponse.data.items;
    console.log(`✅ Found ${menuItems.length} menu items\n`);

    // 3. Get customer address
    console.log('3. Getting customer address...');
    const addressResponse = await axios.get(`${API_BASE}/customer/addresses`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const defaultAddress = addressResponse.data.addresses.find(addr => addr.is_default);
    console.log('✅ Got customer address\n');

    // 4. Create test order
    console.log('4. Creating test order...');
    const orderData = {
      delivery_address_id: defaultAddress.id,
      order_type: 'delivery',
      items: [
        {
          menu_item_id: menuItems.find(item => item.name.includes('Cheeseburger'))?.id,
          quantity: 1,
          special_instructions: 'No pickles please',
          selected_modifiers: []
        },
        {
          menu_item_id: menuItems.find(item => item.name.includes('Fries'))?.id,
          quantity: 1,
          special_instructions: 'Extra crispy',
          selected_modifiers: []
        }
      ],
      special_instructions: 'Ring doorbell twice',
      tip_cents: 300
    };

    const orderResponse = await axios.post(`${API_BASE}/orders`, orderData, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    
    const orderId = orderResponse.data.order.id;
    console.log(`✅ Order created successfully! Order ID: ${orderId.slice(-8)}\n`);

    // 5. Check kitchen display (simulate staff login)
    console.log('5. Simulating kitchen staff login...');
    const staffLoginResponse = await axios.post(`${API_BASE}/auth/login`, {
      phone: '+1234567891',
      password: 'staff123'
    });
    
    const staffToken = staffLoginResponse.data.accessToken;
    console.log('✅ Kitchen staff logged in\n');

    // 6. Update order status (simulate kitchen workflow)
    console.log('6. Simulating kitchen workflow...');
    
    // Accept order
    await axios.patch(`${API_BASE}/orders/${orderId}/status`, {
      status: 'accepted',
      notes: 'Order accepted by kitchen'
    }, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    console.log('✅ Order status: ACCEPTED');

    // Start preparing
    await new Promise(resolve => setTimeout(resolve, 2000));
    await axios.patch(`${API_BASE}/orders/${orderId}/status`, {
      status: 'preparing',
      notes: 'Started cooking'
    }, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    console.log('✅ Order status: PREPARING');

    // Mark ready
    await new Promise(resolve => setTimeout(resolve, 3000));
    await axios.patch(`${API_BASE}/orders/${orderId}/status`, {
      status: 'ready',
      notes: 'Food is ready for pickup'
    }, {
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    console.log('✅ Order status: READY\n');

    console.log('🎉 Complete order flow test successful!');
    console.log('📋 Order Summary:');
    console.log(`   Order ID: ${orderId.slice(-8)}`);
    console.log(`   Customer: ${loginResponse.data.user.first_name} ${loginResponse.data.user.last_name}`);
    console.log(`   Status: READY`);
    console.log(`   Items: Cheeseburger (no pickles), French Fries (extra crispy)`);
    console.log('\n✨ Check your Kitchen Display and Print Agent console for real-time updates!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testCompleteFlow();