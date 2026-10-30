import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import User from './models/User.js';
import Provider from './models/Provider.js';
import Customer from './models/Customer.js';
import Service from './models/Service.js';
import { hashPassword } from './routes/authRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartserve';

// 1x1 transparent PNG as sample base64 image
const sampleBase64Image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const sampleBase64Image2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mNk+M/AwAAEDBQAACwBA/9V4t0AAAAASUVORK5CYII=';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=== STARTING END-TO-END REGISTRATION & PERSISTENCE TESTS ===');
  await mongoose.connect(mongoUri);
  console.log('✓ Connected to MongoDB directly for assertion verification');

  const ts = Date.now();
  const customerEmail = `test_customer_${ts}@smartserve.ai`;
  const customerPassword = `CustPass_${ts}!`;
  const customerNewPassword = `CustNewPass_${ts}!`;

  const providerEmail = `test_provider_${ts}@smartserve.ai`;
  const providerPassword = `ProvPass_${ts}!`;
  const providerNewPassword = `ProvNewPass_${ts}!`;

  // ─────────────────────────────────────────────────────────────
  // TEST 1: Customer Registration with Password & Profile Image
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- TEST 1: Customer Registration ---');
  const custRegRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Anita Raman',
      email: customerEmail,
      phone: '+91 98430 99881',
      password: customerPassword,
      role: 'Customer',
      profilePhoto: sampleBase64Image,
      city: 'Coimbatore',
      address: '77 Race Course Road, Coimbatore'
    })
  });
  const custRegData = await custRegRes.json();
  if (!custRegData.success) {
    throw new Error(`Customer registration failed: ${custRegData.message}`);
  }
  console.log('✓ Customer registration API succeeded');

  // Verify in MongoDB
  const dbCustUser = await User.findOne({ email: customerEmail });
  if (!dbCustUser) throw new Error('Customer user not found in MongoDB!');
  const expectedCustHash = hashPassword(customerPassword);
  if (dbCustUser.password !== expectedCustHash) {
    throw new Error(`Customer password mismatch in MongoDB! Expected ${expectedCustHash}, got ${dbCustUser.password}`);
  }
  console.log('✓ Verified: Customer password stored as valid SHA-256 hash matching input credentials');

  if (!dbCustUser.profileImage || !dbCustUser.profileImage.startsWith('http://localhost:5000/uploads/')) {
    throw new Error(`Customer profile image not saved to permanent disk URL! Got: ${dbCustUser.profileImage}`);
  }
  console.log(`✓ Verified: Customer profile image saved as permanent URL: ${dbCustUser.profileImage}`);

  const dbCustomer = await Customer.findOne({ user: dbCustUser._id });
  if (!dbCustomer) throw new Error('Customer profile record not found in MongoDB!');
  if (dbCustomer.photo !== dbCustUser.profileImage) {
    throw new Error(`Customer model photo does not match User model profileImage!`);
  }
  console.log('✓ Verified: Customer collection photo synchronised with User profileImage');

  // Verify image accessibility via HTTP GET
  const imgFetchRes = await fetch(dbCustUser.profileImage);
  if (imgFetchRes.status !== 200) {
    throw new Error(`Saved profile image HTTP GET returned status ${imgFetchRes.status}`);
  }
  console.log('✓ Verified: Profile image accessible via HTTP with 200 OK');

  // ─────────────────────────────────────────────────────────────
  // TEST 2: Customer Login Verification
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- TEST 2: Customer Login Verification ---');
  // Wrong password
  const failLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: customerEmail, password: 'WrongPassword123' })
  });
  if (failLoginRes.status !== 401) {
    throw new Error(`Expected 401 for wrong password, got ${failLoginRes.status}`);
  }
  console.log('✓ Verified: Invalid password rejected with 401');

  // Correct password
  const successLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: customerEmail, password: customerPassword, role: 'Customer' })
  });
  const successLoginData = await successLoginRes.json();
  if (!successLoginData.success) {
    throw new Error(`Customer login failed with correct credentials: ${successLoginData.message}`);
  }
  if (successLoginData.user.profileImage !== dbCustUser.profileImage) {
    throw new Error('Login response user.profileImage does not match stored image!');
  }
  console.log('✓ Verified: Customer login succeeded and returned valid user & profile image');

  // ─────────────────────────────────────────────────────────────
  // TEST 3: Provider Registration with Rate, Category & Photo
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- TEST 3: Provider Registration ---');
  const provRegRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Kannan Murugan',
      email: providerEmail,
      phone: '+91 97890 12345',
      password: providerPassword,
      role: 'Provider',
      category: 'Electrician',
      serviceRate: 450,
      pricingUnit: 'Per Hour',
      experience: 7,
      age: 33,
      gender: 'Male',
      bio: 'Expert electrician specializing in home wiring and commercial repairs in Coimbatore.',
      profilePhoto: sampleBase64Image,
      city: 'Coimbatore',
      address: '12 DB Road, RS Puram, Coimbatore'
    })
  });
  const provRegData = await provRegRes.json();
  if (!provRegData.success) {
    throw new Error(`Provider registration failed: ${provRegData.message}`);
  }
  console.log('✓ Provider registration API succeeded');

  const dbProvUser = await User.findOne({ email: providerEmail });
  if (!dbProvUser) throw new Error('Provider user not found in MongoDB!');
  const expectedProvHash = hashPassword(providerPassword);
  if (dbProvUser.password !== expectedProvHash) {
    throw new Error(`Provider password mismatch in MongoDB! Expected ${expectedProvHash}, got ${dbProvUser.password}`);
  }
  console.log('✓ Verified: Provider password stored as valid SHA-256 hash matching input credentials');

  const dbProvider = await Provider.findOne({ user: dbProvUser._id });
  if (!dbProvider) throw new Error('Provider record not found in MongoDB!');
  if (!dbProvider.photo || !dbProvider.photo.startsWith('http://localhost:5000/uploads/')) {
    throw new Error(`Provider photo not saved to disk URL! Got: ${dbProvider.photo}`);
  }
  if (dbProvider.photo.includes('unsplash.com')) {
    throw new Error('Provider photo contains placeholder Unsplash URL instead of uploaded image!');
  }
  console.log(`✓ Verified: Provider photo stored as authentic URL (never Unsplash): ${dbProvider.photo}`);

  const dbService = await Service.findOne({ providerId: dbProvider._id });
  if (!dbService) throw new Error('Provider primary service not created!');
  if (dbService.image !== dbProvider.photo) {
    throw new Error('Provider Service image not synced with Provider photo!');
  }
  console.log('✓ Verified: Provider Service image automatically synchronized with provider photo');

  // ─────────────────────────────────────────────────────────────
  // TEST 4: Provider Login Verification
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- TEST 4: Provider Login Verification ---');
  const provLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: providerEmail, password: providerPassword, role: 'Provider' })
  });
  const provLoginData = await provLoginRes.json();
  if (!provLoginData.success) {
    throw new Error(`Provider login failed: ${provLoginData.message}`);
  }
  if (provLoginData.user.photo !== dbProvider.photo) {
    throw new Error('Provider login did not return correct photo URL!');
  }
  console.log('✓ Verified: Provider login succeeded with hydrated photo and credentials');

  // ─────────────────────────────────────────────────────────────
  // TEST 5: Change Password for Provider & Customer
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- TEST 5: Change Password Flow ---');
  // Attempt with wrong old password
  const badOldPassRes = await fetch(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: providerEmail,
      currentPassword: 'WrongOldPassword',
      newPassword: providerNewPassword
    })
  });
  if (badOldPassRes.status !== 400) {
    throw new Error(`Expected 400 for incorrect old password, got ${badOldPassRes.status}`);
  }
  console.log('✓ Verified: Change password rejected incorrect current password');

  // Change provider password successfully
  const changePassRes = await fetch(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: providerEmail,
      currentPassword: providerPassword,
      newPassword: providerNewPassword
    })
  });
  const changePassData = await changePassRes.json();
  if (!changePassData.success) {
    throw new Error(`Change password failed: ${changePassData.message}`);
  }
  console.log('✓ Verified: Provider password change succeeded');

  // Verify old password no longer works
  const oldLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: providerEmail, password: providerPassword, role: 'Provider' })
  });
  if (oldLoginRes.status !== 401) {
    throw new Error('Old password was still accepted after password change!');
  }
  console.log('✓ Verified: Old password immediately invalid after change');

  // Verify new password works
  const newLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: providerEmail, password: providerNewPassword, role: 'Provider' })
  });
  const newLoginData = await newLoginRes.json();
  if (!newLoginData.success) {
    throw new Error('Login with new password failed!');
  }
  console.log('✓ Verified: Login with newly changed password succeeded');

  // Change customer password too
  const custChangePassRes = await fetch(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: customerEmail,
      currentPassword: customerPassword,
      newPassword: customerNewPassword
    })
  });
  const custChangeData = await custChangePassRes.json();
  if (!custChangeData.success) throw new Error('Customer change password failed!');
  console.log('✓ Verified: Customer password change succeeded');

  // ─────────────────────────────────────────────────────────────
  // TEST 6: Profile Update & Image Synchronization
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- TEST 6: Profile Update & Image Synchronization ---');
  const updateCustRes = await fetch(`${BASE_URL}/auth/update-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: customerEmail,
      fullName: 'Anita Ramanathan',
      phone: '+91 98430 11111',
      profileImage: sampleBase64Image2
    })
  });
  const updateCustData = await updateCustRes.json();
  if (!updateCustData.success) throw new Error(`Customer profile update failed: ${updateCustData.message}`);

  const updatedCustUser = await User.findOne({ email: customerEmail });
  const updatedCust = await Customer.findOne({ email: customerEmail });
  if (updatedCustUser.fullName !== 'Anita Ramanathan') throw new Error('Updated customer fullName not saved in User!');
  if (updatedCust.name !== 'Anita Ramanathan') throw new Error('Updated customer name not synced in Customer!');
  if (!updatedCustUser.profileImage.startsWith('http://localhost:5000/uploads/')) {
    throw new Error('Updated customer photo not saved as file URL!');
  }
  if (updatedCust.photo !== updatedCustUser.profileImage) {
    throw new Error('Updated customer photo not synced between User and Customer collections!');
  }
  console.log('✓ Verified: Customer profile & photo update successfully synced across User & Customer');

  // Provider profile update via provider routes
  const updateProvRes = await fetch(`${BASE_URL}/provider/profile/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: providerEmail,
      fullName: 'Kannan M. Electrician',
      phone: '+91 97890 55555',
      rate: 500,
      profilePhoto: sampleBase64Image2
    })
  });
  const updateProvData = await updateProvRes.json();
  if (!updateProvData.success) throw new Error(`Provider profile update failed: ${updateProvData.message}`);

  const updatedProvUser = await User.findOne({ email: providerEmail });
  const updatedProv = await Provider.findOne({ email: providerEmail });
  const updatedProvServ = await Service.findOne({ providerId: updatedProv._id });
  if (updatedProvUser.fullName !== 'Kannan M. Electrician') throw new Error('Updated provider fullName not in User!');
  if (updatedProv.name !== 'Kannan M. Electrician') throw new Error('Updated provider name not in Provider!');
  if (updatedProv.rate !== 500) throw new Error('Updated provider rate not in Provider!');
  if (!updatedProv.photo.startsWith('http://localhost:5000/uploads/')) {
    throw new Error('Updated provider photo not stored as file URL!');
  }
  if (updatedProvServ.image !== updatedProv.photo) {
    throw new Error('Updated provider photo not synchronized to Service image!');
  }
  console.log('✓ Verified: Provider profile, rate & photo update synchronized across User, Provider & Service');

  console.log('\n======================================================');
  console.log('🎉 ALL REGISTRATION, PASSWORD & PERSISTENCE TESTS PASSED!');
  console.log('======================================================\n');
  await mongoose.disconnect();
}

runTests().catch(async (err) => {
  console.error('\n❌ TEST FAILED:', err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
