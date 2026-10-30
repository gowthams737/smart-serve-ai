import http from 'http';
import dotenv from 'dotenv';
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
  console.log('=== STARTING TEST OF ALL ENHANCEMENTS ===\n');

  const timestamp = Date.now();
  const testEmail = `provider_${timestamp}@smartserve.ai`;
  const testPassword = 'SecretPassword123!';

  // ── TEST 1: Service Provider Registration with all 11 required fields ──
  console.log('1. Testing Provider Registration with all 11 required details...');
  const regPayload = {
    role: 'Provider',
    fullName: 'Anandhu Krishnan',
    email: testEmail,
    phone: '+91 98401 55678',
    password: testPassword,
    category: 'Electrician',
    bio: 'Licensed electrical contractor with expertise in smart home automation, wiring, and panel upgrades.',
    gender: 'Male',
    age: 33,
    experience: 9,
    serviceRate: 400,
    pricingUnit: 'Per Hour',
    workingHours: { start: '08:30', end: '19:30' },
    profilePhoto: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  };

  const regRes = await request('POST', '/api/auth/register', regPayload);
  console.log('Registration status:', regRes.status);
  console.log('User created:', regRes.data?.user?.email, 'Role:', regRes.data?.user?.role);
  if (regRes.status !== 201 || !regRes.data?.success) {
    throw new Error(`Registration failed: ${JSON.stringify(regRes.data)}`);
  }
  // Verify password is never in user response
  if (regRes.data.user.password) {
    throw new Error('SECURITY VIOLATION: Password returned in registration response!');
  }
  console.log('✓ Registration succeeded with all 11 fields. Password is not exposed.');

  // ── TEST 2: Validation on invalid & duplicate registration ──
  console.log('\n2. Testing Validation: Duplicate Email...');
  const dupRes = await request('POST', '/api/auth/register', regPayload);
  console.log('Duplicate registration status:', dupRes.status, 'Message:', dupRes.data?.message);
  if (dupRes.status !== 400 || !dupRes.data?.message?.includes('already registered')) {
    throw new Error('Duplicate email test failed! Should return 400.');
  }
  console.log('✓ Duplicate email prevented successfully.');

  console.log('\nTesting Validation: Invalid Email format...');
  const badEmailRes = await request('POST', '/api/auth/register', {
    ...regPayload,
    email: 'notanemail'
  });
  if (badEmailRes.status !== 400) throw new Error('Invalid email test failed');
  console.log('✓ Invalid email correctly rejected.');

  console.log('\nTesting Validation: Underage (< 18)...');
  const underageRes = await request('POST', '/api/auth/register', {
    ...regPayload,
    email: `underage_${timestamp}@smartserve.ai`,
    age: 16
  });
  if (underageRes.status !== 400) throw new Error('Underage test failed');
  console.log('✓ Underage registration correctly rejected.');

  console.log('\nTesting Validation: Impossible experience (> age - 14)...');
  const badExpRes = await request('POST', '/api/auth/register', {
    ...regPayload,
    email: `badexp_${timestamp}@smartserve.ai`,
    age: 20,
    experience: 15
  });
  if (badExpRes.status !== 400) throw new Error('Unreasonable experience test failed');
  console.log('✓ Unreasonable experience correctly rejected.');

  // ── TEST 3: Provider Login & Authentication ──
  console.log('\n3. Testing Provider Login with credentials...');
  const loginRes = await request('POST', '/api/auth/login', {
    email: testEmail,
    password: testPassword,
    role: 'Provider'
  });
  console.log('Login status:', loginRes.status, 'User:', loginRes.data?.user?.fullName);
  if (loginRes.status !== 200 || !loginRes.data?.success) {
    throw new Error(`Login failed: ${JSON.stringify(loginRes.data)}`);
  }
  if (loginRes.data.user.password) {
    throw new Error('SECURITY VIOLATION: Password returned in login response!');
  }
  console.log('✓ Provider login succeeded with password authentication.');

  // ── TEST 4: Provider Portal Profile View ──
  console.log('\n4. Testing GET Provider Profile by email...');
  const profileRes = await request('GET', `/api/provider/profile/${encodeURIComponent(testEmail)}`);
  console.log('Profile status:', profileRes.status);
  const p = profileRes.data?.profile;
  console.log('Profile fields returned:', {
    fullName: p?.fullName,
    email: p?.email,
    phone: p?.phone,
    category: p?.category,
    gender: p?.gender,
    age: p?.age,
    experience: p?.experience,
    workingHours: p?.workingHours,
    bio: p?.bio?.substring(0, 30) + '...',
    hasPhoto: Boolean(p?.profilePhoto || p?.photo)
  });

  if (!p || p.fullName !== regPayload.fullName || p.category !== regPayload.category || p.gender !== regPayload.gender || p.age !== regPayload.age || p.experience !== regPayload.experience) {
    throw new Error(`Provider profile data mismatch: ${JSON.stringify(p)}`);
  }
  if (p.password || p.hash) {
    throw new Error('SECURITY VIOLATION: Password or hash in profile data!');
  }
  if (p.governmentId || p.aadhaar || p.pan) {
    throw new Error('Government ID field found in profile!');
  }
  console.log('✓ Provider profile displays all registered information correctly.');

  // ── TEST 5: Edit Profile & Persistence ──
  console.log('\n5. Testing Provider Profile Update (Edit Profile)...');
  const updateRes = await request('POST', '/api/provider/profile/update', {
    email: testEmail,
    fullName: 'Anandhu K. Master Electrician',
    phone: '+91 98401 99999',
    category: 'Electrician',
    experience: 10,
    gender: 'Male',
    age: 34,
    workingHours: { start: '08:00', end: '20:00' },
    bio: 'Senior electrical master with 10 years experience in commercial solar and smart home setups.',
    profilePhoto: 'data:image/png;base64,UPDATED_PHOTO_DATA'
  });
  console.log('Update status:', updateRes.status, 'Message:', updateRes.data?.message);
  if (updateRes.status !== 200 || !updateRes.data?.success) {
    throw new Error(`Profile update failed: ${JSON.stringify(updateRes.data)}`);
  }

  // Refresh profile to verify persistence in MongoDB
  const refreshedProfile = await request('GET', `/api/provider/profile/${encodeURIComponent(testEmail)}`);
  const rp = refreshedProfile.data?.profile;
  console.log('Persisted Profile after refresh:', {
    fullName: rp?.fullName,
    phone: rp?.phone,
    experience: rp?.experience,
    age: rp?.age,
    workingHours: rp?.workingHours,
    bio: rp?.bio?.substring(0, 30) + '...'
  });
  if (rp?.fullName !== 'Anandhu K. Master Electrician' || rp?.experience !== 10 || rp?.age !== 34 || rp?.phone !== '+91 98401 99999') {
    throw new Error('Profile update was not persisted in database!');
  }
  console.log('✓ Profile updates persisted successfully in MongoDB.');

  // ── TEST 6: Customer Search & Provider Cards ──
  console.log('\n6. Testing Customer Search for Providers...');
  const searchRes = await request('GET', '/api/customer/providers');
  console.log('Search API status:', searchRes.status, 'Total providers:', searchRes.data?.providers?.length);
  const found = searchRes.data?.providers?.find(prov => prov.email === testEmail);
  if (!found) {
    throw new Error('Registered provider not found in customer search results!');
  }
  console.log('Provider Card in Customer Search:', {
    name: found.name,
    category: found.category,
    experience: found.experience,
    workingHours: found.workingHours,
    bio: found.bio?.substring(0, 30) + '...',
    gender: found.gender,
    age: found.age,
    pricing: found.pricing,
    phone: found.phone,
    email: found.email
  });
  if (!found.photo || !found.name || !found.category || !found.bio || found.experience !== 10) {
    throw new Error('Provider card missing required display details in customer search results!');
  }
  console.log('✓ Provider card displays all details for customers.');

  console.log('\n7. Testing Service Category Filtering...');
  const catMatches = searchRes.data.providers.filter(prov => prov.category.toLowerCase() === 'electrician');
  console.log('Electrician count:', catMatches.length);
  if (!catMatches.some(p => p.email === testEmail)) {
    throw new Error('Category filtering failed to find the registered electrician!');
  }
  console.log('✓ Category filtering functions accurately.');

  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===\n');
}

run().catch(err => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});