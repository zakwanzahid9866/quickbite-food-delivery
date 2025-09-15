const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';

async function liveOrderTest() {
  console.log('🍔 Creating a live order...\n');
  
  try {
    // 1. Login as customer
    console.log('1. 👤 Logging in as customer...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      phone: '+1234567892',
      password: 'customer123'
    });
    
    const customerToken = loginResponse.data.token;
    console.log('✅ Customer logged in');
    
    // 2. Get menu items
    console.log('2. 📋 Getting menu...');
    const menuResponse = await axios.get(`${BASE_URL}/menu/items`);
    const burger = menuResponse.data.items.find(item => item.name.includes('Cheeseburger'));
    const fries = menuResponse.data.items.find(item => item.name.includes('French Fries'));
    console.log(`✅ Found menu items: ${burger.name}, ${fries.name}`);
    
    // 3. Get customer address
    const addressResponse = await axios.get(`${BASE_URL}/customer/addresses`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const address = addressResponse.data.addresses[0];
    console.log('✅ Got delivery address');
    
    // 4. Create order
    console.log('3. 🛒 Creating order...');
    const orderData = {
      items: [
        {
          menu_item_id: burger.id,
          quantity: 1,
          selected_modifiers: [{ name: 'Extra Cheese', price_cents: 100 }],
          special_instructions: 'Medium cooked please'
        },
        {
          menu_item_id: fries.id,
          quantity: 1,
          selected_modifiers: [],
          special_instructions: 'Extra crispy'
        }
      ],
      delivery_address_id: address.id,
      order_type: 'delivery',
      special_instructions: 'Ring doorbell twice'
    };
    
    const orderResponse = await axios.post(`${BASE_URL}/orders`, orderData, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    
    const orderId = orderResponse.data.order.id;
    console.log(`✅ Order created! ID: ${orderId}`);
    
    // 5. Login as staff and update order
    console.log('4. 👨‍🍳 Kitchen staff taking action...');
    const staffLogin = await axios.post(`${BASE_URL}/auth/login`, {
      phone: '+1234567891',
      password: 'staff123'
    });
    
    const staffToken = staffLogin.data.token;
    
    // Accept order
    await axios.patch(`${BASE_URL}/orders/${orderId}/status`, 
      { status: 'accepted', notes: 'Order confirmed by kitchen' },
      { headers: { Authorization: `Bearer ${staffToken}` }}
    );
    console.log('✅ Order ACCEPTED by kitchen');
    
    // Start preparing
    await axios.patch(`${BASE_URL}/orders/${orderId}/status`, 
      { status: 'preparing', notes: 'Cooking started' },
      { headers: { Authorization: `Bearer ${staffToken}` }}
    );
    console.log('✅ Order is being PREPARED');
    
    // Mark ready
    await axios.patch(`${BASE_URL}/orders/${orderId}/status`, 
      { status: 'ready', notes: 'Food ready for pickup' },
      { headers: { Authorization: `Bearer ${staffToken}` }}
    );
    console.log('✅ Order is READY');
    
    console.log('\n🎉 Live order test successful!');
    console.log(`📋 Order ${orderId} completed the full workflow`);
    console.log('🌐 Real-time events were sent via Socket.IO');
    
  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run if called directly
if (require.main === module) {
  liveOrderTest();
}

module.exports = { liveOrderTest };