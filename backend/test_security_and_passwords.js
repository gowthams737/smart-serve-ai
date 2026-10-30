import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import User from './models/User.js';
import Provider from './models/Provider.js';
import Customer from './models/Customer.js';
import Service from './models/Service.js';
import { isBcrypt, isSha256, hashPassword } from './routes/authRoutes.js';
import { saveImageIfBase64, sanitizeImageUrl, uploadedFileExists } from './utils/imageHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartserve';
const BASE_URL = 'http://localhost:5000/api';

const sampleBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function runSecurityTests() {
  console.log('=== STARTING SECURITY & END-TO-END VERIFICATION PASS ===\n');
  await mongoose.connect(mongoUri);

  const ts = Date.now();
  const testCustomerEmail = `sec_cust_${ts}@smartserve.ai`;
  const initialCustomerPass = `SecurePass_${ts}!`;
  const newCustomerPass = `UpdatedPass_${ts}!`;

  const testProviderEmail = `sec_prov_${ts}@smartserve.ai`;
  const initialProviderPass = `ProvSec_${ts}!`;
  const newProviderPass = `ProvUpd_${ts}!`;

  // ─────────────────────────────────────────────────────────────
  // 1. Password Security: Bcrypt Hashing on Registration
  // ─────────────────────────────────────────────────────────────
  console.log('--- 1. Testing Bcrypt Password Storage on Registration ---');
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Security Test Customer',
      email: testCustomerEmail,
      phone: '+91 94430 88771',
      password: initialCustomerPass,
      role: 'Customer',
      profilePhoto: sampleBase64
    })
  });
  const regData = await regRes.json();
  if (!regData.success) throw new Error(`Registration failed: ${regData.message}`);

  const userInDb = await User.findOne({ email: testCustomerEmail });
  if (!userInDb) throw new Error('User not found in database!');
  if (!isBcrypt(userInDb.password)) {
    throw new Error(`Password was not hashed using bcrypt! Got: ${userInDb.password}`);
  }
  if (!userInDb.password.startsWith('$2a$') && !userInDb.password.startsWith('$2b$')) {
    throw new Error(`Password hash does not start with standard bcrypt prefix: ${userInDb.password}`);
  }
  console.log(`✓ Verified: Password is stored as a valid bcrypt hash (${userInDb.password.substring(0, 20)}...)`);

  // ─────────────────────────────────────────────────────────────
  // 2. Backward-Compatible Verification & Rehash on Login
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 2. Testing Backward-Compatibility & Rehash on Login ---');
  // Create a user with legacy SHA-256 hash manually
  const legacyEmail = `legacy_sha_${ts}@smartserve.ai`;
  const legacyPassword = `LegacyPass_${ts}!`;
  const legacySha256Hash = crypto.createHash('sha256').update(legacyPassword).digest('hex');

  await User.create({
    fullName: 'Legacy User',
    email: legacyEmail,
    phone: '+91 90000 11111',
    password: legacySha256Hash,
    role: 'Customer'
  });

  const createdLegacy = await User.findOne({ email: legacyEmail });
  if (!isSha256(createdLegacy.password)) throw new Error('Legacy user not created with SHA-256!');
  console.log('✓ Created legacy test user with SHA-256 password hash in MongoDB');

  // Log in with legacy user
  const legacyLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: legacyEmail, password: legacyPassword, role: 'Customer' })
  });
  const legacyLoginData = await legacyLoginRes.json();
  if (!legacyLoginData.success) throw new Error(`Legacy user login failed: ${legacyLoginData.message}`);
  console.log('✓ Backward-compatible login succeeded for legacy SHA-256 account');

  // Verify safe rehash-on-login: check if user in MongoDB was upgraded to bcrypt
  const rehashedUser = await User.findOne({ email: legacyEmail });
  if (!isBcrypt(rehashedUser.password)) {
    throw new Error(`Legacy user was not rehashed to bcrypt upon successful login! Stored: ${rehashedUser.password}`);
  }
  console.log(`✓ Safe rehash-on-login verified: Legacy hash upgraded to bcrypt (${rehashedUser.password.substring(0, 20)}...)`);

  // ─────────────────────────────────────────────────────────────
  // 3. Unified Password Change: /api/auth/change-password
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 3. Testing Unified /api/auth/change-password ---');
  // Wrong old password
  const badOldRes = await fetch(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testCustomerEmail,
      currentPassword: 'WrongOldPassword123',
      newPassword: newCustomerPass
    })
  });
  if (badOldRes.status !== 400) throw new Error(`Expected 400 for incorrect current password, got ${badOldRes.status}`);
  console.log('✓ Rejected change-password with wrong current password (400)');

  // Same password
  const samePassRes = await fetch(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testCustomerEmail,
      currentPassword: initialCustomerPass,
      newPassword: initialCustomerPass
    })
  });
  if (samePassRes.status !== 400) throw new Error('Expected 400 when new password is same as old password');
  console.log('✓ Rejected change-password when new password equals current password (400)');

  // Successful change
  const goodChangeRes = await fetch(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testCustomerEmail,
      currentPassword: initialCustomerPass,
      newPassword: newCustomerPass
    })
  });
  const goodChangeData = await goodChangeRes.json();
  if (!goodChangeData.success) throw new Error(`Password change failed: ${goodChangeData.message}`);
  console.log('✓ Password change succeeded (200)');

  // Verify old password stops working immediately
  const oldLoginCheck = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testCustomerEmail, password: initialCustomerPass, role: 'Customer' })
  });
  if (oldLoginCheck.status !== 401) throw new Error('Old password was still accepted after password change!');
  console.log('✓ Verified: Old password immediately rejected with 401');

  // Verify new password works
  const newLoginCheck = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testCustomerEmail, password: newCustomerPass, role: 'Customer' })
  });
  const newLoginData = await newLoginCheck.json();
  if (!newLoginData.success) throw new Error('Login with new password failed!');
  console.log('✓ Verified: Login with new password succeeded (200)');

  // ─────────────────────────────────────────────────────────────
  // 4. Provider Password Change: /api/provider/change-password
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 4. Testing Provider /api/provider/change-password Authorization ---');
  // Register provider
  const provRegRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Provider Security Test',
      email: testProviderEmail,
      phone: '+91 94430 88772',
      password: initialProviderPass,
      role: 'Provider',
      category: 'Electrician',
      serviceRate: 400,
      pricingUnit: 'Per Hour',
      experience: 5,
      profilePhoto: sampleBase64
    })
  });
  const provRegData = await provRegRes.json();
  if (!provRegData.success) throw new Error(`Provider registration failed: ${provRegData.message}`);

  // Unauthorized header test: impersonating another email
  const badAuthHeaderRes = await fetch(`${BASE_URL}/provider/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Authenticated-Email': 'different.user@smartserve.ai'
    },
    body: JSON.stringify({
      email: testProviderEmail,
      currentPassword: initialProviderPass,
      newPassword: newProviderPass
    })
  });
  if (badAuthHeaderRes.status !== 403) {
    throw new Error(`Expected 403 when authenticated header does not match target email! Got: ${badAuthHeaderRes.status}`);
  }
  console.log('✓ Verified: Unauthorized header cross-account mutation blocked with 403');

  // Role authorization test: trying to use provider endpoint for a Customer account
  const wrongRoleRes = await fetch(`${BASE_URL}/provider/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testCustomerEmail,
      currentPassword: newCustomerPass,
      newPassword: 'AnotherPassword123!'
    })
  });
  if (wrongRoleRes.status !== 403) {
    throw new Error(`Expected 403 when customer tries to use provider password change! Got: ${wrongRoleRes.status}`);
  }
  console.log('✓ Verified: Role authorization enforced (Customer blocked on Provider endpoint)');

  // Successful provider password change
  const provChangeRes = await fetch(`${BASE_URL}/provider/change-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Authenticated-Email': testProviderEmail
    },
    body: JSON.stringify({
      email: testProviderEmail,
      currentPassword: initialProviderPass,
      newPassword: newProviderPass
    })
  });
  const provChangeData = await provChangeRes.json();
  if (!provChangeData.success) throw new Error(`Provider password change failed: ${provChangeData.message}`);
  console.log('✓ Verified: Provider password change succeeded with authorization');

  // ─────────────────────────────────────────────────────────────
  // 5. Image Persistence & Missing File Fallback Handling
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 5. Testing Image Persistence & Missing File Fallback ---');
  // Check that saved profile image exists on disk
  const provUser = await User.findOne({ email: testProviderEmail });
  if (!uploadedFileExists(provUser.profileImage)) {
    throw new Error(`Uploaded file not found on disk for URL: ${provUser.profileImage}`);
  }
  console.log(`✓ Verified: Image persists on disk at path: ${provUser.profileImage}`);

  // Test sanitizeImageUrl on non-existent file URL
  const fakeFileUrl = 'http://localhost:5000/uploads/missing_deleted_file_999999.png';
  const sanitized = sanitizeImageUrl(fakeFileUrl);
  if (sanitized !== '') {
    throw new Error(`Expected sanitizeImageUrl to return empty string for missing file, got: "${sanitized}"`);
  }
  console.log('✓ Verified: Missing disk file URL sanitized to empty string (never random Unsplash)');

  // Test blob: URL rejection
  const blobUrl = 'blob:http://localhost:5173/3f2a1b0c-4d5e';
  const savedBlob = saveImageIfBase64(blobUrl);
  if (savedBlob !== '') {
    throw new Error(`Expected saveImageIfBase64 to reject blob URL, got: "${savedBlob}"`);
  }
  console.log('✓ Verified: Transient blob: URLs rejected cleanly');

  // ─────────────────────────────────────────────────────────────
  // 6. Profile Synchronization Scope: Preserve Custom Service Images
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 6. Testing Profile Sync Scope & Service Image Preservation ---');
  const providerDoc = await Provider.findOne({ email: testProviderEmail });

  // Add a custom service with its own distinct image
  const customServiceImage = 'http://localhost:5000/uploads/custom_fan_motor_repair.png';
  const customService = await Service.create({
    providerEmail: testProviderEmail,
    providerId: providerDoc._id,
    name: 'Custom Ceiling Fan Rewinding',
    category: 'Electrician',
    description: 'Motor coil rewinding and bearing replacement.',
    price: 650,
    pricingUnit: 'Per Service',
    image: customServiceImage
  });

  // Now update provider's profile photo
  const newProfilePhoto = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAEklEQVR42mNk+M/AwAAEDBQAACwBA/9V4t0AAAAASUVORK5CYII=';
  const updateProfileRes = await fetch(`${BASE_URL}/provider/profile/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testProviderEmail,
      profilePhoto: newProfilePhoto,
      fullName: 'Provider Security Expert'
    })
  });
  const updateProfileData = await updateProfileRes.json();
  if (!updateProfileData.success) throw new Error(`Profile update failed: ${updateProfileData.message}`);

  // Verify: custom service image was NOT overwritten!
  const recheckedCustomService = await Service.findById(customService._id);
  if (recheckedCustomService.image !== customServiceImage) {
    throw new Error(`Custom service image was overwritten! Expected ${customServiceImage}, got ${recheckedCustomService.image}`);
  }
  console.log('✓ Verified: Unrelated custom service images preserved during provider profile photo update');

  // Verify standard service image WAS synchronized with the new photo
  const standardService = await Service.findOne({ providerId: providerDoc._id, name: 'Electrician Standard Service' });
  const updatedProvDoc = await Provider.findOne({ email: testProviderEmail });
  if (standardService && standardService.image !== updatedProvDoc.photo) {
    throw new Error('Standard service image was not synchronized with new provider photo!');
  }
  console.log('✓ Verified: Standard service image accurately synchronized with new photo');

  console.log('\n======================================================');
  console.log('🎉 ALL SECURITY & PASSWORDS TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
  await mongoose.disconnect();
}

runSecurityTests().catch(async (err) => {
  console.error('\n❌ TEST FAILED:', err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
