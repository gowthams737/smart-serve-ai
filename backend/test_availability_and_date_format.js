/**
 * Test Suite: Provider Availability Management, Server-Side Availability Enforcement,
 * and Project-Wide DD/MM/YYYY Date Standardization
 */

import mongoose from 'mongoose';
import User from './models/User.js';
import Provider from './models/Provider.js';
import Booking from './models/Booking.js';
import {
  formatDateDDMMYYYY,
  parseDDMMYYYY,
  isValidDDMMYYYY,
  isLeapYear,
  getDaysInMonth,
  getDayOfWeek,
  areDatesEqual,
  compareDatesDDMMYYYY,
  toISODate,
  fromISODate
} from './utils/dateFormat.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartserve';
const BASE_URL = 'http://localhost:5000';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('================================================================');
  console.log('Running SmartServe AI Availability & DD/MM/YYYY Date Tests');
  console.log('================================================================\n');

  // ---------------------------------------------------------
  // TEST GROUP 1: Date Format & Validation Utilities
  // ---------------------------------------------------------
  console.log('TEST GROUP 1: Date Format & Validation Utilities (DD/MM/YYYY)');

  // A. Format standardizations
  assert(formatDateDDMMYYYY('2026-07-04') === '04/07/2026', 'Formats YYYY-MM-DD to DD/MM/YYYY without timezone shift');
  assert(formatDateDDMMYYYY('2026-12-25T15:30:00.000Z') === '25/12/2026', 'Formats ISO timestamp to DD/MM/YYYY');
  assert(formatDateDDMMYYYY('05/11/2026') === '05/11/2026', 'Preserves DD/MM/YYYY string');
  assert(formatDateDDMMYYYY('5/9/2026') === '05/09/2026', 'Zero-pads single digit day and month');

  // B. Leap year logic
  assert(isLeapYear(2028) === true, 'Identifies 2028 as a leap year');
  assert(isLeapYear(2026) === false, 'Identifies 2026 as non-leap year');
  assert(isLeapYear(2000) === true, 'Identifies 2000 as leap year (divisible by 400)');
  assert(isLeapYear(1900) === false, 'Identifies 1900 as non-leap year (divisible by 100, not 400)');

  // C. Month day validation
  assert(parseDDMMYYYY('29/02/2028').valid === true, 'Validates 29/02/2028 (leap year)');
  assert(parseDDMMYYYY('29/02/2026').valid === false, 'Rejects 29/02/2026 (non-leap year)');
  assert(parseDDMMYYYY('31/02/2026').valid === false, 'Rejects 31/02/2026 (impossible February date)');
  assert(parseDDMMYYYY('31/04/2026').valid === false, 'Rejects 31/04/2026 (April has 30 days)');
  assert(parseDDMMYYYY('30/04/2026').valid === true, 'Validates 30/04/2026 (30 days in April)');
  assert(parseDDMMYYYY('31/12/2026').valid === true, 'Validates 31/12/2026 (31 days in December)');

  // D. Day of week determination (no timezone shift)
  assert(getDayOfWeek('05/11/2026') === 'Thursday', 'Correctly calculates 05/11/2026 is Thursday');
  assert(getDayOfWeek('25/12/2026') === 'Friday', 'Correctly calculates 25/12/2026 is Friday');
  assert(getDayOfWeek('29/02/2028') === 'Tuesday', 'Correctly calculates 29/02/2028 is Tuesday');

  // E. Date comparisons
  assert(areDatesEqual('04/07/2026', '2026-07-04') === true, 'areDatesEqual matches DD/MM/YYYY with YYYY-MM-DD');
  assert(compareDatesDDMMYYYY('05/11/2026', '25/12/2026') === -1, 'compareDatesDDMMYYYY sorts 05/11/2026 before 25/12/2026');
  assert(compareDatesDDMMYYYY('01/01/2027', '31/12/2026') === 1, 'compareDatesDDMMYYYY sorts 01/01/2027 after 31/12/2026');

  // ---------------------------------------------------------
  // Connect to MongoDB
  // ---------------------------------------------------------
  await mongoose.connect(MONGO_URI);
  console.log('\nConnected to MongoDB database:', MONGO_URI);

  // Find or create test provider
  const testProviderEmail = 'test.availability.provider@smartserve.ai';
  let testUser = await User.findOne({ email: testProviderEmail });
  if (!testUser) {
    testUser = await User.create({
      fullName: 'Test Availability Provider',
      email: testProviderEmail,
      phone: '+91 98888 11111',
      password: 'testPassword123',
      role: 'Provider'
    });
  }

  let testProvider = await Provider.findOne({ user: testUser._id });
  if (!testProvider) {
    testProvider = await Provider.create({
      user: testUser._id,
      name: testUser.fullName,
      email: testUser.email,
      phone: testUser.phone,
      category: 'Home Cleaning',
      experience: 5,
      status: 'Approved',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      workingHours: { start: '09:00', end: '18:00' },
      holidays: ['04/07/2026', '25/12/2026'],
      blockedDates: ['04/07/2026', '25/12/2026'],
      isOnline: true
    });
  }

  // ---------------------------------------------------------
  // TEST GROUP 2: Provider Availability Persistence to MongoDB
  // ---------------------------------------------------------
  console.log('\nTEST GROUP 2: Provider Availability Persistence & Profile Update');

  // Update provider availability via API
  const updatePayload = {
    email: testProviderEmail,
    workingDays: ['Monday', 'Wednesday', 'Friday'],
    workingHours: { start: '10:00', end: '16:00' },
    holidays: ['15/08/2026', '02/10/2026', '25/12/2026'],
    isOnline: true
  };

  const updateRes = await fetch(`${BASE_URL}/api/provider/profile/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatePayload)
  });
  const updateData = await updateRes.json();

  assert(updateData.success === true, 'POST /api/provider/profile/update succeeds');
  assert(updateData.profile.workingDays.length === 3, 'Returns updated workingDays (3 days)');
  assert(updateData.profile.workingHours.start === '10:00', 'Returns updated workingHours.start (10:00)');
  assert(updateData.profile.workingHours.end === '16:00', 'Returns updated workingHours.end (16:00)');
  assert(updateData.profile.holidays.includes('15/08/2026'), 'Returns updated holidays with DD/MM/YYYY format');
  assert(updateData.profile.isOnline === true, 'Returns provider online status as true');

  // Verify direct MongoDB document persistence
  const dbProvider = await Provider.findOne({ user: testUser._id });
  assert(dbProvider.workingDays.includes('Wednesday') && !dbProvider.workingDays.includes('Tuesday'), 'MongoDB document has exact updated workingDays');
  assert(dbProvider.workingHours.start === '10:00' && dbProvider.workingHours.end === '16:00', 'MongoDB document has exact updated workingHours');
  assert(dbProvider.holidays.includes('15/08/2026'), 'MongoDB document persists holidays in DD/MM/YYYY');
  assert(dbProvider.blockedDates.includes('15/08/2026'), 'MongoDB document persists blockedDates synchronized with holidays');

  // Test online toggle
  const offlineRes = await fetch(`${BASE_URL}/api/provider/profile/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testProviderEmail, isOnline: false })
  });
  const offlineData = await offlineRes.json();
  assert(offlineData.profile.isOnline === false, 'Toggling offline updates profile to false');
  const dbOffline = await Provider.findOne({ user: testUser._id });
  assert(dbOffline.isOnline === false, 'MongoDB document reflects isOnline: false');

  // ---------------------------------------------------------
  // TEST GROUP 3: Server-Side Customer Booking Validation
  // ---------------------------------------------------------
  console.log('\nTEST GROUP 3: Server-Side Booking Availability Enforcement (POST /api/customer/bookings)');

  // A. Attempt booking when provider is offline
  const offlineBookingRes = await fetch(`${BASE_URL}/api/customer/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Kavin Customer',
      customerEmail: 'kavin.cust@smartserve.ai',
      customerPhone: '+91 94444 22222',
      providerName: testProvider.name,
      providerEmail: testProviderEmail,
      providerPhone: testProvider.phone,
      date: '05/08/2026', // Wednesday
      time: '11:00 AM',
      serviceType: 'Home Cleaning',
      serviceName: 'Full Home Deep Cleaning',
      amount: 1500,
      location: 'RS Puram, Coimbatore'
    })
  });
  const offlineBookingData = await offlineBookingRes.json();
  assert(offlineBookingRes.status === 400 && offlineBookingData.success === false, 'Rejects booking when provider is offline (400)');
  assert(offlineBookingData.message.includes('offline'), 'Returns descriptive offline error message');

  // Set provider back online
  await Provider.updateOne({ user: testUser._id }, { isOnline: true });

  // B. Attempt booking with invalid date (e.g. 31/02/2026)
  const invalidDateRes = await fetch(`${BASE_URL}/api/customer/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Kavin Customer',
      customerEmail: 'kavin.cust@smartserve.ai',
      customerPhone: '+91 94444 22222',
      providerName: testProvider.name,
      providerEmail: testProviderEmail,
      providerPhone: testProvider.phone,
      date: '31/02/2026',
      time: '11:00 AM',
      serviceType: 'Home Cleaning',
      serviceName: 'Full Home Deep Cleaning',
      amount: 1500,
      location: 'RS Puram, Coimbatore'
    })
  });
  const invalidDateData = await invalidDateRes.json();
  assert(invalidDateRes.status === 400 && invalidDateData.success === false, 'Rejects invalid date 31/02/2026 (400)');

  // C. Attempt booking on provider marked holiday (15/08/2026)
  const holidayBookingRes = await fetch(`${BASE_URL}/api/customer/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Kavin Customer',
      customerEmail: 'kavin.cust@smartserve.ai',
      customerPhone: '+91 94444 22222',
      providerName: testProvider.name,
      providerEmail: testProviderEmail,
      providerPhone: testProvider.phone,
      date: '15/08/2026', // Marked holiday
      time: '11:00 AM',
      serviceType: 'Home Cleaning',
      serviceName: 'Full Home Deep Cleaning',
      amount: 1500,
      location: 'RS Puram, Coimbatore'
    })
  });
  const holidayBookingData = await holidayBookingRes.json();
  assert(holidayBookingRes.status === 400 && holidayBookingData.success === false, 'Rejects booking on marked holiday 15/08/2026 (400)');
  assert(holidayBookingData.message.includes('holiday'), 'Returns error identifying marked holiday');

  // D. Attempt booking on non-working day (e.g. Tuesday 04/08/2026, provider only works Mon, Wed, Fri)
  const nonWorkingDayRes = await fetch(`${BASE_URL}/api/customer/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Kavin Customer',
      customerEmail: 'kavin.cust@smartserve.ai',
      customerPhone: '+91 94444 22222',
      providerName: testProvider.name,
      providerEmail: testProviderEmail,
      providerPhone: testProvider.phone,
      date: '04/08/2026', // Tuesday
      time: '11:00 AM',
      serviceType: 'Home Cleaning',
      serviceName: 'Full Home Deep Cleaning',
      amount: 1500,
      location: 'RS Puram, Coimbatore'
    })
  });
  const nonWorkingDayData = await nonWorkingDayRes.json();
  assert(nonWorkingDayRes.status === 400 && nonWorkingDayData.success === false, 'Rejects booking on non-working day Tuesday (400)');
  assert(nonWorkingDayData.message.includes('Tuesdays'), 'Returns error message identifying Tuesday non-working day');

  // E. Attempt booking outside working hours (Provider works 10:00 - 16:00, booking at 08:00 AM or 07:00 PM)
  const outOfHoursRes = await fetch(`${BASE_URL}/api/customer/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Kavin Customer',
      customerEmail: 'kavin.cust@smartserve.ai',
      customerPhone: '+91 94444 22222',
      providerName: testProvider.name,
      providerEmail: testProviderEmail,
      providerPhone: testProvider.phone,
      date: '05/08/2026', // Wednesday (valid working day)
      time: '08:00 AM', // Before 10:00 AM start
      serviceType: 'Home Cleaning',
      serviceName: 'Full Home Deep Cleaning',
      amount: 1500,
      location: 'RS Puram, Coimbatore'
    })
  });
  const outOfHoursData = await outOfHoursRes.json();
  assert(outOfHoursRes.status === 400 && outOfHoursData.success === false, 'Rejects booking outside working hours at 08:00 AM (400)');

  // F. Valid booking: Wednesday 05/08/2026 at 11:00 AM (working day, working hours, not a holiday)
  const validBookingRes = await fetch(`${BASE_URL}/api/customer/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Kavin Customer',
      customerEmail: 'kavin.cust@smartserve.ai',
      customerPhone: '+91 94444 22222',
      providerName: testProvider.name,
      providerEmail: testProviderEmail,
      providerPhone: testProvider.phone,
      date: '05/08/2026', // Wednesday
      time: '11:00 AM',
      serviceType: 'Home Cleaning',
      serviceName: 'Full Home Deep Cleaning',
      amount: 1500,
      location: 'RS Puram, Coimbatore'
    })
  });
  const validBookingData = await validBookingRes.json();
  assert(validBookingRes.status === 201 && validBookingData.success === true, 'Accepts valid booking during working hours (201)');
  assert(validBookingData.booking.date === '05/08/2026', 'Booking date stored in standard DD/MM/YYYY format');

  // Verify persisted booking in MongoDB
  const savedBooking = await Booking.findOne({ bookingId: validBookingData.booking.bookingId });
  assert(savedBooking !== null, 'Booking persisted to MongoDB Booking collection');
  assert(savedBooking.date === '05/08/2026', 'MongoDB Booking document preserves DD/MM/YYYY date');

  // Clean up test booking and provider
  await Booking.deleteOne({ _id: savedBooking._id });
  await Provider.deleteOne({ _id: testProvider._id });
  await User.deleteOne({ _id: testUser._id });

  // ---------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================');

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
