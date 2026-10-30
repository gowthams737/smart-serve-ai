import mongoose from 'mongoose';
import User from './models/User.js';
import Provider from './models/Provider.js';
import Service from './models/Service.js';
import Booking from './models/Booking.js';
import { formatWorkingHours } from './utils/timeFormat.js';

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('=== TEST SUITE: PROVIDER DASHBOARD HOURS SETUP & SUMMARY CARDS ===\n');
  await mongoose.connect('mongodb://localhost:27017/smartserve');

  try {
    // 1. Locate a provider
    const providerUser = await User.findOne({ role: 'Provider' });
    if (!providerUser) {
      throw new Error('No provider user found in MongoDB');
    }
    const provider = await Provider.findOne({ user: providerUser._id });
    if (!provider) {
      throw new Error('No provider record found for user ' + providerUser.email);
    }

    console.log(`[PASS] Found existing provider: ${providerUser.fullName} (${providerUser.email})`);

    // 2. Test Dashboard Stats API matches Database counts
    const statsRes = await fetch(`${API_BASE}/provider/stats/${encodeURIComponent(providerUser.email)}`);
    const statsData = await statsRes.json();
    if (!statsData.success) throw new Error('Failed to fetch provider stats: ' + statsData.message);

    const dbTotalServices = await Service.countDocuments({ providerId: provider._id });
    const dbActiveBookings = await Booking.countDocuments({ providerEmail: providerUser.email.toLowerCase(), status: 'Active' });
    const dbCompletedBookings = await Booking.countDocuments({ providerEmail: providerUser.email.toLowerCase(), status: 'Completed' });

    console.log(`\nVerifying Summary Metric Counts against MongoDB:`);
    console.log(`  - Total Services: API = ${statsData.stats.totalServices.value}, DB = ${dbTotalServices}`);
    console.log(`  - Active Bookings: API = ${statsData.stats.activeBookings.value}, DB = ${dbActiveBookings}`);
    console.log(`  - Completed Jobs / Bookings: API = ${statsData.stats.completedJobs.value}, DB = ${dbCompletedBookings}`);

    if (statsData.stats.totalServices.value !== dbTotalServices) {
      throw new Error(`Total Services mismatch! API: ${statsData.stats.totalServices.value}, DB: ${dbTotalServices}`);
    }
    if (statsData.stats.activeBookings.value !== dbActiveBookings) {
      throw new Error(`Active Bookings mismatch! API: ${statsData.stats.activeBookings.value}, DB: ${dbActiveBookings}`);
    }
    if (statsData.stats.completedJobs.value !== dbCompletedBookings) {
      throw new Error(`Completed Bookings mismatch! API: ${statsData.stats.completedJobs.value}, DB: ${dbCompletedBookings}`);
    }
    console.log('[PASS] All dashboard summary counts match MongoDB collections exactly!');

    // 3. Test Working Hours Validation on Backend
    console.log('\nTesting Working Hours Validation:');
    
    // Test 3a: start >= end rejection
    const invalidHoursRes = await fetch(`${API_BASE}/provider/profile/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: providerUser.email,
        workingHours: { start: '18:00', end: '09:00' }
      })
    });
    const invalidHoursData = await invalidHoursRes.json();
    if (invalidHoursRes.status === 400 && !invalidHoursData.success) {
      console.log(`[PASS] start >= end rejected with 400: "${invalidHoursData.message}"`);
    } else {
      throw new Error('Server accepted invalid start >= end hours!');
    }

    // Test 3b: empty working days rejection
    const emptyDaysRes = await fetch(`${API_BASE}/provider/profile/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: providerUser.email,
        workingDays: []
      })
    });
    const emptyDaysData = await emptyDaysRes.json();
    if (emptyDaysRes.status === 400 && !emptyDaysData.success) {
      console.log(`[PASS] Empty working days rejected with 400: "${emptyDaysData.message}"`);
    } else {
      throw new Error('Server accepted empty working days array!');
    }

    // Test 4: Valid Working Hours Update & Persistence
    console.log('\nTesting Valid Working Hours Update & MongoDB Persistence:');
    const newHours = { start: '08:30', end: '19:30' };
    const newDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const updateRes = await fetch(`${API_BASE}/provider/profile/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: providerUser.email,
        workingHours: newHours,
        workingDays: newDays
      })
    });
    const updateData = await updateRes.json();
    if (!updateRes.ok || !updateData.success) {
      throw new Error('Update failed: ' + (updateData.message || updateRes.statusText));
    }
    console.log(`[PASS] Update API responded successfully: "${updateData.message}"`);

    // Verify in MongoDB directly
    const reloadedProvider = await Provider.findById(provider._id);
    if (
      reloadedProvider.workingHours.start !== newHours.start ||
      reloadedProvider.workingHours.end !== newHours.end
    ) {
      throw new Error(`MongoDB workingHours mismatch! Expected ${JSON.stringify(newHours)}, got ${JSON.stringify(reloadedProvider.workingHours)}`);
    }
    if (
      reloadedProvider.workingDays.length !== newDays.length ||
      !newDays.every(d => reloadedProvider.workingDays.includes(d))
    ) {
      throw new Error(`MongoDB workingDays mismatch! Expected ${JSON.stringify(newDays)}, got ${JSON.stringify(reloadedProvider.workingDays)}`);
    }
    console.log(`[PASS] Direct MongoDB verification confirmed: workingHours = ${JSON.stringify(reloadedProvider.workingHours)}, workingDays = [${reloadedProvider.workingDays.join(', ')}]`);

    // Verify Profile endpoint returns formatted hours and working days
    const profileRes = await fetch(`${API_BASE}/provider/profile/${encodeURIComponent(providerUser.email)}`);
    const profileData = await profileRes.json();
    if (
      profileData.profile.workingHours.start !== newHours.start ||
      profileData.profile.workingHours.end !== newHours.end ||
      profileData.profile.workingHoursFormatted !== '8:30 AM - 7:30 PM'
    ) {
      throw new Error(`Profile API workingHours error: formatted = ${profileData.profile.workingHoursFormatted}`);
    }
    console.log(`[PASS] Profile API returned formatted working hours: "${profileData.profile.workingHoursFormatted}"`);

    // Reset hours back to original standard hours
    await fetch(`${API_BASE}/provider/profile/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: providerUser.email,
        workingHours: { start: '09:00', end: '18:00' },
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      })
    });
    console.log('[PASS] Reset provider hours back to 09:00 - 18:00 (Mon - Fri).');

    console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('\n[FAIL] Test suite failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runTests();
