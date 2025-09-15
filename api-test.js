const https = require('http');

console.log('🧪 Testing Fast Food API Endpoints...\n');

// Test 1: Health Check
function testHealth() {
  return new Promise((resolve) => {
    const req = https.request('http://localhost:3000/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('✅ Health Check:', res.statusCode === 200 ? 'PASS' : 'FAIL');
        resolve();
      });
    });
    req.on('error', () => {
      console.log('❌ Health Check: FAIL - Server not running');
      resolve();
    });
    req.end();
  });
}

// Test 2: Menu Items
function testMenu() {
  return new Promise((resolve) => {
    const req = https.request('http://localhost:3000/api/menu/items', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const menu = JSON.parse(data);
          console.log(`✅ Menu API: PASS - Found ${menu.items ? menu.items.length : 0} items`);
        } catch {
          console.log('❌ Menu API: FAIL - Invalid response');
        }
        resolve();
      });
    });
    req.on('error', () => {
      console.log('❌ Menu API: FAIL');
      resolve();
    });
    req.end();
  });
}

// Test 3: Customer Login
function testLogin() {
  return new Promise((resolve) => {
    const loginData = JSON.stringify({
      phone: '+1234567892',
      password: 'customer123'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': loginData.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('✅ Login API:', response.token ? 'PASS' : 'FAIL');
        } catch {
          console.log('❌ Login API: FAIL');
        }
        resolve();
      });
    });

    req.on('error', () => {
      console.log('❌ Login API: FAIL');
      resolve();
    });

    req.write(loginData);
    req.end();
  });
}

async function runTests() {
  await testHealth();
  await testMenu();
  await testLogin();
  
  console.log('\n🔍 Manual Testing Options:');
  console.log('1. Browser: Open http://localhost:3000/health');
  console.log('2. API Tool: Use Postman with base URL http://localhost:3000');
  console.log('3. Kitchen Display: cd kitchen-display && npm start');
  console.log('4. Full Test: node test-order-flow.js');
}

runTests();