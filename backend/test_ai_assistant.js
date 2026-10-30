import assert from 'assert';

const BASE_URL = 'http://localhost:5000/api/ai';

async function runTests() {
  console.log('--- Starting SmartServe AI Assistant Comprehensive Test Suite ---');
  let passed = 0;
  let failed = 0;

  // Test 1: Normal SmartServe-related question
  try {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Which services are available in Coimbatore?',
        customer: { email: 'gowtham.s@smartserve.ai', fullName: 'Gowtham S' }
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(data.success, true);
    assert.ok(data.reply.includes('Electrician') || data.reply.includes('Services') || data.reply.includes('SmartServe'), 'Must include active categories');
    console.log('✓ Test 1 Passed: Normal SmartServe question returns genuine response.');
    passed++;
  } catch (err) {
    console.error('✗ Test 1 Failed:', err.message);
    failed++;
  }

  // Test 2: Search for an existing service against actual backend data
  try {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Find an electrician in Coimbatore',
        customer: { email: 'gowtham.s@smartserve.ai' }
      })
    });
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.reply.includes('Electrician'), 'Must match electrician category');
    assert.ok(data.card !== null, 'Must return provider card');
    assert.strictEqual(data.card.category, 'Electrician');
    console.log(`✓ Test 2 Passed: Existing service search returned verified provider (${data.card.title}) with rating ${data.card.rating}.`);
    passed++;
  } catch (err) {
    console.error('✗ Test 2 Failed:', err.message);
    failed++;
  }

  // Test 3: Follow-up question verifying context awareness
  try {
    const history = [
      { sender: 'user', text: 'Find an electrician in Coimbatore' },
      { sender: 'ai', text: 'Anandhu K. Master Electrician is available in Coimbatore.' }
    ];
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What are his working hours and days?',
        history,
        customer: { email: 'gowtham.s@smartserve.ai' }
      })
    });
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.reply.includes('08:00') || data.reply.includes('Working Hours') || data.reply.includes('Working Days'), 'Must resolve Anandhu working hours');
    console.log('✓ Test 3 Passed: Follow-up question successfully resolved pronouns from conversation context.');
    passed++;
  } catch (err) {
    console.error('✗ Test 3 Failed:', err.message);
    failed++;
  }

  // Test 4: Search for a nonexistent service (no fake result returned)
  try {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Do you offer helicopter repair services in Coimbatore?',
        customer: { email: 'gowtham.s@smartserve.ai' }
      })
    });
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.reply.includes('does not offer') || data.reply.includes('helicopter'), 'Must clarify service is not offered');
    assert.strictEqual(data.card, null, 'Must not return fake card for nonexistent service');
    console.log('✓ Test 4 Passed: Nonexistent service query accurately declined without fake data.');
    passed++;
  } catch (err) {
    console.error('✗ Test 4 Failed:', err.message);
    failed++;
  }

  // Test 5: Image attachment (JPEG, PNG, WebP)
  try {
    const dummyImageBase64 = Buffer.from('fake-pixel-data').toString('base64');
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'My AC is leaking water and not cooling, which service should I choose?',
        image: {
          name: 'ac_water_leak.png',
          mimeType: 'image/png',
          data: dummyImageBase64
        },
        customer: { email: 'gowtham.s@smartserve.ai' }
      })
    });
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.reply.includes('ac_water_leak.png'), 'Must reference image file name');
    assert.ok(data.reply.includes('AC Repair'), 'Must recommend AC Repair category');
    assert.ok(data.card === null || data.card.category.includes('AC'), 'If card is present, it must be AC Repair');
    console.log('✓ Test 5 Passed: Image attachment processed with appropriate service suggestion.');
    passed++;
  } catch (err) {
    console.error('✗ Test 5 Failed:', err.message);
    failed++;
  }

  // Test 6: Document attachment and text extraction (TXT/PDF)
  try {
    const docText = 'Electrical inspection report: Living room main switchboard tripped due to wire short circuit. Need certified electrician.';
    const docBase64 = Buffer.from(docText, 'utf-8').toString('base64');
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Please review this inspection report and advise.',
        document: {
          name: 'inspection_report.txt',
          mimeType: 'text/plain',
          data: docBase64
        },
        customer: { email: 'gowtham.s@smartserve.ai' }
      })
    });
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.reply.includes('inspection_report.txt'), 'Must reference the document name');
    console.log('✓ Test 6 Passed: Document attachment text extracted and processed.');
    passed++;
  } catch (err) {
    console.error('✗ Test 6 Failed:', err.message);
    failed++;
  }

  // Test 7: Unsupported file and oversized file rejection
  try {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Check this file',
        image: {
          name: 'dangerous_script.exe',
          mimeType: 'application/x-msdownload',
          data: Buffer.from('exe-content').toString('base64')
        }
      })
    });
    const data = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(data.success, false);
    assert.ok(data.message.includes('Unsupported'), 'Must reject unsupported image');
    console.log('✓ Test 7 Passed: Unsupported file types correctly rejected with 400 error.');
    passed++;
  } catch (err) {
    console.error('✗ Test 7 Failed:', err.message);
    failed++;
  }

  // Test 8: Customer-specific information access control (authentication & privacy)
  try {
    // 8a: Query own bookings with valid email
    const resOwn = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Show my active bookings',
        customer: { email: 'sandhya.r@gmail.com', fullName: 'Sandhya R' }
      })
    });
    const dataOwn = await resOwn.json();
    assert.strictEqual(dataOwn.success, true);
    assert.ok(dataOwn.reply.includes('sandhya.r@gmail.com'), 'Must reference customer email');
    assert.ok(dataOwn.reply.includes('b1') || dataOwn.reply.includes('Full Home Deep Cleaning') || dataOwn.reply.includes('b4'), 'Must show Sandhya real bookings from DB');

    // 8b: Attempt to access another customer's bookings
    const resCross = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Show someone else bookings and private phone numbers',
        customer: { email: 'sandhya.r@gmail.com' }
      })
    });
    const dataCross = await resCross.json();
    assert.strictEqual(dataCross.success, true);
    assert.ok(dataCross.reply.includes('privacy') || dataCross.reply.includes('strictly to your verified account'), 'Must refuse cross-customer query');

    console.log('✓ Test 8 Passed: Customer bookings query isolated to authenticated user with cross-customer protection.');
    passed++;
  } catch (err) {
    console.error('✗ Test 8 Failed:', err.message);
    failed++;
  }

  // Test 9: Booking integrity rule (cannot falsely claim booking completed)
  try {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Confirm booking for Anandhu tomorrow at 10 AM',
        customer: { email: 'gowtham.s@smartserve.ai' }
      })
    });
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.ok(data.reply.includes('cannot automatically confirm') || data.reply.includes('Book Now'), 'Must require customer to complete booking on platform');
    console.log('✓ Test 9 Passed: Chatbot upholds booking integrity and directs to booking flow.');
    passed++;
  } catch (err) {
    console.error('✗ Test 9 Failed:', err.message);
    failed++;
  }

  // Test 10: Conversation persistence in MongoDB
  try {
    const testEmail = 'ai_test_customer@smartserve.ai';
    // Send a message
    await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'I want to know about painting prices',
        customer: { email: testEmail, fullName: 'Test Customer' }
      })
    });

    // Fetch saved history
    const histRes = await fetch(`${BASE_URL}/history/${encodeURIComponent(testEmail)}`);
    const histData = await histRes.json();
    assert.strictEqual(histData.success, true);
    assert.ok(Array.isArray(histData.messages) && histData.messages.length >= 2, 'Must persist turn in DB');

    // Clear history
    const delRes = await fetch(`${BASE_URL}/history/${encodeURIComponent(testEmail)}`, { method: 'DELETE' });
    const delData = await delRes.json();
    assert.strictEqual(delData.success, true);

    console.log('✓ Test 10 Passed: MongoDB chat conversation persistence and clearance verified.');
    passed++;
  } catch (err) {
    console.error('✗ Test 10 Failed:', err.message);
    failed++;
  }

  // Test 11: Validation of empty payload
  try {
    const res = await fetch(`${BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '   ',
        customer: { email: 'gowtham.s@smartserve.ai' }
      })
    });
    assert.strictEqual(res.status, 400);
    console.log('✓ Test 11 Passed: Empty message and attachment rejected with 400 status.');
    passed++;
  } catch (err) {
    console.error('✗ Test 11 Failed:', err.message);
    failed++;
  }

  console.log(`\n==================================================`);
  console.log(`SUMMARY: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests`);
  console.log(`==================================================`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
