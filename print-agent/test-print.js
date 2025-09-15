const PrintAgent = require('./index');
const logger = require('./utils/logger');

// Test data for printing
const testOrder = {
  id: 'test-order-12345678',
  customer_name: 'John Doe',
  phone: '(555) 123-4567',
  status: 'placed',
  order_type: 'delivery',
  payment_status: 'paid',
  payment_method: 'card',
  subtotal_cents: 2450,
  tax_cents: 196,
  delivery_fee_cents: 300,
  tip_cents: 400,
  discount_cents: 0,
  total_cents: 3346,
  estimated_prep_time: 15,
  special_instructions: 'Extra crispy fries, no pickles on burger',
  created_at: new Date().toISOString(),
  line_items: [
    {
      quantity: 1,
      menu_item_name: 'Classic Cheeseburger',
      total_price_cents: 1200,
      special_instructions: 'No pickles',
      selected_modifiers: [
        { name: 'Extra Cheese', price_cents: 100 },
        { name: 'Add Bacon', price_cents: 150 }
      ]
    },
    {
      quantity: 1,
      menu_item_name: 'Large Fries',
      total_price_cents: 450,
      special_instructions: 'Extra crispy',
      selected_modifiers: []
    },
    {
      quantity: 2,
      menu_item_name: 'Soft Drink',
      total_price_cents: 800,
      special_instructions: '',
      selected_modifiers: [
        { name: 'Large Size', price_cents: 50 }
      ]
    }
  ],
  delivery_address: {
    address_line_1: '123 Main Street',
    address_line_2: 'Apt 4B',
    city: 'Anytown',
    state: 'CA',
    postal_code: '12345'
  }
};

async function runTest() {
  logger.info('🧪 Starting print test...');
  
  try {
    // Force debug mode for testing
    process.env.DEBUG_MODE = 'true';
    
    const agent = new PrintAgent();
    
    // Test receipt formatting
    logger.info('📄 Testing kitchen receipt format...');
    await agent.handleNewOrder(testOrder);
    
    logger.info('🎉 Print test completed successfully!');
    
    // Test different scenarios
    logger.info('🧪 Testing order ready scenario...');
    const readyOrder = { ...testOrder, status: 'ready' };
    await agent.printPickupReceipt(readyOrder);
    
    logger.info('✅ All tests passed!');
    
  } catch (error) {
    logger.error('❌ Test failed:', error);
  }
  
  process.exit(0);
}

// Run test if called directly
if (require.main === module) {
  runTest();
}

module.exports = { testOrder, runTest };