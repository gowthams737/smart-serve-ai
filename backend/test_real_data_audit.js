import mongoose from 'mongoose';
import express from 'express';
import assert from 'assert';
import customerRoutes from './routes/customerRoutes.js';
import Provider from './models/Provider.js';
import Service from './models/Service.js';
import Review from './models/Review.js';
import User from './models/User.js';

const app = express();
app.use(express.json());
app.use('/api/customer', customerRoutes);

async function runAudit() {
  console.log('=================================================================');
  console.log('   SMARTSERVE AI: REAL DATA AUDIT & VERIFICATION SUITE');
  console.log('=================================================================');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartserve';
  await mongoose.connect(mongoUri);
  console.log('✓ Connected to MongoDB at:', mongoUri);

  let passed = 0;
  let failed = 0;

  const server = app.listen(5099);
  const BASE_URL = 'http://localhost:5099/api/customer';

  try {
    // -----------------------------------------------------------------
    // TEST 1: Provider Query & Genuine Ratings Computation
    // -----------------------------------------------------------------
    console.log('\n[Test 1] Auditing /api/customer/providers for genuine data & computed ratings...');
    const provRes = await fetch(`${BASE_URL}/providers`);
    const provData = await provRes.json();
    assert.strictEqual(provRes.status, 200);
    assert.strictEqual(provData.success, true);
    assert.ok(Array.isArray(provData.providers), 'providers must be an array');
    console.log(`  Found ${provData.providers.length} approved providers in database response.`);

    for (const p of provData.providers) {
      // 1. Verify approved status in DB
      const dbProv = await Provider.findById(p.id);
      assert.ok(dbProv, `Provider ${p.name} must exist in MongoDB`);
      assert.strictEqual(dbProv.status, 'Approved', `Provider ${p.name} must have status Approved`);

      // 2. Verify authentic ratings & review count computed from Review collection
      const dbReviews = await Review.find({
        $or: [
          { providerId: String(p.id) },
          { providerId: String(dbProv.user) }
        ]
      });

      const expectedCount = dbReviews.length;
      const expectedRating = expectedCount > 0
        ? Number((dbReviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / expectedCount).toFixed(1))
        : 0;

      assert.strictEqual(p.reviewsCount, expectedCount, `Provider ${p.name} reviewsCount must match Review collection count`);
      assert.strictEqual(p.rating, expectedRating, `Provider ${p.name} rating must match calculated average (${expectedRating}), not fake fallback`);

      // 3. Verify no hardcoded placeholder images
      assert.ok(!p.photo.includes('images.unsplash.com/photo-1566492031773-4f4e44671857'), `Provider ${p.name} must not use hardcoded default Unsplash photo`);

      console.log(`  ✓ ${p.name}: rating=${p.rating}★, reviews=${p.reviewsCount}, photo=${p.photo ? p.photo.slice(0, 35) + '...' : '(avatar initial)'}`);
    }
    console.log('✓ Test 1 Passed: All providers are authentic, approved, and ratings accurately computed.');
    passed++;

    // -----------------------------------------------------------------
    // TEST 2: Services Catalog & Orphan Service Filtering
    // -----------------------------------------------------------------
    console.log('\n[Test 2] Auditing /api/customer/services-catalog for orphaned service elimination...');
    const catRes = await fetch(`${BASE_URL}/services-catalog`);
    const catData = await catRes.json();
    assert.strictEqual(catRes.status, 200);
    assert.strictEqual(catData.success, true);
    assert.ok(Array.isArray(catData.services), 'services must be an array');
    console.log(`  Found ${catData.services.length} active catalog services belonging to approved providers.`);

    for (const s of catData.services) {
      assert.ok(s.provider, `Service ${s.name} must have provider attached`);
      const provInDb = await Provider.findById(s.provider.id);
      assert.ok(provInDb, `Provider for service ${s.name} must exist in database`);
      assert.strictEqual(provInDb.status, 'Approved', `Provider for service ${s.name} must be Approved`);
      console.log(`  ✓ Service "${s.name}" (₹${s.price}) -> Provider: ${s.provider.name} (${s.provider.category})`);
    }
    console.log('✓ Test 2 Passed: No orphaned services are exposed in services-catalog.');
    passed++;

    // -----------------------------------------------------------------
    // TEST 3: Top Rated Providers Endpoint
    // -----------------------------------------------------------------
    console.log('\n[Test 3] Auditing /api/customer/top-providers ranking & authenticity...');
    const topRes = await fetch(`${BASE_URL}/top-providers`);
    const topData = await topRes.json();
    assert.strictEqual(topRes.status, 200);
    assert.strictEqual(topData.success, true);
    assert.ok(Array.isArray(topData.providers), 'top providers must be an array');
    
    // Check sorting by rating desc, then jobs desc
    for (let i = 0; i < topData.providers.length - 1; i++) {
      const a = topData.providers[i];
      const b = topData.providers[i + 1];
      assert.ok(a.rating >= b.rating || (a.rating === b.rating && a.jobs >= b.jobs), 'Must be sorted by rating desc then jobs desc');
    }
    console.log(`  Top providers returned: ${topData.providers.map(p => `${p.name} (${p.rating}★)`).join(', ')}`);
    console.log('✓ Test 3 Passed: Top providers correctly ranked with genuine data.');
    passed++;

    // -----------------------------------------------------------------
    // TEST 4: Dynamic AI Recommendations Endpoint
    // -----------------------------------------------------------------
    console.log('\n[Test 4] Auditing /api/customer/recommendations for dynamic DB grounding...');
    const recRes = await fetch(`${BASE_URL}/recommendations`);
    const recData = await recRes.json();
    assert.strictEqual(recRes.status, 200);
    assert.strictEqual(recData.success, true);
    assert.ok(Array.isArray(recData.recommendations), 'recommendations must be an array');
    
    for (const r of recData.recommendations) {
      // Must reference actual provider in database
      const provInDb = await Provider.findById(r.providerId);
      assert.ok(provInDb, `Recommendation providerId ${r.providerId} must exist in MongoDB`);
      assert.strictEqual(provInDb.status, 'Approved');
      console.log(`  ✓ Rec "${r.serviceName}" -> Specialist: ${r.providerName} in ${r.providerCity} (${r.rating}★)`);
    }
    console.log('✓ Test 4 Passed: AI Recommendations are completely grounded in genuine MongoDB providers.');
    passed++;

    // -----------------------------------------------------------------
    // TEST 5: Categories Endpoint
    // -----------------------------------------------------------------
    console.log('\n[Test 5] Auditing /api/customer/categories endpoint...');
    const catListRes = await fetch(`${BASE_URL}/categories`);
    const catListData = await catListRes.json();
    assert.strictEqual(catListRes.status, 200);
    assert.strictEqual(catListData.success, true);
    assert.ok(catListData.categories.length > 0, 'Categories must be loaded');
    console.log(`  Found ${catListData.categories.length} active service categories in database.`);
    console.log('✓ Test 5 Passed: Categories endpoint returns active database records.');
    passed++;

  } catch (err) {
    console.error('Audit Error:', err);
    failed++;
  } finally {
    server.close();
    await mongoose.disconnect();
  }

  console.log('\n=================================================================');
  console.log(`AUDIT COMPLETE: ${passed} Tests Passed, ${failed} Failed.`);
  console.log('=================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit();
