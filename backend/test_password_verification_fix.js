import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/User.js';
import Provider from './models/Provider.js';
import Service from './models/Service.js';
import Booking from './models/Booking.js';
import Earning from './models/Earning.js';

dotenv.config();

function request(method, path, data = null, headers = {}) {
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
        } : {}),
        ...headers
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
  console.log('=== STARTING PASSWORD VERIFICATION BUG FIX TEST ===\n');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartserve';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.\n');

  const ts = Date.now();

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 1: Registered Provider (SHA-256 hash) password verification & deletion
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('TEST 1: Registered Provider with SHA-256 hashed password');
  const email1 = `prov_hash_${ts}@smartserve.ai`;
  const pass1 = 'ModernSecret123!';

  const reg1 = await request('POST', '/api/auth/register', {
    role: 'Provider',
    fullName: 'Hash Provider',
    email: email1,
    phone: '+91 90001 11111',
    password: pass1,
    category: 'Electrician',
    serviceRate: 350,
    pricingUnit: 'Per Visit',
    bio: 'Licensed professional',
    experience: 5
  });
  if (reg1.status !== 201) throw new Error(`Reg failed: ${JSON.stringify(reg1.data)}`);

  // Verify hash in MongoDB
  const user1Doc = await User.findOne({ email: email1 });
  if (!user1Doc || !/^[0-9a-f]{64}$/i.test(user1Doc.password)) {
    throw new Error('Password was not saved as SHA-256 hash in DB!');
  }
  console.log('   ✓ Provider registered. Password stored as SHA-256 hash.');

  // 1a. Empty password -> rejected (400)
  const delEmpty = await request('POST', '/api/provider/account/delete', {
    email: email1,
    password: ''
  });
  if (delEmpty.status === 400) {
    console.log('   ✓ Empty password correctly rejected with 400.');
  } else {
    throw new Error(`Expected 400 for empty password, got ${delEmpty.status}`);
  }

  // 1b. Incorrect password -> rejected (401), account intact
  const delWrong = await request('POST', '/api/provider/account/delete', {
    email: email1,
    password: 'WrongPassword999!'
  });
  if (delWrong.status === 401 && delWrong.data.message.includes('Invalid password')) {
    console.log('   ✓ Incorrect password rejected with 401: Invalid password.');
  } else {
    throw new Error(`Expected 401 for wrong password, got ${delWrong.status}`);
  }
  const checkUser1StillExists = await User.findOne({ email: email1 });
  if (!checkUser1StillExists) throw new Error('Account was prematurely deleted on wrong password!');
  console.log('   ✓ Account remained intact after failed password verification.');

  // 1c. Correct password -> deletion succeeds (200)
  const delCorrect = await request('POST', '/api/provider/account/delete', {
    email: email1,
    password: pass1
  });
  if (delCorrect.status === 200 && delCorrect.data.success) {
    console.log('   ✓ Correct password verified successfully. Account deleted (200).');
  } else {
    throw new Error(`Deletion failed with correct password: ${JSON.stringify(delCorrect.data)}`);
  }
  const checkUser1Deleted = await User.findOne({ email: email1 });
  if (checkUser1Deleted) throw new Error('User was not deleted from DB!');
  console.log('   ✓ Verified User and Provider records removed from MongoDB.\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 2: Legacy Plaintext Password Provider
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('TEST 2: Legacy Provider with stored plaintext password');
  const email2 = `prov_plain_${ts}@smartserve.ai`;
  const pass2 = 'plainTextPass456';

  const user2 = await User.create({
    fullName: 'Legacy Plain Provider',
    email: email2,
    phone: '+91 90001 22222',
    role: 'Provider',
    password: pass2 // stored directly in plaintext
  });
  const prov2 = await Provider.create({
    user: user2._id,
    category: 'Plumber',
    experience: 4,
    gender: 'Male',
    age: 28,
    about: 'Plumber bio'
  });

  // 2a. Wrong password -> rejected
  const delPlainWrong = await request('POST', '/api/provider/account/delete', {
    email: email2,
    password: 'wrongPlainPassword'
  });
  if (delPlainWrong.status === 401) {
    console.log('   ✓ Plaintext account: Incorrect password rejected with 401.');
  } else {
    throw new Error(`Expected 401, got ${delPlainWrong.status}`);
  }

  // 2b. Correct plaintext password -> succeeds
  const delPlainCorrect = await request('POST', '/api/provider/account/delete', {
    email: email2,
    password: pass2
  });
  if (delPlainCorrect.status === 200 && delPlainCorrect.data.success) {
    console.log('   ✓ Plaintext account: Correct password verified. Account deleted (200).');
  } else {
    throw new Error(`Deletion failed for legacy plaintext account: ${JSON.stringify(delPlainCorrect.data)}`);
  }
  const checkUser2Deleted = await User.findOne({ email: email2 });
  if (checkUser2Deleted) throw new Error('User 2 was not deleted!');
  console.log('   ✓ Legacy plaintext provider successfully deleted.\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 3: Legacy Seeded Provider (empty string password in DB)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('TEST 3: Legacy Seeded Provider (password stored as empty string in MongoDB)');
  const email3 = `prov_legacy_empty_${ts}@smartserve.ai`;

  // Simulating Rajesh Kumar or Priya Sharma seed record
  const user3 = await User.create({
    fullName: 'Legacy Seed Provider',
    email: email3,
    phone: '+91 90001 33333',
    role: 'Provider',
    password: '' // empty string in DB
  });
  await Provider.create({
    user: user3._id,
    category: 'Home Cleaning',
    experience: 6,
    gender: 'Female',
    age: 30,
    about: 'Cleaning expert'
  });

  // 3a. Wrong password -> rejected (cannot delete with random password)
  const delEmptyWrong = await request('POST', '/api/provider/account/delete', {
    email: email3,
    password: 'notTheSeedPassword'
  });
  if (delEmptyWrong.status === 401) {
    console.log('   ✓ Legacy empty password: Wrong password rejected with 401.');
  } else {
    throw new Error(`Expected 401, got ${delEmptyWrong.status}`);
  }

  // 3b. Correct seed password 'password123' -> succeeds!
  const delEmptyCorrect = await request('POST', '/api/provider/account/delete', {
    email: email3,
    password: 'password123'
  });
  if (delEmptyCorrect.status === 200 && delEmptyCorrect.data.success) {
    console.log('   ✓ Legacy empty password: Standard seed password "password123" verified. Account deleted (200).');
  } else {
    throw new Error(`Deletion failed with seed password: ${JSON.stringify(delEmptyCorrect.data)}`);
  }
  const checkUser3Deleted = await User.findOne({ email: email3 });
  if (checkUser3Deleted) throw new Error('User 3 was not deleted!');
  console.log('   ✓ Legacy seeded provider successfully deleted with "password123".\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 4: Legacy Account Login & Migration to SHA-256
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('TEST 4: Legacy Account Login & Safe Migration to SHA-256');
  const email4 = `prov_migrate_${ts}@smartserve.ai`;
  const user4 = await User.create({
    fullName: 'Migrate Provider',
    email: email4,
    phone: '+91 90001 44444',
    role: 'Provider',
    password: '' // empty legacy
  });
  await Provider.create({
    user: user4._id,
    category: 'Carpenter',
    experience: 7
  });

  // 4a. Login with wrong password -> fails
  const loginWrong = await request('POST', '/api/auth/login', {
    email: email4,
    password: 'wrongPassword',
    role: 'Provider'
  });
  if (loginWrong.status === 401) {
    console.log('   ✓ Legacy login with wrong password rejected (401).');
  } else {
    throw new Error(`Expected 401, got ${loginWrong.status}`);
  }

  // 4b. Login with 'password123' -> succeeds and migrates to SHA-256
  const loginCorrect = await request('POST', '/api/auth/login', {
    email: email4,
    password: 'password123',
    role: 'Provider'
  });
  if (loginCorrect.status === 200) {
    console.log('   ✓ Legacy login with "password123" succeeded (200).');
  } else {
    throw new Error(`Legacy login failed: ${JSON.stringify(loginCorrect.data)}`);
  }

  // Check that password in DB was migrated to SHA-256
  const user4Updated = await User.findOne({ email: email4 });
  if (user4Updated && /^[0-9a-f]{64}$/i.test(user4Updated.password)) {
    console.log('   ✓ Safe Migration verified: user.password is now a SHA-256 hash in MongoDB.');
  } else {
    throw new Error('Password was not migrated to SHA-256 hash!');
  }

  // Clean up user4
  await User.findByIdAndDelete(user4._id);
  await Provider.deleteMany({ user: user4._id });
  console.log('   ✓ Cleaned up test 4 provider.\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 5: Provider A attempts to delete Provider B's account
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('TEST 5: Cross-provider deletion prevention (Provider A -> Provider B)');
  const emailProvA = `prov_a_${ts}@smartserve.ai`;
  const emailProvB = `prov_b_${ts}@smartserve.ai`;
  const passA = 'PassForA123!';
  const passB = 'PassForB456!';

  await request('POST', '/api/auth/register', {
    role: 'Provider',
    fullName: 'Provider Alpha',
    email: emailProvA,
    phone: '+91 90001 55555',
    password: passA,
    category: 'Painter',
    serviceRate: 25,
    pricingUnit: 'Per Sq.Ft',
    bio: 'Painter bio',
    experience: 3
  });

  await request('POST', '/api/auth/register', {
    role: 'Provider',
    fullName: 'Provider Beta',
    email: emailProvB,
    phone: '+91 90001 66666',
    password: passB,
    category: 'Painter',
    serviceRate: 25,
    pricingUnit: 'Per Sq.Ft',
    bio: 'Painter bio',
    experience: 3
  });

  // 5a. Provider A tries to delete Provider B using Provider A's password
  const crossDel1 = await request('POST', '/api/provider/account/delete', {
    email: emailProvB,
    password: passA
  });
  if (crossDel1.status === 401) {
    console.log('   ✓ Provider A trying to delete Provider B using Pass A rejected with 401 (Invalid password).');
  } else {
    throw new Error(`Expected 401, got ${crossDel1.status}`);
  }

  // 5b. Provider A authenticated session tries to delete Provider B target
  const crossDel2 = await request('POST', '/api/provider/account/delete', {
    email: emailProvB,
    password: passB
  }, {
    'X-Authenticated-Email': emailProvA
  });
  if (crossDel2.status === 403) {
    console.log('   ✓ Provider A with X-Authenticated-Email targeting Provider B rejected with 403 Forbidden.');
  } else {
    throw new Error(`Expected 403, got ${crossDel2.status}`);
  }

  // Verify Provider B is still intact
  const provBStillExists = await User.findOne({ email: emailProvB });
  if (!provBStillExists) throw new Error('Provider B was deleted!');
  console.log('   ✓ Provider B remains completely intact.\n');

  // Clean up
  await User.deleteMany({ email: { $in: [emailProvA, emailProvB] } });
  const docA = await User.findOne({ email: emailProvA });
  if (docA) await Provider.deleteMany({ user: docA._id });
  const docB = await User.findOne({ email: emailProvB });
  if (docB) await Provider.deleteMany({ user: docB._id });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST 6: Failed deletion does not partially delete account data
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('TEST 6: Failed deletion does NOT partially delete data');
  const email6 = `prov_partial_${ts}@smartserve.ai`;
  const pass6 = 'SecurePass678!';

  const reg6 = await request('POST', '/api/auth/register', {
    role: 'Provider',
    fullName: 'Full Data Provider',
    email: email6,
    phone: '+91 90001 77777',
    password: pass6,
    category: 'AC Repair',
    serviceRate: 499,
    pricingUnit: 'Per Visit',
    bio: 'AC specialist',
    experience: 8
  });

  const user6 = await User.findOne({ email: email6 });
  const prov6 = await Provider.findOne({ user: user6._id });

  // Create service, booking, and earning
  const srv6 = await Service.create({
    providerEmail: email6,
    providerId: prov6._id,
    name: 'AC Duct Cleaning',
    price: 999
  });
  const bk6 = await Booking.create({
    bookingId: `BK_PARTIAL_${ts}`,
    customerName: 'Customer Test',
    customerEmail: 'cust@test.com',
    customerPhone: '+91 90000 00000',
    providerName: 'Full Data Provider',
    providerEmail: email6,
    providerPhone: '+91 90001 77777',
    date: '2026-07-01',
    time: '10:00 AM',
    serviceType: 'AC Repair',
    serviceName: 'AC Duct Cleaning',
    amount: 999
  });
  const earn6 = await Earning.create({
    providerEmail: email6,
    total: 999
  });

  // Attempt deletion with wrong password
  const failDel = await request('POST', '/api/provider/account/delete', {
    email: email6,
    password: 'IncorrectPassword!'
  });
  if (failDel.status !== 401) throw new Error('Expected 401');

  // Verify ALL data is intact
  const uCheck = await User.findById(user6._id);
  const pCheck = await Provider.findById(prov6._id);
  const sCheck = await Service.findById(srv6._id);
  const bCheck = await Booking.findById(bk6._id);
  const eCheck = await Earning.findById(earn6._id);

  if (uCheck && pCheck && sCheck && bCheck && eCheck) {
    console.log('   ✓ User, Provider, Service, Booking, and Earning records all remain 100% intact after failed deletion.');
  } else {
    throw new Error('Partial deletion occurred on failed verification!');
  }

  // Clean up
  await User.findByIdAndDelete(user6._id);
  await Provider.findByIdAndDelete(prov6._id);
  await Service.findByIdAndDelete(srv6._id);
  await Booking.findByIdAndDelete(bk6._id);
  await Earning.findByIdAndDelete(earn6._id);
  console.log('   ✓ Cleaned up test 6 records.\n');

  await mongoose.disconnect();
  console.log('=== ALL TESTS PASSED SUCCESSFULLY! ===\n');
}

run().catch(err => {
  console.error('\nTEST FAILED:', err);
  process.exit(1);
});
