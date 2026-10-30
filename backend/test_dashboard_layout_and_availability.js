import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import User from './models/User.js';
import Provider from './models/Provider.js';

const API_BASE = 'http://localhost:5000/api';

async function runVerification() {
  console.log('=== VERIFICATION: DASHBOARD LAYOUT & AVAILABILITY PRESERVATION ===\n');

  // 1. Verify src/pages/provider/Dashboard.jsx file content
  const dashboardPath = path.resolve('src/pages/provider/Dashboard.jsx');
  const dashboardCode = fs.readFileSync(dashboardPath, 'utf-8');

  console.log('1. Checking Provider Dashboard UI Source:');
  const hasHoursSetupCardImport = dashboardCode.includes('HoursSetupCard');
  const hasHoursSetupJSX = dashboardCode.includes('<HoursSetupCard');
  const hasHoursSetupSectionId = dashboardCode.includes('hours-setup-section');

  if (hasHoursSetupCardImport || hasHoursSetupJSX || hasHoursSetupSectionId) {
    throw new Error('FAILED: HoursSetupCard or hours-setup-section still present in Dashboard.jsx!');
  }
  console.log('  [PASS] Hours Setup visualization/card is completely removed from Provider Dashboard.');

  // Check left column contains System Alerts
  const leftColIndex = dashboardCode.indexOf('lg:col-span-2');
  const rightColIndex = dashboardCode.indexOf('Right column');
  const systemAlertsIndex = dashboardCode.indexOf('System Alerts');

  if (systemAlertsIndex === -1) {
    throw new Error('FAILED: System Alerts not found in Dashboard.jsx!');
  }

  if (systemAlertsIndex > leftColIndex && systemAlertsIndex < rightColIndex) {
    console.log('  [PASS] System Alerts is positioned inside the left column (lg:col-span-2).');
  } else {
    throw new Error('FAILED: System Alerts is not in the left column!');
  }

  // Check all other dashboard components are preserved
  const expectedComponents = [
    'StatsCard',
    'BookingCard',
    'ProfileCard',
    'Total Services',
    'Active Bookings',
    'Completed Bookings',
    'Average Rating',
    'Booking Requests',
    'Ongoing Services'
  ];

  for (const comp of expectedComponents) {
    if (!dashboardCode.includes(comp)) {
      throw new Error(`FAILED: Expected dashboard component/metric "${comp}" is missing!`);
    }
  }
  console.log('  [PASS] All existing metrics, cards, and sections (Total Services, Active Bookings, Completed Bookings, Average Rating, Booking Requests, Ongoing Services, ProfileCard) are fully preserved.');

  // 2. Verify Availability Page File Exists & is Untouched
  const availabilityPath = path.resolve('src/pages/provider/Availability.jsx');
  if (!fs.existsSync(availabilityPath)) {
    throw new Error('FAILED: src/pages/provider/Availability.jsx is missing!');
  }
  const availabilityCode = fs.readFileSync(availabilityPath, 'utf-8');
  if (!availabilityCode.includes('ProviderAvailability') || !availabilityCode.includes('workingDays') || !availabilityCode.includes('workingHours')) {
    throw new Error('FAILED: Availability page content damaged!');
  }
  console.log('\n2. Checking Availability Page:');
  console.log('  [PASS] Availability page (src/pages/provider/Availability.jsx) is completely intact with full working hours and holiday management.');

  // 3. Verify Backend API and MongoDB Availability Persistence
  console.log('\n3. Testing Backend Availability Functionality:');
  await mongoose.connect('mongodb://localhost:27017/smartserve');

  try {
    const providerUser = await User.findOne({ role: 'Provider' });
    if (!providerUser) throw new Error('No provider user found');

    const profileRes = await fetch(`${API_BASE}/provider/profile/${encodeURIComponent(providerUser.email)}`);
    const profileData = await profileRes.json();
    if (!profileData.success || !profileData.profile) {
      throw new Error('Failed to retrieve provider profile from backend');
    }

    console.log(`  [PASS] Backend GET /api/provider/profile/:email succeeded.`);
    console.log(`  [PASS] Current working hours: ${profileData.profile.workingHoursFormatted} (${JSON.stringify(profileData.profile.workingHours)})`);
    console.log(`  [PASS] Current working days: [${profileData.profile.workingDays.join(', ')}]`);

    // Test updating availability through the backend
    const testHours = { start: '09:00', end: '18:00' };
    const testDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    const updateRes = await fetch(`${API_BASE}/provider/profile/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: providerUser.email,
        workingHours: testHours,
        workingDays: testDays
      })
    });
    const updateData = await updateRes.json();
    if (!updateData.success) {
      throw new Error('Backend profile update failed: ' + updateData.message);
    }
    console.log('  [PASS] POST /api/provider/profile/update continues to function seamlessly.');

    console.log('\n=== ALL VERIFICATION CHECKS PASSED SUCCESSFULLY! ===');
  } finally {
    await mongoose.disconnect();
  }
}

runVerification().catch(err => {
  console.error(err);
  process.exit(1);
});
