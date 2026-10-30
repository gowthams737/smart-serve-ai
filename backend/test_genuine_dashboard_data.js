import mongoose from 'mongoose';
import User from './models/User.js';
import Provider from './models/Provider.js';
import Service from './models/Service.js';
import Booking from './models/Booking.js';
import Review from './models/Review.js';
import dotenv from 'dotenv';
dotenv.config();

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('================================================================');
  console.log('   TEST: GENUINE PROVIDER DASHBOARD DATA & TREND ACCURACY       ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartserve');
  console.log('Connected to MongoDB directly for validation.');

  const testEmailA = `dashboard_prov_a_${Date.now()}@test.com`;
  const testEmailB = `dashboard_prov_b_${Date.now()}@test.com`;

  try {
    // -------------------------------------------------------------------------
    // 1. Newly Registered Provider - Strict Zero/Initial State & No Fake Data
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Testing Fresh Provider Initial Dashboard Stats ---');
    const regResA = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Genuine Stats Provider A',
        email: testEmailA,
        phone: '9843088881',
        password: 'Password123!',
        role: 'Provider',
        category: 'Electrical Work',
        experience: 4,
        serviceRate: 450,
        pricingUnit: 'Per Hour'
      })
    });
    const regDataA = await regResA.json();
    assert(regDataA.success === true, 'Provider A registered successfully');

    // Fetch dashboard stats via API
    const statsRes1 = await fetch(`${API_BASE}/provider/stats/${testEmailA}`);
    const statsData1 = await statsRes1.json();
    assert(statsData1.success === true, 'GET /provider/stats/:email succeeded');

    // Verify initial values
    assert(statsData1.stats.totalServices.value === 1, `Total Services equals 1 (registered standard service)`);
    assert(statsData1.stats.activeBookings.value === 0, `Active Bookings equals 0 (no bookings yet)`);
    assert(statsData1.stats.completedJobs.value === 0, `Completed Jobs equals 0`);
    assert(statsData1.stats.averageRating.reviewsCount === 0, `Reviews Count equals 0`);
    assert(statsData1.stats.averageRating.hasReviews === false, `hasReviews is false (no fake reviews)`);

    // Verify trends have NO fake numbers
    assert(statsData1.stats.totalServices.trend.hasHistoricalData === false, 'Total Services trend reports not enough historical data (no fake +15%)');
    assert(statsData1.stats.activeBookings.trend.hasHistoricalData === false, 'Active Bookings trend reports not enough historical data (no fake +4%)');
    assert(statsData1.stats.completedJobs.trend.hasHistoricalData === false, 'Completed Jobs trend reports not enough historical data (no fake +22%)');
    assert(statsData1.stats.averageRating.trend.hasHistoricalData === false, 'Rating trend reports not enough historical data (no fake Stable)');

    // -------------------------------------------------------------------------
    // 2. Data Isolation - Provider B has completely separate stats
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing Provider Isolation ---');
    const regResB = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Isolated Provider B',
        email: testEmailB,
        phone: '9843088882',
        password: 'Password123!',
        role: 'Provider',
        category: 'Carpentry',
        experience: 6,
        serviceRate: 550,
        pricingUnit: 'Per Visit'
      })
    });
    const regDataB = await regResB.json();
    assert(regDataB.success === true, 'Provider B registered successfully');

    // -------------------------------------------------------------------------
    // 3. Adding Services for Provider A and Verifying Real-Time Metric Updates
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing Service Creation & Count Accuracy ---');
    const addSvcRes = await fetch(`${API_BASE}/provider/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmailA,
        name: 'Inverter Wiring & Installation',
        category: 'Electrical Work',
        description: 'Complete backup inverter setup',
        price: 1500,
        estimatedDuration: '3 hours'
      })
    });
    const addSvcData = await addSvcRes.json();
    assert(addSvcData.success === true, 'Added new service for Provider A');

    const statsRes2 = await fetch(`${API_BASE}/provider/stats/${testEmailA}`);
    const statsData2 = await statsRes2.json();
    assert(statsData2.stats.totalServices.value === 2, `Provider A Total Services updated to 2`);

    // Verify Provider B is still 1
    const statsResB = await fetch(`${API_BASE}/provider/stats/${testEmailB}`);
    const statsDataB = await statsResB.json();
    assert(statsDataB.stats.totalServices.value === 1, `Provider B Total Services remained untouched at 1`);

    // -------------------------------------------------------------------------
    // 4. Booking Lifecycle & Dashboard Active / Completed Stats
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing Booking Lifecycle Stats (Pending -> Active -> Completed) ---');
    // Create a booking for Provider A
    const bookRes = await fetch(`${API_BASE}/customer/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Kavitha Customer',
        customerEmail: 'kavitha.c@test.com',
        customerPhone: '9843000000',
        providerName: 'Genuine Stats Provider A',
        providerEmail: testEmailA,
        providerPhone: '9843088881',
        date: '2026-10-28',
        time: '11:00 AM',
        serviceType: 'Electrical Work',
        serviceName: 'Inverter Wiring & Installation',
        amount: 1500,
        location: 'RS Puram, Coimbatore'
      })
    });
    const bookData = await bookRes.json();
    assert(bookData.success === true, 'Booking created in Pending status');

    // Pending bookings list
    const pendingListRes = await fetch(`${API_BASE}/provider/bookings/${testEmailA}`);
    const pendingListData = await pendingListRes.json();
    const pendingA = pendingListData.bookings.filter(b => b.status === 'Pending');
    assert(pendingA.length === 1, 'Provider A has exactly 1 pending booking');

    // Accept booking -> Active
    const acceptRes = await fetch(`${API_BASE}/provider/bookings/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bookData.booking._id, status: 'Active' })
    });
    const acceptData = await acceptRes.json();
    assert(acceptData.success === true, 'Booking status updated to Active');

    // Verify Active Bookings count on dashboard stats
    const statsRes3 = await fetch(`${API_BASE}/provider/stats/${testEmailA}`);
    const statsData3 = await statsRes3.json();
    assert(statsData3.stats.activeBookings.value === 1, 'Active Bookings count incremented to 1');
    assert(statsData3.stats.completedJobs.value === 0, 'Completed Jobs is still 0');

    // Complete booking -> Completed
    const completeRes = await fetch(`${API_BASE}/provider/bookings/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bookData.booking._id, status: 'Completed' })
    });
    const completeData = await completeRes.json();
    assert(completeData.success === true, 'Booking status updated to Completed');

    // Verify Active Bookings decremented to 0 and Completed Jobs incremented to 1
    const statsRes4 = await fetch(`${API_BASE}/provider/stats/${testEmailA}`);
    const statsData4 = await statsRes4.json();
    assert(statsData4.stats.activeBookings.value === 0, 'Active Bookings decremented back to 0');
    assert(statsData4.stats.completedJobs.value === 1, 'Completed Jobs incremented to 1');

    // -------------------------------------------------------------------------
    // 5. Genuine Reviews & Rating Calculation
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Testing Genuine Reviews and Rating Calculation ---');
    const userA = await User.findOne({ email: testEmailA.toLowerCase() });
    const providerA = await Provider.findOne({ user: userA._id });

    // Insert 2 genuine reviews directly into Review collection
    await Review.create({
      bookingId: bookData.booking.bookingId,
      providerId: providerA._id.toString(),
      customerName: 'Kavitha Customer',
      rating: 4,
      comment: 'Very punctual and neat electrical work.',
      serviceTaken: 'Inverter Wiring & Installation'
    });
    await Review.create({
      bookingId: 'bk_manual_test_2',
      providerId: providerA._id.toString(),
      customerName: 'Suresh Kumar',
      rating: 5,
      comment: 'Excellent wiring setup. Highly recommended!',
      serviceTaken: 'Inverter Wiring & Installation'
    });

    const statsRes5 = await fetch(`${API_BASE}/provider/stats/${testEmailA}`);
    const statsData5 = await statsRes5.json();
    assert(statsData5.stats.averageRating.reviewsCount === 2, 'Reviews count is accurately 2');
    assert(statsData5.stats.averageRating.value === 4.5, `Average Rating accurately calculated as 4.5 ((4 + 5) / 2 = 4.5)`);
    assert(statsData5.stats.averageRating.hasReviews === true, 'hasReviews is true after receiving real customer reviews');

    // -------------------------------------------------------------------------
    // 6. Genuine Historical Trend Calculation (Previous Period vs Current Period)
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Testing Genuine Trend Comparison with Real Historical Records ---');
    const fortyDaysAgo = new Date(Date.now() - (40 * 24 * 60 * 60 * 1000));

    // Simulate 2 historical bookings created in previous period (40 days ago)
    await Booking.create({
      bookingId: 'b-hist-1',
      customerName: 'Past Customer 1',
      customerEmail: 'past1@test.com',
      customerPhone: '9843000001',
      providerName: 'Genuine Stats Provider A',
      providerEmail: testEmailA,
      providerPhone: '9843088881',
      date: '2026-09-18',
      time: '10:00 AM',
      serviceType: 'Electrical Work',
      serviceName: 'Wiring',
      amount: 450,
      status: 'Completed',
      createdAt: fortyDaysAgo,
      updatedAt: fortyDaysAgo
    });
    await Booking.create({
      bookingId: 'b-hist-2',
      customerName: 'Past Customer 2',
      customerEmail: 'past2@test.com',
      customerPhone: '9843000002',
      providerName: 'Genuine Stats Provider A',
      providerEmail: testEmailA,
      providerPhone: '9843088881',
      date: '2026-09-20',
      time: '02:00 PM',
      serviceType: 'Electrical Work',
      serviceName: 'Wiring',
      amount: 450,
      status: 'Completed',
      createdAt: fortyDaysAgo,
      updatedAt: fortyDaysAgo
    });

    // Now previous 30-60 day period has 2 completed bookings.
    // Current 30-day period has 1 completed booking.
    // Comparison: ((1 - 2) / 2) * 100 = -50%
    const statsRes6 = await fetch(`${API_BASE}/provider/stats/${testEmailA}`);
    const statsData6 = await statsRes6.json();
    assert(statsData6.stats.completedJobs.trend.hasHistoricalData === true, 'Trend now has valid historical data');
    assert(statsData6.stats.completedJobs.trend.percentage === -50, `Completed Jobs trend accurately calculated: ${statsData6.stats.completedJobs.trend.percentage}%`);
    assert(statsData6.stats.completedJobs.trend.direction === 'down', 'Trend direction is "down"');
    assert(statsData6.stats.completedJobs.trend.label === 'Compared with previous 30 days', 'Trend label clearly defines the comparison period');

    // -------------------------------------------------------------------------
    // 7. Error Handling on Unauthenticated Request
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Testing Invalid/Missing Session Handling ---');
    const badStatsRes = await fetch(`${API_BASE}/provider/stats/non_existent_provider@test.com`);
    assert(badStatsRes.status === 404, 'Non-existent provider returns 404');
    const badStatsData = await badStatsRes.json();
    assert(badStatsData.success === false, 'Error message cleanly returned without fake fallback');

  } finally {
    console.log('\n--- 8. Cleaning Up Test Data ---');
    const userA = await User.findOne({ email: testEmailA.toLowerCase() });
    if (userA) {
      const p = await Provider.findOne({ user: userA._id });
      if (p) {
        await Review.deleteMany({ providerId: p._id.toString() });
        await Provider.deleteOne({ _id: p._id });
      }
      await Service.deleteMany({ providerEmail: testEmailA.toLowerCase() });
      await Booking.deleteMany({ providerEmail: testEmailA.toLowerCase() });
      await User.deleteOne({ _id: userA._id });
    }
    const userB = await User.findOne({ email: testEmailB.toLowerCase() });
    if (userB) {
      await Provider.deleteOne({ user: userB._id });
      await Service.deleteMany({ providerEmail: testEmailB.toLowerCase() });
      await Booking.deleteMany({ providerEmail: testEmailB.toLowerCase() });
      await User.deleteOne({ _id: userB._id });
    }
    await mongoose.disconnect();
    console.log('Cleanup complete and disconnected from MongoDB.');
  }

  console.log(`\n================================================================`);
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`================================================================`);

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runTests();
