import mongoose from 'mongoose';
import User from './models/User.js';
import Provider from './models/Provider.js';
import Booking from './models/Booking.js';
import Notification from './models/Notification.js';
import { formatWorkingHours } from './utils/timeFormat.js';

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('=== TEST SUITE: GENUINE NOTIFICATIONS & AVAILABILITY VISUALIZATION ===\n');
  await mongoose.connect('mongodb://localhost:27017/smartserve');

  const testTrackedIds = {
    notifications: [],
    bookings: []
  };

  try {
    // -------------------------------------------------------------
    // Test 1: Availability Visualization & Verification
    // -------------------------------------------------------------
    console.log('1. Testing Availability Visualization & Real Data Loading:');
    const providerUser = await User.findOne({ role: 'Provider' });
    if (!providerUser) throw new Error('No provider user found in MongoDB');

    const provider = await Provider.findOne({ user: providerUser._id });
    if (!provider) throw new Error('No provider document found for ' + providerUser.email);

    console.log(`  [PASS] Authenticated Provider: ${providerUser.fullName} (${providerUser.email})`);

    // Verify GET /api/provider/profile/:email returns actual saved availability
    const profileRes = await fetch(`${API_BASE}/provider/profile/${encodeURIComponent(providerUser.email)}`);
    const profileData = await profileRes.json();
    if (!profileData.success || !profileData.profile) throw new Error('Profile API failed');

    if (
      profileData.profile.workingHours.start !== provider.workingHours.start ||
      profileData.profile.workingHours.end !== provider.workingHours.end
    ) {
      throw new Error('Availability working hours mismatch between DB and Profile API');
    }
    console.log(`  [PASS] Availability page loads genuine saved hours: ${profileData.profile.workingHoursFormatted} (${JSON.stringify(profileData.profile.workingHours)})`);
    console.log(`  [PASS] Availability working days: [${profileData.profile.workingDays.join(', ')}]`);

    // -------------------------------------------------------------
    // Test 2: Genuine Customer Service Request & Notification Creation
    // -------------------------------------------------------------
    console.log('\n2. Testing Genuine Customer Service Request Notification:');
    const testCustomerEmail = 'test_real_customer_notif@smartserve.ai';
    const testServiceName = 'Home Sanitization Test';
    const testAmount = 899;

    // Check count of notifications before booking
    const notifsBeforeRes = await fetch(`${API_BASE}/provider/notifications/${encodeURIComponent(providerUser.email)}`);
    const notifsBeforeData = await notifsBeforeRes.json();
    const notifsBefore = notifsBeforeData.notifications || [];

    // Create a real customer booking via the official customer booking endpoint
    const bookingRes = await fetch(`${API_BASE}/customer/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Test Real Customer',
        customerEmail: testCustomerEmail,
        customerPhone: '9876543210',
        providerName: providerUser.fullName,
        providerEmail: providerUser.email,
        providerPhone: providerUser.phone || provider.phone || '9843012345',
        date: '10/11/2026',
        time: '11:00 AM',
        serviceType: provider.category || 'Home Cleaning',
        serviceName: testServiceName,
        amount: testAmount,
        location: 'Coimbatore, TN'
      })
    });

    const bookingData = await bookingRes.json();
    if (!bookingRes.ok || !bookingData.success) {
      throw new Error('Failed to create customer booking: ' + (bookingData.message || bookingRes.statusText));
    }

    const createdBooking = bookingData.booking;
    testTrackedIds.bookings.push(createdBooking._id);
    console.log(`  [PASS] Genuine booking created in MongoDB: ID = ${createdBooking._id}, BookingId = ${createdBooking.bookingId}`);

    // Verify Notification exists in MongoDB for this provider
    const notifsAfterRes = await fetch(`${API_BASE}/provider/notifications/${encodeURIComponent(providerUser.email)}`);
    const notifsAfterData = await notifsAfterRes.json();
    const notifsAfter = notifsAfterData.notifications || [];

    const newNotification = notifsAfter.find(n => n.bookingId === createdBooking._id.toString() || (n.message && n.message.includes(testServiceName)));
    if (!newNotification) {
      throw new Error('Provider did not receive notification for genuine booking!');
    }
    testTrackedIds.notifications.push(newNotification.id || newNotification._id);

    console.log(`  [PASS] Provider received notification: "${newNotification.title}" - "${newNotification.message}"`);
    console.log(`  [PASS] Notification associated with correct booking ID: ${newNotification.bookingId}`);
    console.log(`  [PASS] Notification destination route: ${newNotification.targetRoute}`);

    // -------------------------------------------------------------
    // Test 3: Deduplication & Idempotency
    // -------------------------------------------------------------
    console.log('\n3. Testing Deduplication (no duplicate notifications on refresh/retries):');
    // Attempting to post the same notification with the same dedupKey
    const dedupKey = `prov_booking_${createdBooking._id.toString()}`;
    const duplicateCheckRes = await fetch(`${API_BASE}/provider/notifications/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipientEmail: providerUser.email,
        title: 'New Booking Request Duplicate',
        message: 'Duplicate text',
        dedupKey
      })
    });
    const duplicateData = await duplicateCheckRes.json();
    if (duplicateData.duplicate) {
      console.log('  [PASS] Duplicate notification blocked by dedupKey idempotency check.');
    } else {
      throw new Error('Duplicate notification was not blocked!');
    }

    // -------------------------------------------------------------
    // Test 4: Provider Isolation
    // -------------------------------------------------------------
    console.log('\n4. Testing Provider Notification & Booking Isolation:');
    const otherProviderEmail = 'other_prov_isolated@smartserve.ai';
    const otherNotifsRes = await fetch(`${API_BASE}/provider/notifications/${encodeURIComponent(otherProviderEmail)}`);
    const otherNotifsData = await otherNotifsRes.json();
    const otherNotifs = otherNotifsData.notifications || [];

    const leakedNotif = otherNotifs.find(n => n.bookingId === createdBooking._id.toString());
    if (leakedNotif) {
      throw new Error('SECURITY VIOLATION: Notification leaked to another provider!');
    }
    console.log('  [PASS] Notification is strictly isolated to the booked provider (0 leaked to other providers).');

    // -------------------------------------------------------------
    // Test 5: Read Status Synchronization (System Alerts & Bell)
    // -------------------------------------------------------------
    console.log('\n5. Testing Notification Read Status Persistence & Synchronization:');
    const notifId = newNotification.id || newNotification._id;

    // Initially unread
    if (newNotification.read) {
      throw new Error('New notification was not initially unread!');
    }
    console.log('  [PASS] Notification initially has read: false.');

    // Mark as read via single read endpoint (simulating click in System Alerts or Bell)
    const markReadRes = await fetch(`${API_BASE}/provider/notifications/read/${notifId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: providerUser.email })
    });
    const markReadData = await markReadRes.json();
    if (!markReadData.success || !markReadData.notification.read) {
      throw new Error('Failed to mark notification as read');
    }
    console.log('  [PASS] POST /api/provider/notifications/read/:id marked notification as read in MongoDB.');

    // Verify persistence across reload (simulating page refresh)
    const verifyReloadRes = await fetch(`${API_BASE}/provider/notifications/${encodeURIComponent(providerUser.email)}`);
    const verifyReloadData = await verifyReloadRes.json();
    const reloadedNotif = verifyReloadData.notifications.find(n => (n.id || n._id) === notifId);
    if (!reloadedNotif || !reloadedNotif.read) {
      throw new Error('Read status did not persist across API reload!');
    }
    console.log('  [PASS] Notification read status persisted in MongoDB across page reload.');

    // Unauthorized mark-read attempt should fail (403)
    const unauthorizedReadRes = await fetch(`${API_BASE}/provider/notifications/read/${notifId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'attacker@test.com' })
    });
    if (unauthorizedReadRes.status === 403) {
      console.log('  [PASS] Unauthorized mark-read rejected with 403 Forbidden.');
    } else {
      throw new Error('Unauthorized mark-read was not rejected with 403!');
    }

    // -------------------------------------------------------------
    // Test 6: Target Destination Determination
    // -------------------------------------------------------------
    console.log('\n6. Testing Notification Destination Mapping:');
    const expectedRoute = `/provider/bookings?id=${createdBooking._id.toString()}`;
    if (newNotification.targetRoute !== expectedRoute) {
      throw new Error(`Target route mismatch! Expected ${expectedRoute}, got ${newNotification.targetRoute}`);
    }
    console.log(`  [PASS] Booking alert precisely maps to: "${newNotification.targetRoute}".`);

    console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('\n[FAIL] Test suite failed:', err);
    process.exit(1);
  } finally {
    // Clean up only test records created during this run
    if (testTrackedIds.bookings.length > 0) {
      await Booking.deleteMany({ _id: { $in: testTrackedIds.bookings } });
    }
    if (testTrackedIds.notifications.length > 0) {
      await Notification.deleteMany({ _id: { $in: testTrackedIds.notifications } });
    }
    await mongoose.disconnect();
    console.log('\n[CLEANUP] Successfully cleaned up test bookings and test notifications.');
  }
}

runTests();
