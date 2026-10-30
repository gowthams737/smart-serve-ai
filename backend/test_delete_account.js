import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Provider from './models/Provider.js';
import Service from './models/Service.js';
import Booking from './models/Booking.js';
import Customer from './models/Customer.js';

dotenv.config();

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path: path,
      method: method,
      headers: {
        ...(payload ? {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        } : {})
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function run() {
  console.log('=== STARTING TEST FOR PROVIDER ACCOUNT DELETION ===\n');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartserve';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB directly for state verification.\n');

  const ts = Date.now();
  const providerAEmail = `prov_del_a_${ts}@smartserve.ai`;
  const providerBEmail = `prov_keep_b_${ts}@smartserve.ai`;
  const customerEmail = `cust_test_${ts}@smartserve.ai`;
  const password = 'TestSecurePassword123!';

  // 1. Register Provider A
  console.log('1. Registering Provider A (to be deleted)...');
  const regA = await request('POST', '/api/auth/register', {
    role: 'Provider',
    fullName: 'David Deletable',
    email: providerAEmail,
    phone: '+91 98401 11111',
    password: password,
    category: 'Electrician',
    bio: 'Electrician with 5 years experience',
    experience: 5,
    gender: 'Male',
    age: 30,
    serviceRate: 350,
    pricingUnit: 'Per Hour',
    workingHours: { start: '08:00', end: '17:00' },
    profileImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150'
  });
  if (regA.status !== 201) throw new Error(`Provider A registration failed: ${JSON.stringify(regA.data)}`);
  console.log('   Provider A registered successfully.\n');

  // 2. Register Provider B (to verify isolation)
  console.log('2. Registering Provider B (to remain untouched)...');
  const regB = await request('POST', '/api/auth/register', {
    role: 'Provider',
    fullName: 'Robert Remaining',
    email: providerBEmail,
    phone: '+91 98401 22222',
    password: password,
    category: 'Plumber',
    bio: 'Plumber with 8 years experience',
    experience: 8,
    gender: 'Male',
    age: 34,
    serviceRate: 299,
    pricingUnit: 'Per Visit',
    workingHours: { start: '09:00', end: '18:00' },
    profileImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150'
  });
  if (regB.status !== 201) throw new Error(`Provider B registration failed: ${JSON.stringify(regB.data)}`);
  console.log('   Provider B registered successfully.\n');

  // 3. Register a Customer
  console.log('3. Registering Customer...');
  const regC = await request('POST', '/api/auth/register', {
    role: 'Customer',
    fullName: 'Alice Customer',
    email: customerEmail,
    phone: '+91 98401 33333',
    password: password,
    address: '123 Main Street, RS Puram, Coimbatore',
    city: 'Coimbatore'
  });
  if (regC.status !== 201) throw new Error(`Customer registration failed: ${JSON.stringify(regC.data)}`);
  console.log('   Customer registered successfully.\n');

  // Get Provider A doc from DB
  const userA = await User.findOne({ email: providerAEmail });
  const provA = await Provider.findOne({ user: userA._id });

  // 4. Create a service for Provider A
  console.log('4. Creating service for Provider A...');
  const srvA = await request('POST', '/api/provider/services', {
    email: providerAEmail,
    name: 'Ceiling Fan Installation',
    category: 'Electrician',
    description: 'Quick fan installation',
    price: 499,
    estimatedDuration: '45 mins'
  });
  if (srvA.status !== 201) throw new Error(`Service creation failed: ${JSON.stringify(srvA.data)}`);
  console.log('   Service created successfully for Provider A.\n');

  // 5. Create a booking for Provider A (Audit record)
  console.log('5. Creating historical booking for Provider A...');
  const booking = await Booking.create({
    bookingId: `BK_${ts}`,
    customerName: 'Alice Customer',
    customerEmail: customerEmail,
    customerPhone: '+91 98401 33333',
    providerName: 'David Deletable',
    providerEmail: providerAEmail,
    providerPhone: '+91 98401 11111',
    date: '2026-07-01',
    time: '10:00 AM',
    serviceType: 'Electrician',
    serviceName: 'Ceiling Fan Installation',
    amount: 499,
    status: 'Completed',
    location: 'Coimbatore'
  });
  console.log(`   Booking #${booking.bookingId} created.\n`);

  // 6. Customer saves Provider A
  console.log('6. Adding Provider A to Customer saved list...');
  await Customer.updateOne(
    { user: regC.data.user.id },
    { $push: { savedProviders: provA._id.toString() } }
  );
  let custDoc = await Customer.findOne({ user: regC.data.user.id });
  console.log(`   Customer savedProviders contains: ${custDoc.savedProviders}\n`);

  // 7. Security Test: Deletion without password should fail (400)
  console.log('7. Testing Deletion without password...');
  const delNoPass = await request('POST', '/api/provider/account/delete', {
    email: providerAEmail
  });
  if (delNoPass.status === 400) {
    console.log(`   [PASS] Rejected with 400: ${delNoPass.data.message}\n`);
  } else {
    throw new Error(`Expected 400, got ${delNoPass.status}`);
  }

  // 8. Security Test: Deletion with wrong password should fail (401)
  console.log('8. Testing Deletion with wrong password...');
  const delWrongPass = await request('POST', '/api/provider/account/delete', {
    email: providerAEmail,
    password: 'WrongPassword999!'
  });
  if (delWrongPass.status === 401) {
    console.log(`   [PASS] Rejected with 401: ${delWrongPass.data.message}\n`);
  } else {
    throw new Error(`Expected 401, got ${delWrongPass.status}`);
  }

  // 9. Security Test: Customer account cannot delete provider account (403)
  console.log('9. Testing Customer attempting to delete account via provider route...');
  const delCust = await request('POST', '/api/provider/account/delete', {
    email: customerEmail,
    password: password
  });
  if (delCust.status === 403) {
    console.log(`   [PASS] Rejected with 403 Forbidden: ${delCust.data.message}\n`);
  } else {
    throw new Error(`Expected 403, got ${delCust.status}`);
  }

  // 10. Valid Deletion of Provider A
  console.log('10. Permanently deleting Provider A with correct credentials...');
  const delValid = await request('POST', '/api/provider/account/delete', {
    email: providerAEmail,
    password: password
  });
  if (delValid.status === 200 && delValid.data.success) {
    console.log(`   [PASS] Deletion confirmed with 200: ${delValid.data.message}\n`);
  } else {
    throw new Error(`Deletion failed: ${JSON.stringify(delValid.data)}`);
  }

  // 11. Verify User and Provider documents are gone from MongoDB
  console.log('11. Verifying Provider A database records are removed...');
  const deletedUserA = await User.findOne({ email: providerAEmail });
  const deletedProvA = await Provider.findOne({ _id: provA._id });
  if (!deletedUserA && !deletedProvA) {
    console.log('   [PASS] User and Provider records completely deleted from MongoDB.\n');
  } else {
    throw new Error('User or Provider document was not deleted!');
  }

  // 12. Verify Provider A cannot log in
  console.log('12. Verifying deleted Provider A cannot log in...');
  const loginAttempt = await request('POST', '/api/auth/login', {
    email: providerAEmail,
    password: password,
    role: 'Provider'
  });
  if (loginAttempt.status === 401) {
    console.log(`   [PASS] Login rejected with 401: ${loginAttempt.data.message}\n`);
  } else {
    throw new Error(`Expected login rejection 401, got ${loginAttempt.status}`);
  }

  // 13. Verify Provider A services are deleted
  console.log('13. Verifying Provider A services are deleted...');
  const servicesA = await Service.find({ providerEmail: providerAEmail });
  if (servicesA.length === 0) {
    console.log('   [PASS] All services for Provider A were removed.\n');
  } else {
    throw new Error('Services were not removed!');
  }

  // 14. Verify Historical Booking is retained and anonymized
  console.log('14. Verifying booking audit record is retained and anonymized...');
  const updatedBooking = await Booking.findOne({ bookingId: `BK_${ts}` });
  if (updatedBooking && updatedBooking.providerName.includes('Account Closed') && updatedBooking.providerPhone === 'N/A') {
    console.log(`   [PASS] Booking retained with anonymized details: "${updatedBooking.providerName}", phone: "${updatedBooking.providerPhone}"\n`);
  } else {
    throw new Error(`Booking was either deleted or not anonymized properly: ${JSON.stringify(updatedBooking)}`);
  }

  // 15. Verify Customer savedProviders has Provider A removed
  console.log('15. Verifying Customer savedProviders list has Provider A removed...');
  custDoc = await Customer.findOne({ user: regC.data.user.id });
  if (!custDoc.savedProviders.includes(provA._id.toString())) {
    console.log('   [PASS] Provider A ID successfully pulled from customer saved list.\n');
  } else {
    throw new Error('Customer savedProviders still contains Provider A!');
  }

  // 16. Verify Provider B remains intact and can log in
  console.log('16. Verifying Provider B account is intact and functional...');
  const loginB = await request('POST', '/api/auth/login', {
    email: providerBEmail,
    password: password,
    role: 'Provider'
  });
  if (loginB.status === 200 && loginB.data.user.email === providerBEmail) {
    console.log(`   [PASS] Provider B logged in successfully: ${loginB.data.user.fullName}\n`);
  } else {
    throw new Error(`Provider B login failed: ${JSON.stringify(loginB.data)}`);
  }

  // 17. Verify Customer remains intact and can log in
  console.log('17. Verifying Customer account is intact and functional...');
  const loginC = await request('POST', '/api/auth/login', {
    email: customerEmail,
    password: password,
    role: 'Customer'
  });
  if (loginC.status === 200 && loginC.data.user.email === customerEmail) {
    console.log(`   [PASS] Customer logged in successfully: ${loginC.data.user.fullName}\n`);
  } else {
    throw new Error(`Customer login failed: ${JSON.stringify(loginC.data)}`);
  }

  // Clean up test records
  console.log('Cleaning up remaining test data (Provider B, Customer, Booking)...');
  await User.deleteMany({ email: { $in: [providerBEmail, customerEmail] } });
  await Provider.deleteMany({ user: regB.data.user.id });
  await Customer.deleteMany({ user: regC.data.user.id });
  await Booking.deleteMany({ bookingId: `BK_${ts}` });
  await mongoose.disconnect();

  console.log('\n=== ALL 17 ACCOUNT DELETION TESTS PASSED SUCCESSFULLY! ===\n');
}

run().catch((err) => {
  console.error('\nTEST FAILED:', err);
  process.exit(1);
});
