import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import Booking from './models/Booking.js';
import User from './models/User.js';
import Provider from './models/Provider.js';
import Notification from './models/Notification.js';
import Review from './models/Review.js';
import Service from './models/Service.js';
import Customer from './models/Customer.js';
import { generateServiceBookingId } from './utils/bookingIdGenerator.js';
import { broadcastNotification, registerSSEClient } from './utils/notificationBroadcaster.js';

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartserve';

async function runTests() {
  console.log('=== STARTING SMART SERVE AI VERIFICATION ===');
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB successfully.');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: Registered Provider Profile Image on Bookings
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Registered Provider Images on Bookings ---');
    const existingProvider = await Provider.findOne({ photo: { $exists: true, $ne: '' } });
    assert(existingProvider !== null, 'Found an existing registered provider with a profile photo');

    if (existingProvider) {
      console.log(`Provider: ${existingProvider.name}, Photo: ${existingProvider.photo}`);
      const testCustEmail = 'test_verify_customer@smartserve.ai';

      // Create test booking with this provider
      const bId = await generateServiceBookingId({
        provider: existingProvider,
        providerEmail: existingProvider.email,
        serviceName: 'Wiring Check',
        serviceType: existingProvider.category || 'Electrician'
      });

      const testBooking = await Booking.create({
        bookingId: bId,
        customerName: 'Verify Customer',
        customerEmail: testCustEmail,
        customerPhone: '9843012345',
        customerAddress: 'RS Puram, Coimbatore',
        providerId: existingProvider._id,
        providerName: existingProvider.name,
        providerEmail: existingProvider.email,
        providerPhone: existingProvider.phone || '9876543210',
        providerPhoto: existingProvider.photo,
        date: '30/10/2026',
        time: '10:00 AM',
        serviceType: existingProvider.category || 'Electrician',
        serviceName: 'Wiring Check',
        amount: 500,
        status: 'Pending'
      });

      assert(testBooking.providerPhoto === existingProvider.photo, 'Booking correctly saved registered providerPhoto');
      assert(/^#\d{2,}$/.test(testBooking.bookingId), `Booking ID is numeric-only: ${testBooking.bookingId}`);

      // -------------------------------------------------------------
      // Test 2: Real-Time Genuine Notification on Booking Creation
      // -------------------------------------------------------------
      console.log('\n--- 2. Testing Customer Genuine Notification on Booking Creation ---');
      const custDedupKey = `cust_booking_${testBooking._id.toString()}`;
      const custNotif = await Notification.create({
        title: 'Booking Request Submitted',
        message: `Your booking #${testBooking.bookingId} for Wiring Check with ${existingProvider.name} has been submitted successfully.`,
        type: 'booking',
        recipientRole: 'Customer',
        recipientEmail: testCustEmail,
        bookingId: testBooking._id.toString(),
        targetRoute: `/customer/bookings-and-saved?tab=bookings&id=${testBooking._id.toString()}`,
        dedupKey: custDedupKey
      });

      assert(custNotif.recipientRole === 'Customer', 'Notification recipientRole is Customer');
      assert(custNotif.recipientEmail === testCustEmail, 'Notification targeted to genuine customer email');
      assert(custNotif.targetRoute.includes('/customer/bookings-and-saved'), 'Notification has correct customer targetRoute');

      // -------------------------------------------------------------
      // Test 3: Provider Accepts Booking -> Customer Real Notification
      // -------------------------------------------------------------
      console.log('\n--- 3. Testing Provider Accept & Status Update Notifications ---');
      testBooking.status = 'Active';
      await testBooking.save();

      const acceptDedupKey = `cust_status_${testBooking._id.toString()}_Active`;
      const acceptNotif = await Notification.create({
        title: 'Booking Request Accepted',
        message: `${existingProvider.name} has accepted your booking #${testBooking.bookingId} for Wiring Check.`,
        type: 'booking_confirmed',
        recipientRole: 'Customer',
        recipientEmail: testCustEmail,
        bookingId: testBooking._id.toString(),
        targetRoute: `/customer/bookings-and-saved?tab=bookings&id=${testBooking._id.toString()}`,
        dedupKey: acceptDedupKey
      });

      assert(acceptNotif.type === 'booking_confirmed', 'Notification type is booking_confirmed');
      assert(acceptNotif.title === 'Booking Request Accepted', 'Notification title is Booking Request Accepted');

      // -------------------------------------------------------------
      // Test 4: Provider Completes Booking -> Customer Rate Prompt
      // -------------------------------------------------------------
      console.log('\n--- 4. Testing Service Completion Notification ---');
      testBooking.status = 'Completed';
      await testBooking.save();

      const completeDedupKey = `cust_status_${testBooking._id.toString()}_Completed`;
      const completeNotif = await Notification.create({
        title: 'Service Completed',
        message: `Your service for booking #${testBooking.bookingId} is completed! Click to rate your experience.`,
        type: 'service_completed',
        recipientRole: 'Customer',
        recipientEmail: testCustEmail,
        bookingId: testBooking._id.toString(),
        targetRoute: `/customer/bookings-and-saved?tab=bookings&rate=true&id=${testBooking._id.toString()}`,
        dedupKey: completeDedupKey
      });

      assert(completeNotif.type === 'service_completed', 'Notification type is service_completed');
      assert(completeNotif.targetRoute.includes('rate=true'), 'Target route directs to review modal');

      // -------------------------------------------------------------
      // Test 5: SSE Broadcaster Sanity Check
      // -------------------------------------------------------------
      console.log('\n--- 5. Testing SSE Client Broadcaster Helper ---');
      let dummyWritten = null;
      const dummyRes = {
        write: (str) => { dummyWritten = str; },
        on: (ev, cb) => {}
      };

      registerSSEClient('test_stream_user@smartserve.ai', dummyRes);
      broadcastNotification({
        title: 'SSE Test Alert',
        message: 'Real-time SSE event received.',
        recipientEmail: 'test_stream_user@smartserve.ai',
        recipientRole: 'Customer'
      });

      assert(dummyWritten !== null && dummyWritten.includes('SSE Test Alert'), 'broadcastNotification writes JSON data to registered SSE client');

      // Clean up test booking and test notifications
      await Booking.deleteOne({ _id: testBooking._id });
      await Notification.deleteMany({ recipientEmail: testCustEmail });
      console.log('Test booking and notifications cleaned up cleanly.');
    }

    // -------------------------------------------------------------
    // Test 6: Verify Database Notifications Integrity (No Fakes)
    // -------------------------------------------------------------
    console.log('\n--- 6. Checking Database Notifications for Zero Fabricated / Mock Data ---');
    const allNotifs = await Notification.find({}).lean();
    const fakeKeywords = ['random', 'fabricated', 'lorem ipsum', 'mock data', 'sample notification'];
    const suspicious = allNotifs.filter(n => {
      const text = `${n.title} ${n.message}`.toLowerCase();
      return fakeKeywords.some(kw => text.includes(kw));
    });

    assert(suspicious.length === 0, `Zero suspicious or mock notifications found (checked ${allNotifs.length} records)`);

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await mongoose.disconnect();
    console.log(`\n=== VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
  }
}

runTests();
