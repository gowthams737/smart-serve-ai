import mongoose from 'mongoose';
import User from './models/User.js';
import Provider from './models/Provider.js';
import Service from './models/Service.js';
import dotenv from 'dotenv';
dotenv.config();

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('--- Starting Service Profile Image Reuse & Sync Tests ---');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartserve');
  console.log('Connected to MongoDB directly for validation.');

  const testEmail1 = `provider_img_test_${Date.now()}@test.com`;
  const testEmail2 = `provider_other_${Date.now()}@test.com`;
  const initialPhoto1 = 'https://images.example.com/profiles/gowtham_custom_avatar_1.jpg';
  const updatedPhoto1 = 'https://images.example.com/profiles/gowtham_custom_avatar_2_updated.jpg';
  const photo2 = 'https://images.example.com/profiles/priya_custom_avatar.jpg';

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Register Provider 1 with custom profile image
    console.log('\nStep 1: Register Provider 1 with profile image...');
    const regRes1 = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test Photo Provider 1',
        email: testEmail1,
        phone: '9843011111',
        password: 'Password123!',
        role: 'Provider',
        category: 'Home Cleaning',
        experience: 5,
        serviceRate: 499,
        pricingUnit: 'Per Visit',
        bio: 'Expert home cleaning with quality service.',
        profilePhoto: initialPhoto1
      })
    });
    const regData1 = await regRes1.json();
    assert(regData1.success === true, 'Provider 1 registration succeeded');

    // Verify initial service created with provider's profile photo
    const initialService1 = await Service.findOne({ providerEmail: testEmail1.toLowerCase() });
    assert(initialService1 !== null, 'Initial service created in MongoDB');
    assert(initialService1?.image === initialPhoto1, `Initial service has provider photo: ${initialService1?.image}`);

    // 2. Add second service through /api/provider/services WITHOUT providing image
    console.log('\nStep 2: Add second service without providing image...');
    const addRes1 = await fetch(`${API_BASE}/provider/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail1,
        name: 'Deep Kitchen Degreasing',
        category: 'Home Cleaning',
        description: 'Kitchen degreasing and deep scrub',
        price: 799,
        estimatedDuration: '2 hours'
        // No image field passed!
      })
    });
    const addData1 = await addRes1.json();
    assert(addData1.success === true, 'Adding second service succeeded');
    assert(addData1.service?.image === initialPhoto1, `New service automatically reused provider photo: ${addData1.service?.image}`);

    // Verify in MongoDB
    const service2Doc = await Service.findById(addData1.service._id);
    assert(service2Doc?.image === initialPhoto1, 'Service 2 in MongoDB persisted with provider profile photo');

    // 3. Add third service where caller passed the legacy hardcoded unsplash fallback
    console.log('\nStep 3: Add third service passing legacy hardcoded unsplash URL...');
    const addRes2 = await fetch(`${API_BASE}/provider/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail1,
        name: 'Window & Glass Polishing',
        category: 'Home Cleaning',
        description: 'Complete interior and exterior window polish',
        price: 599,
        estimatedDuration: '1.5 hours',
        image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500' // Legacy unsplash fallback
      })
    });
    const addData2 = await addRes2.json();
    assert(addData2.success === true, 'Adding third service succeeded');
    assert(addData2.service?.image === initialPhoto1, `Legacy hardcoded unsplash URL was replaced with registered provider photo: ${addData2.service?.image}`);

    // 4. Verify Customer Portal API GET /api/customer/providers returns services with provider photo
    console.log('\nStep 4: Verify Customer Portal GET /api/customer/providers pricing array...');
    const custRes = await fetch(`${API_BASE}/customer/providers`);
    const custData = await custRes.json();
    const foundProvider = custData.providers.find(p => p.email.toLowerCase() === testEmail1.toLowerCase());
    assert(foundProvider !== undefined, 'Provider found in customer API');
    assert(foundProvider?.photo === initialPhoto1, `Customer API provider photo matches registered photo: ${foundProvider?.photo}`);
    assert(Array.isArray(foundProvider?.pricing) && foundProvider.pricing.length >= 3, `Provider has all 3 services in pricing array`);
    const allServicesHavePhoto = foundProvider.pricing.every(item => item.image === initialPhoto1);
    assert(allServicesHavePhoto === true, 'All services in customer portal display provider profile image');

    // 5. Register Provider 2 to verify isolation
    console.log('\nStep 5: Register Provider 2 with different photo...');
    const regRes2 = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test Photo Provider 2',
        email: testEmail2,
        phone: '9843022222',
        password: 'Password123!',
        role: 'Provider',
        category: 'Plumbing',
        experience: 8,
        serviceRate: 350,
        pricingUnit: 'Per Visit',
        bio: 'Certified master plumber.',
        profilePhoto: photo2
      })
    });
    const regData2 = await regRes2.json();
    assert(regData2.success === true, 'Provider 2 registration succeeded');

    const provider2Service = await Service.findOne({ providerEmail: testEmail2.toLowerCase() });
    assert(provider2Service?.image === photo2, `Provider 2 service uses photo 2: ${provider2Service?.image}`);
    assert(provider2Service?.image !== initialPhoto1, 'Provider 2 service does not use Provider 1 photo');

    // 6. Update Provider 1 photo via /api/provider/profile/update and verify synchronization
    console.log('\nStep 6: Update Provider 1 profile image and verify automatic sync...');
    const updateRes = await fetch(`${API_BASE}/provider/profile/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail1,
        profilePhoto: updatedPhoto1
      })
    });
    const updateData = await updateRes.json();
    assert(updateData.success === true, 'Profile update succeeded');

    // Verify all services in MongoDB for Provider 1 were updated to updatedPhoto1
    const p1Services = await Service.find({ providerEmail: testEmail1.toLowerCase() });
    assert(p1Services.length >= 3, `Found ${p1Services.length} services for Provider 1`);
    const allUpdated = p1Services.every(s => s.image === updatedPhoto1);
    assert(allUpdated === true, `All existing services for Provider 1 automatically synchronized to new photo: ${updatedPhoto1}`);

    // Verify Provider 2 was unaffected
    const p2Services = await Service.find({ providerEmail: testEmail2.toLowerCase() });
    const p2Unaffected = p2Services.every(s => s.image === photo2);
    assert(p2Unaffected === true, 'Provider 2 services remained completely unaffected');

    // 7. Verify Customer Portal now returns the updated photo across all services
    console.log('\nStep 7: Verify Customer Portal returns updated image for services...');
    const custRes2 = await fetch(`${API_BASE}/customer/providers`);
    const custData2 = await custRes2.json();
    const foundProviderAfterUpdate = custData2.providers.find(p => p.email.toLowerCase() === testEmail1.toLowerCase());
    assert(foundProviderAfterUpdate?.photo === updatedPhoto1, 'Customer API provider photo updated');
    const allServicesHaveNewPhoto = foundProviderAfterUpdate.pricing.every(item => item.image === updatedPhoto1);
    assert(allServicesHaveNewPhoto === true, 'Customer API pricing services all show updated profile photo');

    console.log(`\nResults: ${passed} passed, ${failed} failed.`);
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    // Cleanup test data
    console.log('\nCleaning up test records...');
    const user1 = await User.findOne({ email: testEmail1.toLowerCase() });
    if (user1) {
      await Provider.deleteOne({ user: user1._id });
      await Service.deleteMany({ providerEmail: testEmail1.toLowerCase() });
      await User.deleteOne({ _id: user1._id });
    }
    const user2 = await User.findOne({ email: testEmail2.toLowerCase() });
    if (user2) {
      await Provider.deleteOne({ user: user2._id });
      await Service.deleteMany({ providerEmail: testEmail2.toLowerCase() });
      await User.deleteOne({ _id: user2._id });
    }
    await mongoose.disconnect();
    console.log('Cleanup completed and disconnected from MongoDB.');
  }

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
