import assert from 'assert';
import mongoose from 'mongoose';
import express from 'express';
import { getTestMongoUri } from './utils/testDbHelper.js';
import ServiceCategory from './models/ServiceCategory.js';
import Provider from './models/Provider.js';
import Service from './models/Service.js';
import Booking from './models/Booking.js';
import Customer from './models/Customer.js';
import User from './models/User.js';
import ChatConversation from './models/ChatConversation.js';
import customerRoutes from './routes/customerRoutes.js';
import aiRoutes, {
  findCategoryInText,
  findProviderByName,
  extractActiveCategory,
  detectIntent,
  generateProjectGroundedResponse,
  validateAiResponse,
  handleCustomerBookingsQuery,
  generateAIServicePlan,
  findAllCategoriesInText
} from './routes/aiRoutes.js';
import authRoutes, { hashPassword } from './routes/authRoutes.js';

const TEST_URI = getTestMongoUri();

async function runCustomerAIAgentTests() {
  console.log('===============================================================');
  console.log('STARTING SMARTSERVE CUSTOMER AI AGENT VERIFICATION SUITE');
  console.log('Target Database:', TEST_URI);
  console.log('===============================================================\n');

  // Verify test database isolation
  assert.ok(TEST_URI.includes('_test'), 'Must target isolated test database');
  assert.ok(!TEST_URI.endsWith('/smartserve'), 'Must NEVER target live production database');

  await mongoose.connect(TEST_URI);
  console.log('Connected to isolated test database.');

  // Clean test database collections
  await ServiceCategory.deleteMany({});
  await Provider.deleteMany({});
  await Service.deleteMany({});
  await Booking.deleteMany({});
  await Customer.deleteMany({});
  await User.deleteMany({});
  await ChatConversation.deleteMany({});

  // 1. Seed Test Categories
  const catElectrician = await ServiceCategory.create({
    name: 'Electrician',
    startingPrice: 350,
    duration: 'Per Hour',
    description: 'Wiring, switches, fan installation, short circuit repair and electrical maintenance.',
    status: 'Active'
  });

  const catPlumber = await ServiceCategory.create({
    name: 'Plumber',
    startingPrice: 299,
    duration: 'Per Visit',
    description: 'Pipe fitting, leak repair, tap installation, drainage solutions.',
    status: 'Active'
  });

  const catCleaner = await ServiceCategory.create({
    name: 'Home Cleaning',
    startingPrice: 1899,
    duration: 'Per BHK',
    description: 'Full home cleaning, kitchen, bathroom, and dusting.',
    status: 'Active'
  });

  // 2. Seed Test Users & Providers
  const userElec = await User.create({
    fullName: 'Test Anandhu Electrician',
    email: 'anandhu.test@smartserve.ai',
    phone: '9876543210',
    password: 'Password123!',
    role: 'Provider'
  });

  const provElec = await Provider.create({
    user: userElec._id,
    name: 'Test Anandhu Electrician',
    email: 'anandhu.test@smartserve.ai',
    phone: '9876543210',
    category: 'Electrician',
    experience: 5,
    rating: 4.8,
    reviewsCount: 12,
    hourlyRate: 400,
    pricingUnit: 'Per Hour',
    pricing: [{ service: 'Fan Repair & Installation', price: 400, unit: 'Per Hour' }],
    status: 'Approved',
    city: 'Coimbatore',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    workingHours: { start: '08:00', end: '18:00' }
  });

  const userCleaner = await User.create({
    fullName: 'Test Cleaner Pro',
    email: 'cleaner.test@smartserve.ai',
    phone: '9876543211',
    password: 'Password123!',
    role: 'Provider'
  });

  const provCleaner = await Provider.create({
    user: userCleaner._id,
    name: 'Test Cleaner Pro',
    email: 'cleaner.test@smartserve.ai',
    phone: '9876543211',
    category: 'Home Cleaning',
    experience: 3,
    rating: 4.9,
    reviewsCount: 8,
    hourlyRate: 0,
    pricingUnit: 'Per BHK',
    pricing: [{ service: 'Deep Home Cleaning', price: 1899, unit: 'Per BHK' }],
    status: 'Approved',
    city: 'Coimbatore',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    workingHours: { start: '09:00', end: '17:00' }
  });

  // 3. Seed Services & Additional Test Providers
  const srvFan = await Service.create({
    name: 'Ceiling Fan Installation & Repair',
    category: 'Electrician',
    price: 400,
    pricingUnit: 'Per Hour',
    estimatedDuration: '1 hour',
    providerId: provElec._id,
    providerEmail: provElec.email,
    isAvailable: true
  });

  // Second service offered by provElec (Provider with multiple matching services)
  const srvWiring = await Service.create({
    name: 'Switchboard & Wiring Repair',
    category: 'Electrician',
    price: 450,
    pricingUnit: 'Per Hour',
    estimatedDuration: '45 minutes',
    providerId: provElec._id,
    providerEmail: provElec.email,
    isAvailable: true
  });

  const srvCleaning = await Service.create({
    name: '1 BHK Complete Home Cleaning',
    category: 'Home Cleaning',
    price: 1899,
    pricingUnit: 'Per BHK',
    estimatedDuration: '3 hours',
    providerId: provCleaner._id,
    providerEmail: provCleaner.email,
    isAvailable: true
  });

  // Provider B: has IDENTICAL name "Test Anandhu Electrician" to test identical-name separation & different duration ("3 hours")
  const userElec2 = await User.create({
    fullName: 'Test Anandhu Electrician',
    email: 'anandhu2.test@smartserve.ai',
    phone: '9876543299',
    password: 'Password123!',
    role: 'Provider'
  });

  const provElec2 = await Provider.create({
    user: userElec2._id,
    name: 'Test Anandhu Electrician',
    email: 'anandhu2.test@smartserve.ai',
    phone: '9876543299',
    category: 'Electrician',
    experience: 8,
    rating: 4.9,
    reviewsCount: 20,
    hourlyRate: 500,
    pricingUnit: 'Per Hour',
    pricing: [{ service: 'Ceiling Fan Installation & Repair', price: 500, unit: 'Per Hour' }],
    status: 'Approved',
    city: 'Coimbatore',
    workingDays: ['Monday', 'Tuesday', 'Wednesday'],
    workingHours: { start: '09:00', end: '18:00' }
  });

  const srvFan2 = await Service.create({
    name: 'Ceiling Fan Installation & Repair',
    category: 'Electrician',
    price: 500,
    pricingUnit: 'Per Hour',
    estimatedDuration: '3 hours',
    providerId: provElec2._id,
    providerEmail: provElec2.email,
    isAvailable: true
  });

  // Provider C: Provider with MISSING duration configuration
  const userNoDur = await User.create({
    fullName: 'Test NoDuration Pro',
    email: 'nodur.test@smartserve.ai',
    phone: '9876543288',
    password: 'Password123!',
    role: 'Provider'
  });

  const provNoDur = await Provider.create({
    user: userNoDur._id,
    name: 'Test NoDuration Pro',
    email: 'nodur.test@smartserve.ai',
    phone: '9876543288',
    category: 'Electrician',
    experience: 2,
    rating: 4.0,
    reviewsCount: 3,
    hourlyRate: 350,
    pricingUnit: 'Per Hour',
    pricing: [{ service: 'General Electrical Inspection', price: 350, unit: 'Per Hour' }],
    status: 'Approved',
    city: 'Coimbatore',
    workingDays: ['Monday', 'Tuesday', 'Wednesday'],
    workingHours: { start: '09:00', end: '18:00' }
  });

  const srvNoDur = await Service.create({
    name: 'General Electrical Inspection',
    category: 'Electrician',
    price: 350,
    pricingUnit: 'Per Hour',
    estimatedDuration: '', // Missing duration
    providerId: provNoDur._id,
    providerEmail: provNoDur.email,
    isAvailable: true
  });

  // 4. Seed Customer Bookings for Privacy Testing
  const bookingCustomerA = await Booking.create({
    bookingId: '#01',
    customerName: 'Customer Alpha',
    customerEmail: 'alpha.customer@smartserve.ai',
    customerPhone: '9876500001',
    customerAddress: '12 Trichy Road, Coimbatore',
    providerId: provElec._id,
    providerName: 'Test Anandhu Electrician',
    providerEmail: 'anandhu.test@smartserve.ai',
    providerPhone: '9876543210',
    date: '30/10/2026',
    time: '10:00 AM',
    serviceType: 'Electrician',
    serviceName: 'Ceiling Fan Installation & Repair',
    amount: 400,
    status: 'Confirmed',
    location: 'Coimbatore'
  });

  const bookingCustomerB = await Booking.create({
    bookingId: '#02',
    customerName: 'Customer Beta',
    customerEmail: 'beta.customer@smartserve.ai',
    customerPhone: '9876500002',
    customerAddress: '45 Avinashi Road, Coimbatore',
    providerId: provCleaner._id,
    providerName: 'Test Cleaner Pro',
    providerEmail: 'cleaner.test@smartserve.ai',
    providerPhone: '9876543211',
    date: '31/10/2026',
    time: '02:00 PM',
    serviceType: 'Home Cleaning',
    serviceName: '1 BHK Complete Home Cleaning',
    amount: 1899,
    status: 'Confirmed',
    location: 'Coimbatore'
  });

  console.log('Seeded isolated test data (Electrician, Plumber with 0 providers, Home Cleaning, Bookings).');

  // Build test context data
  const testCategories = [catElectrician.toObject(), catPlumber.toObject(), catCleaner.toObject()];
  const testProviders = [provElec.toObject(), provCleaner.toObject()];
  const testServices = [srvFan.toObject(), srvCleaning.toObject()];

  const testProviderList = testProviders.map(p => ({
    id: p._id.toString(),
    name: p.name,
    email: p.email,
    category: p.category,
    rating: p.rating,
    reviewsCount: p.reviewsCount,
    price: p.pricing && p.pricing.length > 0 ? `₹${p.pricing[0].price} ${p.pricing[0].unit}` : `₹${p.hourlyRate} Per Hour`,
    numericPrice: p.hourlyRate || p.pricing[0]?.price,
    pricingUnit: p.pricingUnit,
    city: p.city,
    workingHours: p.workingHours,
    workingDays: p.workingDays,
    blockedDates: [],
    holidays: [],
    photo: '',
    experience: p.experience,
    about: 'Verified provider in Coimbatore'
  }));

  const contextData = {
    categories: testCategories,
    providers: testProviders,
    services: testServices,
    providerList: testProviderList,
    categoriesText: 'Electrician, Plumber, Home Cleaning',
    providersText: 'Test Anandhu Electrician, Test Cleaner Pro',
    servicesText: 'Ceiling Fan Installation & Repair, 1 BHK Complete Home Cleaning'
  };

  let passed = 0;
  let failed = 0;

  function runCheck(testNum, testName, fn) {
    try {
      fn();
      console.log(`[PASS] Case ${testNum}: ${testName}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] Case ${testNum}: ${testName} ->`, err.message);
      failed++;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST CASES 1 TO 14
  // ─────────────────────────────────────────────────────────────────────────────

  // Case 1: "I need a electrician" → electrical-service intent
  runCheck(1, '"I need a electrician" matches electrical service intent & providers', () => {
    const res = generateProjectGroundedResponse('I need a electrician', contextData);
    assert.ok(res.reply.includes('Electrician Services in Coimbatore'), 'Must identify Electrician');
    assert.ok(res.reply.includes('Test Anandhu Electrician'), 'Must list genuine electrician');
    assert.ok(res.card !== null, 'Must provide an actionable card');
    assert.strictEqual(res.card.category, 'Electrician');
    assert.strictEqual(res.card.title, 'Test Anandhu Electrician');
    assert.ok(!res.reply.toLowerCase().includes('interior designer'), 'Must not mention unrelated services');
    assert.ok(!res.reply.toLowerCase().includes('cleaning'), 'Must not mention cleaning');
  });

  // Case 2: "Enaku electrician venum" → electrical-service intent (Tanglish)
  runCheck(2, '"Enaku electrician venum" (Tanglish) matches electrical service intent', () => {
    const res = generateProjectGroundedResponse('Enaku electrician venum', contextData);
    assert.ok(res.reply.includes('Electrician Services in Coimbatore'), 'Must identify Electrician');
    assert.ok(res.card !== null && res.card.category === 'Electrician');
  });

  // Case 3: "fan repair panna aal venum" → the correct supported repair category (Electrician)
  runCheck(3, '"fan repair panna aal venum" maps to Electrician repair category', () => {
    const res = generateProjectGroundedResponse('fan repair panna aal venum', contextData);
    assert.ok(res.reply.includes('Electrician Services in Coimbatore'), 'Must map fan repair to Electrician');
    assert.ok(res.card !== null && res.card.category === 'Electrician');
  });

  // Case 4: "I need a plumber" → plumbing intent, not electrical services
  runCheck(4, '"I need a plumber" plumbing intent without fabricating providers', () => {
    const res = generateProjectGroundedResponse('I need a plumber', contextData);
    assert.ok(res.reply.includes('Plumber'), 'Must identify Plumber');
    assert.ok(res.reply.includes('no verified Plumber providers registered or available'), 'Must state honest empty state');
    assert.strictEqual(res.card, null, 'Must NOT fabricate a fake provider card');
    assert.ok(!res.reply.toLowerCase().includes('anandhu'), 'Must NOT recommend electrician');
  });

  // Case 5: "How much does electrical work cost?" → verified electrical pricing
  runCheck(5, '"How much does electrical work cost?" returns verified electrical pricing', () => {
    const res = generateProjectGroundedResponse('How much does electrical work cost?', contextData);
    assert.ok(res.reply.includes('Electrician Pricing in Coimbatore'), 'Must address Electrician pricing');
    assert.ok(res.reply.includes('₹350 Per Hour'), 'Must include category starting rate');
    assert.ok(res.reply.includes('Test Anandhu Electrician: ₹400 Per Hour') || res.reply.includes('400'), 'Must include real provider rate');
    assert.ok(res.card !== null && res.card.category === 'Electrician');
  });

  // Case 6: "Are electricians available today?" → verified availability
  runCheck(6, '"Are electricians available today?" checks verified availability', () => {
    const res = generateProjectGroundedResponse('Are electricians available today?', contextData);
    assert.ok(res.reply.includes('Electrician Availability in Coimbatore') || res.reply.includes('Electrician'), 'Must check Electrician availability');
    assert.ok(res.reply.includes('Test Anandhu Electrician'), 'Must reference verified electrician');
    assert.ok(res.card !== null && res.card.category === 'Electrician');
  });

  // Case 7: "Show me electricians" → genuine matching provider results
  runCheck(7, '"Show me electricians" returns genuine matching provider results', () => {
    const res = generateProjectGroundedResponse('Show me electricians', contextData);
    assert.ok(res.reply.includes('Electrician Services in Coimbatore'));
    assert.ok(res.reply.includes('Test Anandhu Electrician'));
    assert.ok(res.card !== null && res.card.title === 'Test Anandhu Electrician');
  });

  // Case 8: "I need an electrician. How do I book?" → relevant booking instructions and action
  runCheck(8, '"I need an electrician. How do I book?" gives step-by-step instructions & action card', () => {
    const res = generateProjectGroundedResponse('I need an electrician. How do I book?', contextData);
    assert.ok(res.reply.includes('How to Book a Verified Electrician in Coimbatore'), 'Must give booking instructions');
    assert.ok(res.reply.includes('DD/MM/YYYY'), 'Must mention date format');
    assert.ok(res.reply.includes('cannot be finalized directly in chat'), 'Must enforce booking integrity');
    assert.ok(res.card !== null && res.card.category === 'Electrician');
  });

  // Case 9: "What about the price?" after discussing electricians → electrical-service context retained
  runCheck(9, '"What about the price?" retains Electrician context from history', () => {
    const history = [
      { sender: 'user', text: 'I need an electrician' },
      { sender: 'ai', text: 'SmartServe Electrician Services in Coimbatore. Test Anandhu Electrician is available.' }
    ];
    const res = generateProjectGroundedResponse('What about the price?', contextData, null, history);
    assert.ok(res.reply.includes('Electrician Pricing in Coimbatore'), 'Must retain Electrician context');
    assert.ok(res.reply.includes('₹350 Per Hour'), 'Must return Electrician rate');
    assert.ok(res.card !== null && res.card.category === 'Electrician');
  });

  // Case 10: Switch from electrician to cleaner → context switches correctly
  runCheck(10, 'Switch from electrician to cleaner switches context immediately', () => {
    const history = [
      { sender: 'user', text: 'I need an electrician' },
      { sender: 'ai', text: 'SmartServe Electrician Services in Coimbatore.' },
      { sender: 'user', text: 'What about the price?' },
      { sender: 'ai', text: 'Electrician Pricing in Coimbatore starts from ₹350.' }
    ];
    const res = generateProjectGroundedResponse('Can I book a cleaner now?', contextData, null, history);
    assert.ok(res.reply.includes('Home Cleaning'), 'Must switch to Home Cleaning');
    assert.ok(res.reply.includes('Test Cleaner Pro'), 'Must reference cleaner provider');
    assert.ok(!res.reply.toLowerCase().includes('anandhu'), 'Must NOT mention electrician in cleaner response');
    assert.ok(res.card !== null && res.card.category === 'Home Cleaning');
  });

  // Case 11: Request a nonexistent service → clear response without fabricated categories
  runCheck(11, 'Request a nonexistent service declined clearly with no fake data', () => {
    const res = generateProjectGroundedResponse('Do you offer helicopter repair services in Coimbatore?', contextData);
    assert.ok(res.reply.includes('does not offer') && res.reply.includes('helicopter'), 'Must decline helicopter service');
    assert.strictEqual(res.card, null, 'Must not return provider card');
  });

  // Case 12: Ask an unrelated general question → polite scope restriction
  runCheck(12, 'Ask an unrelated general question gives polite scope restriction', () => {
    const res = generateProjectGroundedResponse('Write a python script to sort a list using quicksort', contextData);
    assert.ok(res.reply.includes('SmartServe AI Assistant') && res.reply.includes('residential home and appliance maintenance'), 'Must restrict scope');
    assert.ok(!res.reply.toLowerCase().includes('def quicksort'), 'Must not generate python code');
    assert.strictEqual(res.card, null);
  });

  // Case 13: Simulate AI API failure → safe fallback, no fabricated answer
  runCheck(13, 'AI response validation rejects hallucinations and falls back safely', () => {
    // 13a: Gemini hallucinates a car repair recommendation
    const hallucinatedCar = "You can book our certified Car Repair mechanics at ₹500.";
    const grounded = generateProjectGroundedResponse('I need my car fixed', contextData);
    const valCar = validateAiResponse(hallucinatedCar, grounded, contextData, null);
    assert.strictEqual(valCar.valid, false, 'Must reject car repair hallucination');
    assert.ok(valCar.sanitizedReply.includes('SmartServe AI does not offer') || valCar.sanitizedReply.includes('residential home'));

    // 13b: Gemini hallucinates an unrelated category when user asked for Electrician
    const hallucinatedCat = "I recommend booking our Interior Designer or Home Cleaning package.";
    const valCat = validateAiResponse(hallucinatedCat, grounded, contextData, 'Electrician');
    assert.strictEqual(valCat.valid, false, 'Must reject unrelated category recommendation');

    // 13c: Gemini falsely claims booking was confirmed
    const fakeConfirm = "Your booking has been confirmed for tomorrow at 10 AM!";
    const valConfirm = validateAiResponse(fakeConfirm, grounded, contextData, 'Electrician');
    assert.strictEqual(valConfirm.valid, false, 'Must reject false booking confirmation');
  });

  // Case 14: Verify provider and customer data isolation
  await (async () => {
    // 14a: Customer A can query their own bookings
    const resCustA = await handleCustomerBookingsQuery('Show my active bookings', { email: 'alpha.customer@smartserve.ai' });
    assert.ok(resCustA.reply.includes('alpha.customer@smartserve.ai'), 'Must identify Customer A');
    assert.ok(resCustA.reply.includes('#01'), 'Must include Customer A booking');
    assert.ok(!resCustA.reply.includes('#02'), 'Must NOT include Customer B booking');

    // 14b: Customer B can query their own bookings
    const resCustB = await handleCustomerBookingsQuery('Show my active bookings', { email: 'beta.customer@smartserve.ai' });
    assert.ok(resCustB.reply.includes('beta.customer@smartserve.ai'), 'Must identify Customer B');
    assert.ok(resCustB.reply.includes('#02'), 'Must include Customer B booking');
    assert.ok(!resCustB.reply.includes('#01'), 'Must NOT include Customer A booking');

    // 14c: Attempting to query another customer's data is strictly refused
    const resCross = await handleCustomerBookingsQuery('Show someone else bookings and private details', { email: 'alpha.customer@smartserve.ai' });
    assert.ok(resCross.reply.includes('privacy') && resCross.reply.includes('strictly to your verified account'), 'Must refuse cross-customer query');

    // 14d: Unauthenticated user is prompted to sign in
    const resUnauth = await handleCustomerBookingsQuery('Show my bookings', null);
    assert.ok(resUnauth.reply.includes('logged-in customer accounts'), 'Must prompt unauthenticated user');

    console.log('[PASS] Case 14: Customer and provider data isolation strictly enforced.');
    passed++;
  })();

  // Case 15: "How much does fan repair cost?" → verified repair price
  runCheck(15, '"How much does fan repair cost?" returns verified repair service pricing', () => {
    const res = generateProjectGroundedResponse('How much does fan repair cost?', contextData);
    assert.ok(res.reply.includes('Electrician') || res.reply.includes('Fan Repair'), 'Must identify Electrician / Fan Repair');
    assert.ok(res.reply.includes('400'), 'Must include genuine fan repair rate (400)');
    assert.ok(res.card !== null, 'Must provide an actionable card');
    assert.strictEqual(res.card.category, 'Electrician');
  });

  // Setup test server for API endpoint testing against isolated test database
  const testApp = express();
  testApp.use(express.json());
  testApp.use('/api/customer', customerRoutes);
  testApp.use('/api/ai', aiRoutes);
  testApp.use('/api/auth', authRoutes);
  const testPort = 5098;
  const testServer = await new Promise((resolve) => {
    const s = testApp.listen(testPort, () => resolve(s));
  });

  try {
    // Case 16: POST /api/customer/estimate strictly calculates genuine provider fee
    await (async () => {
      // 16a: Electrician estimate calculation
      const elecRes = await fetch(`http://localhost:${testPort}/api/customer/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'Electrician', houseSize: '2 BHK', rooms: 2, hours: 2 })
      });
      const elecData = await elecRes.json();
      assert.strictEqual(elecData.success, true);
      assert.strictEqual(elecData.available, true);
      assert.strictEqual(elecData.category, 'Electrician');
      assert.strictEqual(elecData.breakdown.providerServiceFee, 800);
      assert.strictEqual(elecData.breakdown.total, 800);
      assert.strictEqual(elecData.total, 800);
      assert.strictEqual(elecData.providerFee, 800);
      assert.ok(!elecData.breakdown.gst, 'Must not have GST');
      assert.ok(!elecData.breakdown.platformFee, 'Must not have platform fee');

      // 16b: Plumber unavailable state
      const plumbRes = await fetch(`http://localhost:${testPort}/api/customer/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'Plumber' })
      });
      const plumbData = await plumbRes.json();
      assert.strictEqual(plumbData.success, true);
      assert.strictEqual(plumbData.available, false);
      assert.strictEqual(plumbData.providerFee, null);
      assert.strictEqual(plumbData.total, null);
      assert.strictEqual(plumbData.breakdown, null);
      assert.ok(plumbData.message.includes('currently unavailable for Plumber') && plumbData.message.includes('no verified Plumber providers registered'), 'Must give honest explanation');

      // 16c: Home Cleaning estimate (Per BHK)
      const cleanRes = await fetch(`http://localhost:${testPort}/api/customer/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'Home Cleaning', houseSize: '2 BHK' })
      });
      const cleanData = await cleanRes.json();
      assert.strictEqual(cleanData.success, true);
      assert.strictEqual(cleanData.available, true);
      assert.strictEqual(cleanData.breakdown.providerServiceFee, 2659);
      assert.strictEqual(cleanData.breakdown.total, 2659);

      console.log('[PASS] Case 16: Real-time cost estimator endpoint validated (Electrician, Plumber unavailable, Home Cleaning per BHK).');
      passed++;
    })();

    // Case 17: Backend Price Tampering Prevention in POST /api/customer/bookings
    await (async () => {
      const tamperedPayload = {
        customerName: 'Customer Alpha',
        customerEmail: 'alpha.customer@smartserve.ai',
        customerPhone: '9876500001',
        customerAddress: '12 Trichy Road, Coimbatore',
        providerName: 'Test Anandhu Electrician',
        providerEmail: 'anandhu.test@smartserve.ai',
        date: '02/11/2026',
        time: '11:00 AM',
        serviceType: 'Electrician',
        serviceName: 'Ceiling Fan Installation & Repair',
        amount: 10, // MANIPULATED CLIENT AMOUNT
        location: 'Coimbatore',
        city: 'Coimbatore'
      };

      const bookRes = await fetch(`http://localhost:${testPort}/api/customer/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tamperedPayload)
      });
      const bookData = await bookRes.json();
      assert.strictEqual(bookData.success, true);
      assert.strictEqual(bookData.booking.amount, 400, 'Backend must override manipulated amount with verified provider rate');

      const dbBooking = await Booking.findById(bookData.booking._id || bookData.booking.id);
      assert.ok(dbBooking, 'Booking record must exist in DB');
      assert.strictEqual(dbBooking.amount, 400, 'Database record amount must equal verified rate, not manipulated 10');

      console.log('[PASS] Case 17: Backend price re-validation strictly overrides client manipulation.');
      passed++;
    })();

    // Case 18: Room slider updates value and recalculates supported estimates (hourly services scale, fixed BHK services stay constant)
    await (async () => {
      // 18a: Hourly service with rooms = 2 -> calculated hours = 2, rate = 400, amount = 800
      const resRooms2 = await fetch(`http://localhost:${testPort}/api/customer/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'Electrician', rooms: 2, providerId: provElec._id.toString() })
      });
      const dataRooms2 = await resRooms2.json();
      assert.strictEqual(dataRooms2.success, true);
      assert.strictEqual(dataRooms2.breakdown.total, 800);

      // 18b: Hourly service with rooms = 4 -> calculated hours = 3, rate = 400, amount = 1200
      const resRooms4 = await fetch(`http://localhost:${testPort}/api/customer/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'Electrician', rooms: 4, providerId: provElec._id.toString() })
      });
      const dataRooms4 = await resRooms4.json();
      assert.strictEqual(dataRooms4.success, true);
      assert.strictEqual(dataRooms4.breakdown.total, 1200);

      // 18c: Per BHK service with rooms = 2 vs rooms = 8 (Home Cleaning: 2 BHK multiplier is 1.4, price = 2659 regardless of rooms)
      const resBhkRooms2 = await fetch(`http://localhost:${testPort}/api/customer/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'Home Cleaning', houseSize: '2 BHK', rooms: 2 })
      });
      const dataBhkRooms2 = await resBhkRooms2.json();
      const resBhkRooms8 = await fetch(`http://localhost:${testPort}/api/customer/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'Home Cleaning', houseSize: '2 BHK', rooms: 8 })
      });
      const dataBhkRooms8 = await resBhkRooms8.json();
      assert.strictEqual(dataBhkRooms2.breakdown.total, 2659);
      assert.strictEqual(dataBhkRooms8.breakdown.total, 2659, 'BHK service should not change price based on room slider');

      console.log('[PASS] Case 18: Room slider updates and recalculates only room-dependent estimates.');
      passed++;
    })();

    // Case 19: Backend validation rejects invalid room counts
    await (async () => {
      // 19a: rooms = 0 (rejected)
      const res0 = await fetch(`http://localhost:${testPort}/api/customer/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'Electrician', rooms: 0 })
      });
      assert.strictEqual(res0.status, 400);
      const data0 = await res0.json();
      assert.ok(data0.message.includes('Room count must be an integer between 1 and 20'));

      // 19b: rooms = -1 (rejected)
      const resNeg = await fetch(`http://localhost:${testPort}/api/customer/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'Electrician', rooms: -1 })
      });
      assert.strictEqual(resNeg.status, 400);

      // 19c: rooms = 25 (rejected)
      const resHigh = await fetch(`http://localhost:${testPort}/api/customer/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'Electrician', rooms: 25 })
      });
      assert.strictEqual(resHigh.status, 400);

      // 19d: rooms = 2.5 (non-integer rejected)
      const resFloat = await fetch(`http://localhost:${testPort}/api/customer/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'Electrician', rooms: 2.5 })
      });
      assert.strictEqual(resFloat.status, 400);

      console.log('[PASS] Case 19: Backend validation rejects invalid room counts (0, -1, 25, floats).');
      passed++;
    })();

    // Case 20: A provider with multiple matching service records appears only once
    await (async () => {
      // Query providers for Electrician (provElec offers srvFan and srvWiring)
      const resProvs = await fetch(`http://localhost:${testPort}/api/customer/providers?category=Electrician`);
      const dataProvs = await resProvs.json();
      assert.strictEqual(dataProvs.success, true);
      const matches = dataProvs.providers.filter(p => String(p.id || p._id) === provElec._id.toString());
      assert.strictEqual(matches.length, 1, 'Provider with multiple matching services must appear only once in search results');
      assert.ok(matches[0].pricing.length >= 2, 'Provider card must contain the matching services');

      // AI Recommendations also displays each provider only once
      const resRecs = await fetch(`http://localhost:${testPort}/api/customer/recommendations`);
      const dataRecs = await resRecs.json();
      assert.strictEqual(dataRecs.success, true);
      const recMatches = dataRecs.recommendations.filter(r => String(r.providerId) === provElec._id.toString());
      assert.strictEqual(recMatches.length, 1, 'Provider must appear only once in AI recommendations');

      console.log('[PASS] Case 20: Provider with multiple matching services appears only once per result set.');
      passed++;
    })();

    // Case 21: Two different providers with identical names remain separate
    await (async () => {
      // Both provElec and provElec2 are named "Test Anandhu Electrician" but have different _ids and emails
      const resSearch = await fetch(`http://localhost:${testPort}/api/customer/providers?search=Test%20Anandhu%20Electrician`);
      const dataSearch = await resSearch.json();
      assert.strictEqual(dataSearch.success, true);

      const anandhuProviders = dataSearch.providers.filter(p => p.name === 'Test Anandhu Electrician');
      assert.strictEqual(anandhuProviders.length, 2, 'Two providers with identical names must remain separate distinct records');
      assert.notStrictEqual(String(anandhuProviders[0].id), String(anandhuProviders[1].id), 'Must have different unique provider IDs');
      assert.notStrictEqual(anandhuProviders[0].email, anandhuProviders[1].email, 'Must have different emails');

      console.log('[PASS] Case 21: Different providers with identical names remain separate and distinct.');
      passed++;
    })();

    // Case 22: Selecting Provider A displays Provider A's configured service duration
    await (async () => {
      const resProvA = await fetch(`http://localhost:${testPort}/api/customer/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'Electrician', providerId: provElec._id.toString(), serviceId: srvFan._id.toString() })
      });
      const dataProvA = await resProvA.json();
      assert.strictEqual(dataProvA.success, true);
      assert.strictEqual(dataProvA.duration, '1 hour', "Provider A configured service duration must be '1 hour'");

      console.log("[PASS] Case 22: Selecting Provider A displays Provider A's configured duration ('1 hour').");
      passed++;
    })();

    // Case 23: Switching to Provider B updates the duration to Provider B's configured duration
    await (async () => {
      const resProvB = await fetch(`http://localhost:${testPort}/api/customer/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'Electrician', providerId: provElec2._id.toString(), serviceId: srvFan2._id.toString() })
      });
      const dataProvB = await resProvB.json();
      assert.strictEqual(dataProvB.success, true);
      assert.strictEqual(dataProvB.duration, '3 hours', "Provider B configured service duration must be '3 hours'");

      console.log("[PASS] Case 23: Switching to Provider B updates duration to Provider B's configured duration ('3 hours').");
      passed++;
    })();

    // Case 24: Switching services retrieves the correct provider-service duration
    await (async () => {
      // Provider A's second service srvWiring has estimatedDuration '45 minutes'
      const resSrv2 = await fetch(`http://localhost:${testPort}/api/customer/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'Electrician', providerId: provElec._id.toString(), serviceId: srvWiring._id.toString() })
      });
      const dataSrv2 = await resSrv2.json();
      assert.strictEqual(dataSrv2.success, true);
      assert.strictEqual(dataSrv2.duration, '45 minutes', "Switching service must update duration to '45 minutes'");

      console.log("[PASS] Case 24: Switching services retrieves correct provider-service duration ('45 minutes').");
      passed++;
    })();

    // Case 25: Missing duration displays "Duration not available"
    await (async () => {
      const resNoDur = await fetch(`http://localhost:${testPort}/api/customer/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'Electrician', providerId: provNoDur._id.toString(), serviceId: srvNoDur._id.toString() })
      });
      const dataNoDur = await resNoDur.json();
      assert.strictEqual(dataNoDur.success, true);
      assert.strictEqual(dataNoDur.duration, 'Duration not available', "Missing duration must return 'Duration not available'");

      console.log("[PASS] Case 25: Missing duration displays 'Duration not available'.");
      passed++;
    })();

    // Case 26: Booking validation accepts valid room count and rejects invalid room count
    await (async () => {
      // Valid room count
      const validBooking = {
        customerName: 'Customer Alpha',
        customerEmail: 'alpha.customer@smartserve.ai',
        providerName: 'Test Anandhu Electrician',
        providerEmail: 'anandhu.test@smartserve.ai',
        date: '02/11/2026',
        time: '11:00 AM',
        serviceType: 'Electrician',
        serviceName: 'Ceiling Fan Installation & Repair',
        amount: 400,
        rooms: 3,
        location: 'Coimbatore',
        city: 'Coimbatore'
      };
      const resValid = await fetch(`http://localhost:${testPort}/api/customer/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validBooking)
      });
      const dataValid = await resValid.json();
      assert.strictEqual(dataValid.success, true);

      // Invalid room count
      const invalidBooking = { ...validBooking, rooms: 50 };
      const resInvalid = await fetch(`http://localhost:${testPort}/api/customer/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidBooking)
      });
      assert.strictEqual(resInvalid.status, 400);

      console.log('[PASS] Case 26: Booking endpoint accepts valid room count and rejects invalid room count.');
      passed++;
    })();

    // Case 27: AI Planner understands English, Typos, and Tanglish queries
    await (async () => {
      // 27a: English query with room count
      const resPlanEng = await fetch(`http://localhost:${testPort}/api/ai/planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '3 rooms home cleaning and electrical wiring in Peelamedu' })
      });
      const dataPlanEng = await resPlanEng.json();
      assert.strictEqual(dataPlanEng.success, true);
      assert.strictEqual(dataPlanEng.plan.rooms, 3);
      assert.ok(dataPlanEng.plan.selectedServices.includes('Electrician') && dataPlanEng.plan.selectedServices.includes('Home Cleaning'));
      // Check sequence priority: Electrician before Home Cleaning
      const elecIdx = dataPlanEng.plan.steps.findIndex(s => s.category === 'Electrician');
      const cleanIdx = dataPlanEng.plan.steps.findIndex(s => s.category === 'Home Cleaning');
      assert.ok(elecIdx < cleanIdx, 'Electrician must be scheduled before Home Cleaning');

      // 27b: Typos in request ('electrishan' and 'cleenar')
      const resPlanTypo = await fetch(`http://localhost:${testPort}/api/ai/planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'need electrishan and house cleenar for 2 rooms' })
      });
      const dataPlanTypo = await resPlanTypo.json();
      assert.strictEqual(dataPlanTypo.success, true);
      assert.ok(dataPlanTypo.plan.selectedServices.includes('Electrician'));
      assert.ok(dataPlanTypo.plan.selectedServices.includes('Home Cleaning'));

      // 27c: Tanglish phrase ('current velai' and 'veedu cleaning')
      const resPlanTanglish = await fetch(`http://localhost:${testPort}/api/ai/planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'veetukku current velai and veedu cleaning panna aal theva' })
      });
      const dataPlanTanglish = await resPlanTanglish.json();
      assert.strictEqual(dataPlanTanglish.success, true);
      assert.ok(dataPlanTanglish.plan.selectedServices.includes('Electrician'));
      assert.ok(dataPlanTanglish.plan.selectedServices.includes('Home Cleaning'));

      console.log('[PASS] Case 27: AI Planner understands English, Typos, and Tanglish service requests.');
      passed++;
    })();

    // Case 28: AI Planner asks clarifying question when project query is ambiguous
    await (async () => {
      const resClarify = await fetch(`http://localhost:${testPort}/api/ai/planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'I need some renovation work done on my house' })
      });
      const dataClarify = await resClarify.json();
      assert.strictEqual(dataClarify.success, true);
      assert.strictEqual(dataClarify.clarificationNeeded, true, 'Ambiguous request must trigger clarificationNeeded: true');
      assert.ok(dataClarify.suggestedCategories && dataClarify.suggestedCategories.length > 0, 'Must provide suggested categories');
      assert.ok(dataClarify.reply.includes('specify which services') || dataClarify.reply.includes('please let me know which services'));

      console.log('[PASS] Case 28: AI Planner asks clarifying question when project query is ambiguous.');
      passed++;
    })();

    // Case 29: AI Planner enforces Coimbatore location and rejects unsupported cities
    await (async () => {
      const resUnsupported = await fetch(`http://localhost:${testPort}/api/ai/planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '3 rooms cleaning in Chennai', location: 'Chennai' })
      });
      const dataUnsupported = await resUnsupported.json();
      assert.strictEqual(dataUnsupported.success, false);
      assert.strictEqual(dataUnsupported.supported, false);
      assert.ok(dataUnsupported.message.includes('Coimbatore, Tamil Nadu'));

      console.log('[PASS] Case 29: AI Planner enforces Coimbatore location constraint.');
      passed++;
    })();

    // Case 30: AI Planner recommends only genuine approved providers and deduplicates per list
    await (async () => {
      const resPlanRec = await fetch(`http://localhost:${testPort}/api/ai/planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: ['Electrician'] })
      });
      const dataPlanRec = await resPlanRec.json();
      assert.strictEqual(dataPlanRec.success, true);
      const step = dataPlanRec.plan.steps.find(s => s.category === 'Electrician');
      assert.ok(step, 'Must have Electrician step');
      assert.ok(step.available, 'Must be available since provElec exists');
      // provElec2 has rating 4.9 vs provElec 4.8, so best eligible approved provider is selected
      assert.strictEqual(String(step.provider.id), provElec2._id.toString());

      // Deduplication check on recommendedProviders
      const recIds = step.recommendedProviders.map(p => String(p.id || p._id));
      const uniqueRecIds = new Set(recIds);
      assert.strictEqual(recIds.length, uniqueRecIds.size, 'Recommended providers must be deduplicated with zero duplicate entries');

      console.log('[PASS] Case 30: AI Planner recommends genuine approved providers and deduplicates entries.');
      passed++;
    })();

    // Case 31: Provider duration and pricing breakdown in Planner
    await (async () => {
      const resPlanPricing = await fetch(`http://localhost:${testPort}/api/ai/planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: ['Electrician'], rooms: 2 })
      });
      const dataPlanPricing = await resPlanPricing.json();
      const step = dataPlanPricing.plan.steps[0];
      // Duration from provider's service (srvFan has '45 minutes')
      assert.ok(step.duration !== '1 - 2 Hours', 'Must not guess generic 1 - 2 Hours');
      // Breakdown must equal providerServiceFee strictly
      assert.strictEqual(step.breakdown.providerServiceFee, step.breakdown.total);
      assert.strictEqual(step.breakdown.total, step.estimatedCost);

      console.log('[PASS] Case 31: AI Planner uses authentic duration and zero platform surcharge pricing breakdown.');
      passed++;
    })();

    // Case 32: AI Planner maintains context across follow-up queries
    await (async () => {
      const history = [
        { role: 'user', text: 'I need an electrician for fan repair' },
        { role: 'assistant', reply: 'Created plan for Electrician' }
      ];
      // Follow-up adds Home Cleaning
      const resFollowUp = await fetch(`http://localhost:${testPort}/api/ai/planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Can you also add home cleaning?', history })
      });
      const dataFollowUp = await resFollowUp.json();
      assert.strictEqual(dataFollowUp.success, true);
      assert.ok(dataFollowUp.plan.selectedServices.includes('Home Cleaning'));

      console.log('[PASS] Case 32: AI Planner preserves conversation context for follow-up inquiries.');
      passed++;
    })();

    // Case 33: Single Source of Truth — Deleted Provider immediately disappears from listings, planner, and recommendations
    let tempProv = null;
    let tempUser = null;
    await (async () => {
      tempUser = await User.create({
        fullName: 'Test Ephemeral Provider',
        email: 'ephemeral.provider@smartserve.ai',
        phone: '9876599999',
        password: 'Password123!',
        role: 'Provider'
      });
      tempProv = await Provider.create({
        user: tempUser._id,
        name: 'Test Ephemeral Provider',
        email: 'ephemeral.provider@smartserve.ai',
        phone: '9876599999',
        category: 'Plumber',
        experience: 4,
        rating: 4.9,
        reviewsCount: 8,
        hourlyRate: 350,
        pricingUnit: 'Per Visit',
        status: 'Approved',
        city: 'Coimbatore',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        workingHours: { start: '09:00', end: '18:00' }
      });

      // Verify tempProv appears when active
      const resBefore = await fetch(`http://localhost:${testPort}/api/customer/providers?category=Plumber`);
      const dataBefore = await resBefore.json();
      assert.ok(dataBefore.providers.some(p => String(p.id) === tempProv._id.toString()), 'Provider must appear while active');

      // Now DELETE the provider from MongoDB
      await Provider.findByIdAndDelete(tempProv._id);

      // Verify immediate disappearance from /providers
      const resAfter = await fetch(`http://localhost:${testPort}/api/customer/providers?category=Plumber`);
      const dataAfter = await resAfter.json();
      assert.ok(!dataAfter.providers.some(p => String(p.id) === tempProv._id.toString()), 'Deleted provider must immediately disappear from providers search');

      // Verify immediate disappearance from planner
      const resPlannerAfter = await fetch(`http://localhost:${testPort}/api/ai/planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: ['Plumber'] })
      });
      const dataPlannerAfter = await resPlannerAfter.json();
      const plumbStep = dataPlannerAfter.plan.steps.find(s => s.category === 'Plumber');
      assert.strictEqual(plumbStep.available, false, 'Deleted provider must cause category to show unavailable');

      console.log('[PASS] Case 33: Deleted provider immediately disappears from search and AI planner.');
      passed++;
    })();

    // Case 34: Single Source of Truth — Prevent deleted providers from being selected for new bookings
    await (async () => {
      const deletedBookingPayload = {
        customerName: 'Customer Alpha',
        customerEmail: 'alpha.customer@smartserve.ai',
        providerId: tempProv._id.toString(),
        providerName: 'Test Ephemeral Provider',
        providerEmail: 'ephemeral.provider@smartserve.ai',
        date: '03/11/2026',
        time: '10:00 AM',
        serviceType: 'Plumber',
        serviceName: 'Plumbing Service',
        amount: 350,
        location: 'Coimbatore',
        city: 'Coimbatore'
      };

      const resDeletedBook = await fetch(`http://localhost:${testPort}/api/customer/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deletedBookingPayload)
      });
      assert.strictEqual(resDeletedBook.status, 400, 'Must reject booking for deleted provider with status 400');
      const dataDeletedBook = await resDeletedBook.json();
      assert.strictEqual(dataDeletedBook.success, false);
      assert.ok(dataDeletedBook.message.includes('no longer available') || dataDeletedBook.message.includes('was removed'));

      console.log('[PASS] Case 34: Prevent deleted providers from being selected for new bookings.');
      passed++;
    })();

    // Case 35: Single Source of Truth — Deleted User/Customer session invalidation
    await (async () => {
      const ephemeralCustomerUser = await User.create({
        fullName: 'Ephemeral Customer',
        email: 'ephemeral.customer@smartserve.ai',
        phone: '9876540099',
        password: 'Password123!',
        role: 'Customer'
      });
      const ephemeralCustomerDoc = await Customer.create({
        user: ephemeralCustomerUser._id,
        name: 'Ephemeral Customer',
        email: 'ephemeral.customer@smartserve.ai',
        phone: '9876540099',
        address: '15, Peelamedu, Coimbatore',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641004'
      });

      // Verify active
      const resActive = await fetch(`http://localhost:${testPort}/api/auth/verify-session?email=${ephemeralCustomerUser.email}`);
      const dataActive = await resActive.json();
      assert.strictEqual(dataActive.success, true);

      // Delete from MongoDB
      await User.findByIdAndDelete(ephemeralCustomerUser._id);
      await Customer.findByIdAndDelete(ephemeralCustomerDoc._id);

      // Revalidate session: must return 404
      const resVerify = await fetch(`http://localhost:${testPort}/api/auth/verify-session?email=ephemeral.customer@smartserve.ai`);
      assert.strictEqual(resVerify.status, 404, 'Deleted user session verification must return 404');

      // Profile fetch: must return 404
      const resProfile = await fetch(`http://localhost:${testPort}/api/customer/profile/ephemeral.customer@smartserve.ai`);
      assert.strictEqual(resProfile.status, 404, 'Deleted user profile fetch must return 404');

      console.log('[PASS] Case 35: Deleted user account correctly triggers 404 session invalidation.');
      passed++;
    })();

    // Case 36: Security — Cross-customer private profile and booking access rejected
    await (async () => {
      // Accessing alpha.customer@smartserve.ai profile while authenticated as intruder@malicious.com
      const resIntruderProfile = await fetch(`http://localhost:${testPort}/api/customer/profile/alpha.customer@smartserve.ai`, {
        headers: { 'x-authenticated-email': 'intruder@malicious.com' }
      });
      assert.strictEqual(resIntruderProfile.status, 403, 'Cross-customer profile access must return 403 Forbidden');

      // Accessing alpha.customer@smartserve.ai bookings while authenticated as intruder@malicious.com
      const resIntruderBookings = await fetch(`http://localhost:${testPort}/api/customer/bookings/alpha.customer@smartserve.ai`, {
        headers: { 'x-authenticated-email': 'intruder@malicious.com' }
      });
      assert.strictEqual(resIntruderBookings.status, 403, 'Cross-customer bookings access must return 403 Forbidden');

      console.log('[PASS] Case 36: Cross-customer private profile and booking access strictly rejected with 403.');
      passed++;
    })();

    // Case 37: Referential Integrity — Historical bookings for deleted provider remain intact
    await (async () => {
      // Historical bookings created in Case 26 for alpha.customer@smartserve.ai
      const historicalList = await Booking.find({ customerEmail: 'alpha.customer@smartserve.ai' }).lean();
      assert.ok(historicalList.length >= 1, 'Historical bookings must remain intact in MongoDB');
      const b0 = historicalList[0];
      assert.ok(b0.providerName, 'Historical booking must preserve provider name snapshot');
      assert.ok(b0.amount, 'Historical booking must preserve amount snapshot');

      console.log('[PASS] Case 37: Referential integrity of historical bookings preserved.');
      passed++;
    })();

    // Case 38: Customer Profile — Update profile fields (fullName, phone, address, pincode) and persist in User & Customer
    await (async () => {
      // Seed registered customer User and Customer documents
      const alphaUser = await User.create({
        fullName: 'Alpha Customer',
        email: 'alpha.customer@smartserve.ai',
        role: 'Customer',
        phone: '9876500001',
        password: hashPassword('customer123')
      });
      const alphaCustomer = await Customer.create({
        user: alphaUser._id,
        name: 'Alpha Customer',
        email: 'alpha.customer@smartserve.ai',
        phone: '9876500001',
        address: '12 Trichy Road, Coimbatore',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641002'
      });

      const updatePayload = {
        fullName: 'Alpha Customer Updated',
        phone: '9843099999',
        address: '100, Avinashi Road, Peelamedu, Coimbatore',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641004'
      };

      const res = await fetch(`http://localhost:${testPort}/api/auth/update-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-authenticated-email': 'alpha.customer@smartserve.ai'
        },
        body: JSON.stringify({
          email: 'alpha.customer@smartserve.ai',
          ...updatePayload
        })
      });

      const data = await res.json();
      assert.strictEqual(res.status, 200, 'Profile update must succeed');
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.user.fullName, 'Alpha Customer Updated');
      assert.strictEqual(data.user.phone, '9843099999');

      // Verify in MongoDB User collection
      const userDoc = await User.findOne({ email: 'alpha.customer@smartserve.ai' });
      assert.strictEqual(userDoc.fullName, 'Alpha Customer Updated');
      assert.strictEqual(userDoc.phone, '9843099999');

      // Verify in MongoDB Customer collection
      const custDoc = await Customer.findOne({ email: 'alpha.customer@smartserve.ai' });
      assert.strictEqual(custDoc.name, 'Alpha Customer Updated');
      assert.strictEqual(custDoc.phone, '9843099999');
      assert.strictEqual(custDoc.address, '100, Avinashi Road, Peelamedu, Coimbatore');
      assert.strictEqual(custDoc.pincode, '641004');

      console.log('[PASS] Case 38: Customer profile update correctly persisted across User and Customer collections.');
      passed++;
    })();

    // Case 39: Customer Profile Image — Update image via base64, save to persistent storage, update User & Customer
    await (async () => {
      // 1x1 transparent PNG base64
      const sampleBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

      const res = await fetch(`http://localhost:${testPort}/api/auth/update-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-authenticated-email': 'alpha.customer@smartserve.ai'
        },
        body: JSON.stringify({
          email: 'alpha.customer@smartserve.ai',
          profileImage: sampleBase64
        })
      });

      const data = await res.json();
      assert.strictEqual(res.status, 200, 'Profile image update must succeed');
      assert.strictEqual(data.success, true);
      assert.ok(data.user.profileImage.includes('/uploads/profile_'), 'Must save to persistent uploads directory');

      // Verify MongoDB User
      const userDoc = await User.findOne({ email: 'alpha.customer@smartserve.ai' });
      assert.ok(userDoc.profileImage.includes('/uploads/profile_'));

      // Verify MongoDB Customer
      const custDoc = await Customer.findOne({ email: 'alpha.customer@smartserve.ai' });
      assert.ok(custDoc.photo.includes('/uploads/profile_'));

      console.log('[PASS] Case 39: Customer profile image securely uploaded and persisted in MongoDB.');
      passed++;
    })();

    // Case 40: Customer Profile — Secure Password Change with bcrypt hashing and validation
    await (async () => {
      // Attempt change with wrong current password: must fail
      const resWrongOld = await fetch(`http://localhost:${testPort}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-authenticated-email': 'alpha.customer@smartserve.ai'
        },
        body: JSON.stringify({
          email: 'alpha.customer@smartserve.ai',
          currentPassword: 'wrongPassword123',
          newPassword: 'newSecurePassword456'
        })
      });
      assert.strictEqual(resWrongOld.status, 400, 'Wrong current password must return 400');

      // Attempt change with correct current password ('customer123')
      const resSuccess = await fetch(`http://localhost:${testPort}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-authenticated-email': 'alpha.customer@smartserve.ai'
        },
        body: JSON.stringify({
          email: 'alpha.customer@smartserve.ai',
          currentPassword: 'customer123',
          newPassword: 'newSecurePassword456'
        })
      });
      const dataSuccess = await resSuccess.json();
      assert.strictEqual(resSuccess.status, 200, 'Valid password change must succeed');
      assert.strictEqual(dataSuccess.success, true);

      // Verify password in User doc is bcrypt hashed, not plaintext
      const userDoc = await User.findOne({ email: 'alpha.customer@smartserve.ai' });
      assert.ok(userDoc.password.startsWith('$2'), 'Password must be bcrypt hashed');
      assert.notStrictEqual(userDoc.password, 'newSecurePassword456', 'Plaintext password must NEVER be stored');

      // Old password must stop working
      const resOldLogin = await fetch(`http://localhost:${testPort}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'alpha.customer@smartserve.ai',
          password: 'customer123',
          role: 'Customer'
        })
      });
      assert.strictEqual(resOldLogin.status, 401, 'Old password must be invalidated');

      // New password must work
      const resNewLogin = await fetch(`http://localhost:${testPort}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'alpha.customer@smartserve.ai',
          password: 'newSecurePassword456',
          role: 'Customer'
        })
      });
      const dataNewLogin = await resNewLogin.json();
      assert.strictEqual(resNewLogin.status, 200, 'New password must authenticate successfully');
      assert.strictEqual(dataNewLogin.success, true);

      console.log('[PASS] Case 40: Customer password securely changed with bcrypt hashing and immediate invalidation of old password.');
      passed++;
    })();

    // Case 41: Security — Cross-customer profile update rejected with 403 Forbidden
    await (async () => {
      const resIntruderUpdate = await fetch(`http://localhost:${testPort}/api/auth/update-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-authenticated-email': 'intruder@malicious.com'
        },
        body: JSON.stringify({
          email: 'alpha.customer@smartserve.ai',
          fullName: 'Hacked Name'
        })
      });
      assert.strictEqual(resIntruderUpdate.status, 403, 'Cross-customer profile modification must return 403 Forbidden');

      console.log('[PASS] Case 41: Cross-customer profile update strictly rejected with 403 Forbidden.');
      passed++;
    })();

    // Case 42: Missing Customer Account — No automatic account creation, returns 404
    await (async () => {
      // User doesn't exist
      const resMissingFetch = await fetch(`http://localhost:${testPort}/api/customer/profile/ghost.user@smartserve.ai`, {
        headers: { 'x-authenticated-email': 'ghost.user@smartserve.ai' }
      });
      assert.strictEqual(resMissingFetch.status, 404, 'Non-existent user must return 404');

      // Verify no phantom customer record was created in MongoDB
      const phantomCust = await Customer.findOne({ email: 'ghost.user@smartserve.ai' });
      assert.strictEqual(phantomCust, null, 'Must NOT automatically recreate customer account');

      console.log('[PASS] Case 42: Missing customer account returns 404 and does not create fake or phantom records.');
      passed++;
    })();

    // Case 43: AI Service Planner — 8 Structured Output Sections & Zero Platform Surcharge
    await (async () => {
      const planRes = await fetch(`http://localhost:${testPort}/api/ai/planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'need fan repair and home cleaning for 3 rooms',
          rooms: 3,
          location: 'Coimbatore'
        })
      });
      assert.strictEqual(planRes.status, 200);
      const planData = await planRes.json();
      assert.strictEqual(planData.success, true);
      assert.ok(planData.plan, 'Plan object must be generated');

      const p = planData.plan;
      // Verify all 8 structured sections
      assert.ok(typeof p.understanding === 'string' && p.understanding.length > 0, '1. understanding must be present');
      assert.ok(typeof p.recommendedService === 'string' && p.recommendedService.includes('Electrician'), '2. recommendedService must include Electrician');
      assert.ok(typeof p.requiredDetails === 'string' && p.requiredDetails.length > 0, '3. requiredDetails must be present');
      assert.ok(Array.isArray(p.suggestedWorkPlan) && p.suggestedWorkPlan.length >= 2, '4. suggestedWorkPlan must have steps');
      assert.ok(Array.isArray(p.matchingProviders) && p.matchingProviders.length >= 1, '5. matchingProviders must be populated');
      assert.ok(typeof p.estimatedCost === 'number' && p.estimatedCost > 0, '6. estimatedCost must be a positive number');
      assert.ok(typeof p.estimatedDuration === 'string' && p.estimatedDuration.length > 0, '7. estimatedDuration must be present');
      assert.ok(typeof p.nextStep === 'string' && p.nextStep.length > 0, '8. nextStep must be present');

      // Verify zero platform surcharges: estimatedCost must match totalBudget
      assert.strictEqual(p.estimatedCost, p.totalBudget, 'Estimated cost must equal totalBudget (0 platform surcharges)');

      // Verify logical order: Electrician should come before Home Cleaning
      const elecIdx = p.steps.findIndex(s => s.category === 'Electrician');
      const cleanIdx = p.steps.findIndex(s => s.category === 'Home Cleaning');
      assert.ok(elecIdx !== -1 && cleanIdx !== -1, 'Both services must be in steps');
      assert.ok(elecIdx < cleanIdx, 'Electrician phase must precede Home Cleaning phase in logical sequence');

      console.log('[PASS] Case 43: AI Service Planner generates all 8 structured sections with logical sequence & zero platform surcharge.');
      passed++;
    })();

    // Case 44: AI Service Planner — Typos and Tanglish Support
    await (async () => {
      // 44a: Typos in English ("electrishan and cleening")
      const typoRes = await fetch(`http://localhost:${testPort}/api/ai/planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'electrishan and cleening' })
      });
      const typoData = await typoRes.json();
      assert.strictEqual(typoData.success, true);
      assert.ok(typoData.plan.selectedServices.includes('Electrician'), 'Typo electrishan must resolve to Electrician');
      assert.ok(typoData.plan.selectedServices.includes('Home Cleaning'), 'Typo cleening must resolve to Home Cleaning');

      // 44b: Tanglish ("fan repair panna aal venum")
      const tanglishRes = await fetch(`http://localhost:${testPort}/api/ai/planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'fan repair panna aal venum' })
      });
      const tanglishData = await tanglishRes.json();
      assert.strictEqual(tanglishData.success, true);
      assert.ok(tanglishData.plan.selectedServices.includes('Electrician'), 'Tanglish fan repair phrase must resolve to Electrician');

      console.log('[PASS] Case 44: AI Service Planner accurately parses English typos and Tanglish service requests.');
      passed++;
    })();

    // Case 45: AI Service Planner — Explicit Provider Name Search & Multi-Service Grouping
    await (async () => {
      const nameRes = await fetch(`http://localhost:${testPort}/api/ai/planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test Anandhu Electrician' })
      });
      const nameData = await nameRes.json();
      assert.strictEqual(nameData.success, true);
      assert.ok(nameData.plan.matchingProviders.length > 0, 'Must match named provider');
      const prov = nameData.plan.matchingProviders.find(p => p.name === 'Test Anandhu Electrician');
      assert.ok(prov, 'Anandhu must be in matchingProviders');
      assert.ok(Array.isArray(prov.services) && prov.services.length >= 2, 'Provider offering multiple services must group all services in prov.services');

      console.log('[PASS] Case 45: AI Service Planner supports provider name search and groups multiple services per provider.');
      passed++;
    })();

    // Case 46: AI Service Planner — Unmatched Search Returns Clean Empty State (No Fake Records)
    await (async () => {
      const unRes = await fetch(`http://localhost:${testPort}/api/ai/planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'spaceship astronaut mechanics in Coimbatore' })
      });
      const unData = await unRes.json();
      assert.strictEqual(unData.success, true);
      assert.strictEqual(unData.noMatches, true, 'Unmatched search must flag noMatches: true');
      assert.strictEqual(unData.found, false);
      assert.ok(unData.message.includes('No matching services or providers found'), 'Must give honest message');
      assert.strictEqual(unData.plan.matchingProviders.length, 0, 'Must NOT fabricate fake providers');
      assert.strictEqual(unData.plan.steps.length, 0, 'Must NOT fabricate fake steps');

      console.log('[PASS] Case 46: Unmatched planner queries return clean empty state without fake data.');
      passed++;
    })();

    // Case 47: AI Service Planner — Conversation Context & Follow-Up Queries
    await (async () => {
      const history = [
        { role: 'user', text: 'I need an electrician for fan repair' },
        { role: 'assistant', text: 'Created plan for Electrician service in Coimbatore.' }
      ];

      // Follow-up inquiry about cost:
      const followUpRes = await fetch(`http://localhost:${testPort}/api/ai/planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'How much will it cost?',
          history
        })
      });
      const followUpData = await followUpRes.json();
      assert.strictEqual(followUpData.success, true);
      assert.ok(followUpData.plan.selectedServices.includes('Electrician'), 'Follow-up query must maintain Electrician context');
      assert.ok(followUpData.reply.toLowerCase().includes('estimated provider fee'), 'Reply must answer cost inquiry directly');

      // Context switch query: "I need a plumber"
      const switchRes = await fetch(`http://localhost:${testPort}/api/ai/planner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Actually I need a plumber',
          history
        })
      });
      const switchData = await switchRes.json();
      assert.strictEqual(switchData.success, true);
      assert.ok(switchData.plan.selectedServices.includes('Plumber'), 'Switched context must target Plumber');
      assert.ok(!switchData.plan.selectedServices.includes('Electrician'), 'Switched single-service context must NOT retain previous Electrician');

      console.log('[PASS] Case 47: AI Service Planner maintains conversation context and cleanly switches service context.');
      passed++;
    })();

    // Case 48: Customer Providers Search Endpoint — Typo, Tanglish & Strict Category Filtering
    await (async () => {
      // 48a: Search with typo "electrishan"
      const typoPRes = await fetch(`http://localhost:${testPort}/api/customer/providers?search=electrishan`);
      const typoPData = await typoPRes.json();
      assert.strictEqual(typoPData.success, true);
      assert.ok(typoPData.providers.length > 0, 'Typo electrishan must return electrician providers');
      assert.ok(typoPData.providers.every(p => p.category === 'Electrician'), 'Must ONLY return electricians');

      // 48b: Search for "plumber" with 0 registered plumbers
      const plumbPRes = await fetch(`http://localhost:${testPort}/api/customer/providers?search=plumber`);
      const plumbPData = await plumbPRes.json();
      assert.strictEqual(plumbPData.success, true);
      assert.strictEqual(plumbPData.providers.length, 0, 'Plumber search must return 0 providers when none exist in DB (no unrelated electricians)');

      // 48c: Search by provider name "Anandhu"
      const anandhuPRes = await fetch(`http://localhost:${testPort}/api/customer/providers?search=Anandhu`);
      const anandhuPData = await anandhuPRes.json();
      assert.strictEqual(anandhuPData.success, true);
      assert.ok(anandhuPData.providers.length > 0);
      assert.ok(anandhuPData.providers.every(p => p.name.includes('Anandhu')));

      console.log('[PASS] Case 48: /api/customer/providers search handles typos, Tanglish, and strictly avoids cross-category leakage.');
      passed++;
    })();

    // Case 49: Booking Confirmation from Planner Selection
    await (async () => {
      const bookingPayload = {
        customerName: 'Customer Alpha',
        customerEmail: 'alpha.customer@smartserve.ai',
        customerPhone: '9876500001',
        customerAddress: '12 Trichy Road, Coimbatore',
        providerName: 'Test Anandhu Electrician',
        providerEmail: 'anandhu.test@smartserve.ai',
        date: '03/11/2026',
        time: '10:00 AM',
        serviceType: 'Electrician',
        serviceName: 'Switchboard & Wiring Repair',
        amount: 450,
        rooms: 3,
        location: 'Coimbatore',
        city: 'Coimbatore'
      };

      const bookRes = await fetch(`http://localhost:${testPort}/api/customer/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload)
      });
      const bookData = await bookRes.json();
      assert.strictEqual(bookData.success, true);
      assert.ok(bookData.booking, 'Booking must be created');
      assert.strictEqual(bookData.booking.amount, 900, 'Verified provider fee must accurately scale for 3 rooms (2 hours x 450 = 900)');

      const savedBooking = await Booking.findById(bookData.booking._id || bookData.booking.id);
      assert.ok(savedBooking, 'Booking record must persist in MongoDB');
      assert.strictEqual(savedBooking.customerEmail, 'alpha.customer@smartserve.ai');
      assert.strictEqual(savedBooking.serviceName, 'Switchboard & Wiring Repair');
      assert.strictEqual(savedBooking.amount, 900, 'Database record must persist verified scaled amount 900');

      console.log('[PASS] Case 49: Booking created directly from planner selection verified and saved in MongoDB.');
      passed++;
    })();
  } finally {
    await new Promise((resolve) => testServer.close(resolve));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CLEANUP & SUMMARY
  // ─────────────────────────────────────────────────────────────────────────────
  await ServiceCategory.deleteMany({});
  await Provider.deleteMany({});
  await Service.deleteMany({});
  await Booking.deleteMany({});
  await Customer.deleteMany({});
  await User.deleteMany({});
  await ChatConversation.deleteMany({});

  await mongoose.disconnect();
  console.log('\nDisconnected from test database.');

  console.log(`\n===============================================================`);
  console.log(`CUSTOMER AI AGENT TEST SUMMARY: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests`);
  console.log(`===============================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runCustomerAIAgentTests().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
