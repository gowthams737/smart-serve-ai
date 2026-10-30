import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import User from './models/User.js';
import Provider from './models/Provider.js';
import Service from './models/Service.js';
import dotenv from 'dotenv';
dotenv.config();

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('================================================================');
  console.log('   TEST: REMOVE EARNINGS PAGE & TOTAL SERVICES ON DASHBOARD     ');
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

  // --- 1. Static Verification of Codebase ---
  console.log('--- 1. Frontend Navigation & Route Removal Verification ---');

  // Verify Earnings.jsx does not exist
  const earningsPath = path.resolve('src/pages/provider/Earnings.jsx');
  assert(!fs.existsSync(earningsPath), 'Earnings.jsx file has been completely removed');

  // Verify Sidebar.jsx
  const sidebarContent = fs.readFileSync(path.resolve('src/components/provider/Sidebar.jsx'), 'utf-8');
  assert(!sidebarContent.includes("name: 'Earnings'"), 'Sidebar.jsx does not contain Earnings menu item');
  assert(!sidebarContent.includes("'/provider/earnings'"), 'Sidebar.jsx does not contain /provider/earnings route link');
  assert(!sidebarContent.includes('IndianRupee'), 'Sidebar.jsx does not import or use IndianRupee icon');

  // Verify App.jsx
  const appContent = fs.readFileSync(path.resolve('src/App.jsx'), 'utf-8');
  assert(!appContent.includes('ProviderEarnings'), 'App.jsx does not import ProviderEarnings');
  assert(!appContent.includes('path="/provider/earnings"'), 'App.jsx does not define /provider/earnings route');

  // Verify Dashboard.jsx
  const dashboardContent = fs.readFileSync(path.resolve('src/pages/provider/Dashboard.jsx'), 'utf-8');
  assert(!dashboardContent.includes('Total Earnings'), 'Dashboard.jsx does not contain "Total Earnings"');
  assert(dashboardContent.includes('title="Total Services"'), 'Dashboard.jsx contains title="Total Services"');
  assert(dashboardContent.includes('servicesCount'), 'Dashboard.jsx binds Total Services to servicesCount');
  assert(!dashboardContent.includes('getEarnings'), 'Dashboard.jsx does not fetch or depend on getEarnings()');
  assert(!dashboardContent.includes('IndianRupee'), 'Dashboard.jsx does not import or use IndianRupee icon');

  // Verify preservation of all other dashboard cards
  assert(dashboardContent.includes('title="Active Bookings"'), 'Preserved "Active Bookings" StatsCard');
  assert(dashboardContent.includes('title="Completed Jobs"'), 'Preserved "Completed Jobs" StatsCard');
  assert(dashboardContent.includes('title="Average Rating"'), 'Preserved "Average Rating" StatsCard');
  assert(dashboardContent.includes('Booking Requests'), 'Preserved "Booking Requests" section');
  assert(dashboardContent.includes('Ongoing Services'), 'Preserved "Ongoing Services" section');
  assert(dashboardContent.includes('<ProfileCard'), 'Preserved ProfileCard');
  assert(dashboardContent.includes('System Alerts'), 'Preserved System Alerts panel');

  // --- 2. Dynamic Backend & MongoDB Verification ---
  console.log('\n--- 2. MongoDB & API Service Count Verification ---');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/smartserve');
  console.log('Connected to MongoDB directly for validation.');

  const testEmailA = `provider_serv_a_${Date.now()}@test.com`;
  const testEmailB = `provider_serv_b_${Date.now()}@test.com`;

  try {
    // 2a. Register Provider A
    const regResA = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Provider Service Counter A',
        email: testEmailA,
        phone: '9843077771',
        password: 'Password123!',
        role: 'Provider',
        category: 'Home Cleaning',
        experience: 5,
        serviceRate: 500,
        pricingUnit: 'Per Visit'
      })
    });
    const regDataA = await regResA.json();
    assert(regDataA.success === true, 'Provider A registered successfully');

    // Upon registration, Provider A has 1 initial standard service
    const servicesResA1 = await fetch(`${API_BASE}/provider/services/${testEmailA}`);
    const servicesDataA1 = await servicesResA1.json();
    assert(servicesDataA1.success === true, 'Fetched services for Provider A');
    assert(servicesDataA1.services.length === 1, `Provider A initial service count is 1 (actual: ${servicesDataA1.services.length})`);

    // 2b. Register Provider B with Plumber category
    const regResB = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Provider Service Counter B',
        email: testEmailB,
        phone: '9843077772',
        password: 'Password123!',
        role: 'Provider',
        category: 'Plumbing',
        experience: 7,
        serviceRate: 400,
        pricingUnit: 'Per Visit'
      })
    });
    const regDataB = await regResB.json();
    assert(regDataB.success === true, 'Provider B registered successfully');

    // 2c. Add 2 more services for Provider A
    console.log('\n--- 3. Adding Services for Provider A ---');
    const addRes1 = await fetch(`${API_BASE}/provider/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmailA,
        name: 'Bathroom Deep Cleaning',
        category: 'Home Cleaning',
        description: 'Sanitizing and descaling tiles',
        price: 699,
        estimatedDuration: '1.5 hours'
      })
    });
    const addData1 = await addRes1.json();
    assert(addData1.success === true, 'Added second service for Provider A');

    const addRes2 = await fetch(`${API_BASE}/provider/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmailA,
        name: 'Kitchen Degreasing Service',
        category: 'Home Cleaning',
        description: 'Complete degreasing of chimney and counters',
        price: 899,
        estimatedDuration: '2 hours'
      })
    });
    const addData2 = await addRes2.json();
    assert(addData2.success === true, 'Added third service for Provider A');

    // Fetch Provider A services again
    const servicesResA2 = await fetch(`${API_BASE}/provider/services/${testEmailA}`);
    const servicesDataA2 = await servicesResA2.json();
    assert(servicesDataA2.services.length === 3, `Provider A service count updated to 3 (actual: ${servicesDataA2.services.length})`);

    // Fetch Provider B services - must still be 1 (strictly isolated)
    const servicesResB = await fetch(`${API_BASE}/provider/services/${testEmailB}`);
    const servicesDataB = await servicesResB.json();
    assert(servicesDataB.services.length === 1, `Provider B service count remained 1 (isolation verified: ${servicesDataB.services.length})`);

    // Verify directly in MongoDB Service collection
    const mongoCountA = await Service.countDocuments({ providerEmail: testEmailA.toLowerCase() });
    assert(mongoCountA === 3, `MongoDB Service count for Provider A matches API: ${mongoCountA}`);

    // 2d. Delete a service from Provider A and verify count decrements
    console.log('\n--- 4. Deleting a Service from Provider A ---');
    const delRes = await fetch(`${API_BASE}/provider/services/${addData1.service._id}?email=${encodeURIComponent(testEmailA)}`, {
      method: 'DELETE'
    });
    const delData = await delRes.json();
    assert(delData.success === true, 'Deleted service from Provider A');

    const servicesResA3 = await fetch(`${API_BASE}/provider/services/${testEmailA}`);
    const servicesDataA3 = await servicesResA3.json();
    assert(servicesDataA3.services.length === 2, `Provider A service count decremented to 2 (actual: ${servicesDataA3.services.length})`);

    // 2e. Test Provider with 0 services
    console.log('\n--- 5. Provider with 0 Services ---');
    // Delete remaining services for Provider A
    for (const s of servicesDataA3.services) {
      await fetch(`${API_BASE}/provider/services/${s._id}?email=${encodeURIComponent(testEmailA)}`, {
        method: 'DELETE'
      });
    }
    const servicesResAEmpty = await fetch(`${API_BASE}/provider/services/${testEmailA}`);
    const servicesDataAEmpty = await servicesResAEmpty.json();
    assert(servicesDataAEmpty.services.length === 0, `Provider with no services returns 0 (actual: ${servicesDataAEmpty.services.length})`);

  } finally {
    console.log('\n--- 6. Cleaning Up Test Data ---');
    const userA = await User.findOne({ email: testEmailA.toLowerCase() });
    if (userA) {
      await Provider.deleteOne({ user: userA._id });
      await Service.deleteMany({ providerEmail: testEmailA.toLowerCase() });
      await User.deleteOne({ _id: userA._id });
    }
    const userB = await User.findOne({ email: testEmailB.toLowerCase() });
    if (userB) {
      await Provider.deleteOne({ user: userB._id });
      await Service.deleteMany({ providerEmail: testEmailB.toLowerCase() });
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
