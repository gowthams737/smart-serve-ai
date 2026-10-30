import http from 'http';

function post(urlPath, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: urlPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING ROLE AUTHENTICATION TESTS ---');

  const testCustEmail = `testcust_${Date.now()}@smartserve.ai`;
  const testProvEmail = `testprov_${Date.now()}@smartserve.ai`;

  // Test 1: Register Customer
  console.log('\n1. Registering Customer account...');
  const resRegCust = await post('/api/auth/register', {
    fullName: 'Test Customer',
    email: testCustEmail,
    phone: '+91 91111 22222',
    password: 'password123',
    role: 'Customer'
  });
  console.log('Customer Registration Response:', JSON.stringify(resRegCust, null, 2));

  // Test 2: Register Provider
  console.log('\n2. Registering Provider account...');
  const resRegProv = await post('/api/auth/register', {
    fullName: 'Test Provider',
    email: testProvEmail,
    phone: '+91 93333 44444',
    password: 'password123',
    role: 'Provider',
    category: 'Electrician'
  });
  console.log('Provider Registration Response:', JSON.stringify(resRegProv, null, 2));

  // Test 3: Login Customer with Customer role (Match)
  console.log('\n3. Login Customer as Customer...');
  const resLoginCustMatch = await post('/api/auth/login', {
    email: testCustEmail,
    password: 'password123',
    role: 'Customer'
  });
  console.log('Customer Match Login Response:', JSON.stringify(resLoginCustMatch, null, 2));

  // Test 4: Login Customer with Provider role (Mismatch)
  console.log('\n4. Login Customer as Provider (Mismatch)...');
  const resLoginCustMismatch = await post('/api/auth/login', {
    email: testCustEmail,
    password: 'password123',
    role: 'Provider'
  });
  console.log('Customer Mismatch Login Response:', JSON.stringify(resLoginCustMismatch, null, 2));

  // Test 5: Login Provider as Provider role (Match)
  console.log('\n5. Login Provider as Provider...');
  const resLoginProvMatch = await post('/api/auth/login', {
    email: testProvEmail,
    password: 'password123',
    role: 'Provider'
  });
  console.log('Provider Match Login Response:', JSON.stringify(resLoginProvMatch, null, 2));

  // Test 6: Login Provider as Customer role (Mismatch)
  console.log('\n6. Login Provider as Customer (Mismatch)...');
  const resLoginProvMismatch = await post('/api/auth/login', {
    email: testProvEmail,
    password: 'password123',
    role: 'Customer'
  });
  console.log('Provider Mismatch Login Response:', JSON.stringify(resLoginProvMismatch, null, 2));

  // Test 7: Non-existent User Login
  console.log('\n7. Login Non-existent Email...');
  const resLoginNonExist = await post('/api/auth/login', {
    email: 'nonexistent_user_9999@smartserve.ai',
    password: 'password123',
    role: 'Customer'
  });
  console.log('Non-existent Login Response:', JSON.stringify(resLoginNonExist, null, 2));

  console.log('\n--- ALL TESTS COMPLETED SUCCESSFULY ---');
}

runTests().catch(err => console.error('Test error:', err));
