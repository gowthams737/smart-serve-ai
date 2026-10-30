import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './models/User.js';
import Customer from './models/Customer.js';
import Provider from './models/Provider.js';
import Booking from './models/Booking.js';
import Notification from './models/Notification.js';
import Setting from './models/Setting.js';
import Service from './models/Service.js';
import { hashPassword, isSha256 } from './routes/authRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const BASE_URL = 'http://localhost:5000';
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartserve';

async function runPersistenceTests() {
  console.log('================================================================');
  console.log('   SMART SERVE AI - COMPLETE END-TO-END PERSISTENCE TEST SUITE   ');
  console.log('================================================================\n');

  await mongoose.connect(mongoUri);
  console.log(`Connected to MongoDB (${mongoose.connection.name}) on ${mongoose.connection.host}:${mongoose.connection.port}\n`);

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

  const timestamp = Date.now();

  try {
    // ---------------------------------------------------------------------------------
    // STEP 16 Pre-check: Count existing records to verify they remain intact at end
    // ---------------------------------------------------------------------------------
    const initialUsersCount = await User.countDocuments();
    const initialProvidersCount = await Provider.countDocuments();
    const initialCustomersCount = await Customer.countDocuments();

    // ---------------------------------------------------------------------------------
    // STEPS 1-3: Register Provider with distinct values & verify MongoDB persistence
    // ---------------------------------------------------------------------------------
    console.log('--- REQUIREMENT 1-3: Provider Registration & Complete Details Persistence ---');
    const provEmail = `test_prov_${timestamp}@smartserve.ai`;
    const provPassword = 'SecureProviderPass!99';

    // Verify rejection when service rate is missing or <= 0
    const invalidRateRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Rate Test Prov',
        email: `invalid_rate_${timestamp}@smartserve.ai`,
        phone: '+91 98401 00000',
        password: provPassword,
        role: 'Provider',
        category: 'Electrician'
      })
    });
    const invalidRateData = await invalidRateRes.json();
    assert(invalidRateRes.status === 400 && invalidRateData.success === false, '1a. Registration rejected when mandatory service rate is missing');

    const regPayload = {
      fullName: 'Vikram Electricals',
      email: provEmail,
      phone: '+91 98401 23456',
      password: provPassword,
      role: 'Provider',
      category: 'Electrician',
      serviceRate: 450,
      pricingUnit: 'Per Hour',
      bio: 'Licensed Master Electrician with 12 years residential & commercial wiring experience in Coimbatore.',
      about: 'Licensed Master Electrician with 12 years residential & commercial wiring experience in Coimbatore.',
      gender: 'Male',
      age: 38,
      experience: 12,
      workingHours: { start: '08:00', end: '19:00' },
      profilePhoto: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    };

    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regPayload)
    });
    const regData = await regRes.json();
    assert(regData.success === true, '1b. Provider registration API returned success (201)');
    assert(regData.user.rate === 450, '1c. Registration response includes registered rate (450)');
    assert(regData.user.pricingUnit === 'Per Hour', '1d. Registration response includes pricing unit (Per Hour)');
    assert(regData.user.workingHoursFormatted === '8:00 AM - 7:00 PM', '1e. Registration response includes 12-hour AM/PM formatted hours (8:00 AM - 7:00 PM)');

    // 2. Confirm new provider exists in MongoDB collections
    const dbUser = await User.findOne({ email: provEmail });
    assert(!!dbUser, '2a. User document created in MongoDB users collection');

    const dbProvider = await Provider.findOne({ user: dbUser._id });
    assert(!!dbProvider, '2b. Provider document created in MongoDB providers collection');

    // 3. Verify all stored fields and values
    assert(dbUser.fullName === 'Vikram Electricals', '3a. Full Name matches in User document');
    assert(dbProvider.name === 'Vikram Electricals', '3b. Full Name matches in Provider document');
    assert(dbProvider.email === provEmail, '3c. Email stored in Provider document');
    assert(dbProvider.phone === '+91 98401 23456', '3d. Phone stored in Provider document');
    assert(dbProvider.category === 'Electrician', '3e. Service category matches in Provider document');
    assert(dbProvider.experience === 12, '3f. Experience (12 years) matches in Provider document');
    assert(dbProvider.gender === 'Male', '3g. Gender matches in Provider document');
    assert(dbProvider.age === 38, '3h. Age (38) matches in Provider document');
    assert(dbProvider.workingHours?.start === '08:00' && dbProvider.workingHours?.end === '19:00', '3i. Working Hours (08:00-19:00) match in Provider document');
    assert(dbProvider.rate === 450, '3j. Registered service rate (450) saved in Provider document');
    assert(dbProvider.pricingUnit === 'Per Hour', '3k. Pricing unit (Per Hour) saved in Provider document');
    assert(dbProvider.bio === regPayload.bio, '3l. Bio matches in Provider document');
    assert(dbProvider.photo.startsWith('data:image/png;base64'), '3m. Profile Photo persisted in Provider document');
    assert(dbUser.profileImage.startsWith('data:image/png;base64'), '3n. Profile Photo persisted in User document');

    // Baseline service created in Service collection
    const dbInitialService = await Service.findOne({ providerId: dbProvider._id });
    assert(!!dbInitialService, '3o. Initial Service document automatically created in services collection');
    assert(dbInitialService.price === 450, '3p. Initial service price matches registered rate (450)');
    assert(dbInitialService.pricingUnit === 'Per Hour', '3q. Initial service pricing unit matches registered unit (Per Hour)');

    // ---------------------------------------------------------------------------------
    // STEPS 4-6: Password Storage, Hash Verification & Rejection
    // ---------------------------------------------------------------------------------
    console.log('\n--- REQUIREMENT 4-6: Password Storage, Verification & Invalid Rejection ---');
    // 4. Verify password is a secure SHA-256 hash, never plaintext
    assert(isSha256(dbUser.password), '4a. Password stored as 64-char hexadecimal SHA-256 hash in MongoDB');
    assert(dbUser.password !== provPassword, '4b. Password is NOT stored as plaintext in MongoDB');
    assert(dbUser.password === hashPassword(provPassword), '4c. Stored hash precisely matches hashPassword(provPassword)');

    // 5. Verify submitted password authenticates against hash
    const loginValidRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: provEmail, password: provPassword, role: 'Provider' })
    });
    const loginValidData = await loginValidRes.json();
    assert(loginValidData.success === true, '5. Submitted password successfully authenticates against stored hash');
    assert(!loginValidData.user.password, '5b. Password hash is never exposed in login response');

    // 6. Verify incorrect password is rejected
    const loginInvalidRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: provEmail, password: 'WrongPassword123!', role: 'Provider' })
    });
    const loginInvalidData = await loginInvalidRes.json();
    assert(loginInvalidRes.status === 401 && loginInvalidData.success === false, '6. Incorrect password rejected with 401 Unauthorized');

    // ---------------------------------------------------------------------------------
    // STEPS 7-8: Provider Login & Profile Display Data
    // ---------------------------------------------------------------------------------
    console.log('\n--- REQUIREMENT 7-8: Provider Login & Profile Retrieval ---');
    // 7. Log in with registered account
    assert(loginValidData.user.email === provEmail, '7. Logged-in user email matches registered account');
    assert(loginValidData.user.role === 'Provider', '7b. Role is Provider');

    // 8. Fetch provider profile via GET /api/provider/profile/:email
    const getProfileRes = await fetch(`${BASE_URL}/api/provider/profile/${encodeURIComponent(provEmail)}`);
    const getProfileData = await getProfileRes.json();
    assert(getProfileData.success === true, '8a. GET /api/provider/profile/:email succeeded');
    const profile = getProfileData.profile;
    assert(profile.fullName === 'Vikram Electricals', '8b. Profile fullName matches submitted value');
    assert(profile.category === 'Electrician', '8c. Profile category matches submitted value');
    assert(profile.experience === 12, '8d. Profile experience matches submitted value');
    assert(profile.age === 38, '8e. Profile age matches submitted value');
    assert(profile.gender === 'Male', '8f. Profile gender matches submitted value');
    assert(profile.workingHours?.start === '08:00', '8g. Profile workingHours matches submitted value');
    assert(profile.rate === 450, '8h. Profile rate (450) matches registered rate');
    assert(profile.pricingUnit === 'Per Hour', '8i. Profile pricingUnit (Per Hour) matches registered unit');
    assert(profile.workingHoursFormatted === '8:00 AM - 7:00 PM', '8j. Profile workingHoursFormatted returns 12-hour AM/PM format (8:00 AM - 7:00 PM)');

    // ---------------------------------------------------------------------------------
    // STEPS 9-10: Profile Update & Re-login Persistence
    // ---------------------------------------------------------------------------------
    console.log('\n--- REQUIREMENT 9-10: Profile Editing & Refresh Persistence ---');
    // 9. Edit profile
    const updateRes = await fetch(`${BASE_URL}/api/provider/profile/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: provEmail,
        fullName: 'Vikram Master Electricals Pro',
        phone: '+91 98401 99999',
        experience: 13,
        age: 39,
        rate: 550,
        pricingUnit: 'Per Visit',
        workingHours: { start: '08:30', end: '19:30' },
        bio: 'Updated bio: Senior commercial electrical engineer with 13 years expertise.'
      })
    });
    const updateData = await updateRes.json();
    assert(updateData.success === true, '9a. Profile update API returned success (200)');

    // Verify same MongoDB record is updated
    const updatedDbProvider = await Provider.findById(dbProvider._id);
    const updatedDbUser = await User.findById(dbUser._id);
    assert(updatedDbProvider.name === 'Vikram Master Electricals Pro', '9b. Provider name updated in MongoDB');
    assert(updatedDbUser.fullName === 'Vikram Master Electricals Pro', '9c. User fullName updated in MongoDB');
    assert(updatedDbProvider.experience === 13, '9d. Provider experience updated to 13 in MongoDB');
    assert(updatedDbProvider.age === 39, '9e. Provider age updated to 39 in MongoDB');
    assert(updatedDbProvider.rate === 550, '9f. Provider rate updated to 550 in MongoDB');
    assert(updatedDbProvider.pricingUnit === 'Per Visit', '9g. Provider pricingUnit updated to Per Visit in MongoDB');
    assert(updatedDbProvider.workingHours?.start === '08:30', '9h. Working hours start updated to 08:30 in MongoDB');

    // 10. Simulate browser reload & new login
    const reLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: provEmail, password: provPassword, role: 'Provider' })
    });
    const reLoginData = await reLoginRes.json();
    assert(reLoginData.success === true, '10a. New login after refresh succeeded');
    assert(reLoginData.user.fullName === 'Vikram Master Electricals Pro', '10b. Updated fullName persisted across login');
    assert(reLoginData.user.experience === 13, '10c. Updated experience persisted across login');
    assert(reLoginData.user.rate === 550, '10d. Updated rate (550) persisted across login');
    assert(reLoginData.user.pricingUnit === 'Per Visit', '10e. Updated pricingUnit (Per Visit) persisted across login');
    assert(reLoginData.user.workingHoursFormatted === '8:30 AM - 7:30 PM', '10f. Updated working hours formatted as 12-hour AM/PM (8:30 AM - 7:30 PM)');

    // Verify Customer Portal GET /api/customer/providers shows genuine provider rate and AM/PM hours
    const custProvidersRes = await fetch(`${BASE_URL}/api/customer/providers`);
    const custProvidersData = await custProvidersRes.json();
    assert(custProvidersData.success === true, '10g. Customer Portal GET /api/customer/providers succeeded');
    const custProviderEntry = custProvidersData.providers.find(p => p.email === provEmail);
    assert(!!custProviderEntry, '10h. Registered provider appears in Customer Portal providers list');
    assert(custProviderEntry.rate === 550 && custProviderEntry.price === 550, '10i. Customer Portal displays genuine provider rate (550) without fake fallbacks');
    assert(custProviderEntry.pricingUnit === 'Per Visit', '10j. Customer Portal displays genuine provider pricing unit (Per Visit)');
    assert(custProviderEntry.workingHoursFormatted === '8:30 AM - 7:30 PM', '10k. Customer Portal displays working hours in 12-hour AM/PM format');

    // ---------------------------------------------------------------------------------
    // STEP 11: Service Create, Update, Delete Persistence
    // ---------------------------------------------------------------------------------
    console.log('\n--- REQUIREMENT 11: Service CRUD Persistence in MongoDB ---');
    // Create service
    const createServiceRes = await fetch(`${BASE_URL}/api/provider/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: provEmail,
        name: 'Smart Meter & MCB Upgrade',
        category: 'Electrician',
        description: 'Complete replacement of main MCB and smart distribution box.',
        price: 1250,
        time: '2 hours',
        estimatedDuration: '2 hours',
        isAvailable: true
      })
    });
    const createServiceData = await createServiceRes.json();
    assert(createServiceData.success === true, '11a. Service created via POST /api/provider/services');
    const serviceId = createServiceData.service._id;

    // Verify in MongoDB Service collection
    let dbService = await Service.findById(serviceId);
    assert(!!dbService, '11b. Service document persisted in MongoDB services collection');
    assert(dbService.price === 1250, '11c. Service price 1250 persisted in MongoDB');

    // Verify Provider.pricing was synchronized
    let syncProvDoc = await Provider.findById(dbProvider._id);
    const hasServiceInPricing = syncProvDoc.pricing.some(p => p.service === 'Smart Meter & MCB Upgrade' && p.price === 1250);
    assert(hasServiceInPricing, '11d. Provider.pricing synchronized with new service in MongoDB');

    // Update service
    const updateServiceRes = await fetch(`${BASE_URL}/api/provider/services/${serviceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: provEmail,
        price: 1450,
        description: 'Updated: Complete replacement of main MCB with surge protection.'
      })
    });
    const updateServiceData = await updateServiceRes.json();
    assert(updateServiceData.success === true, '11e. Service updated via PUT /api/provider/services/:id');

    dbService = await Service.findById(serviceId);
    assert(dbService.price === 1450, '11f. Updated service price (1450) persisted in MongoDB');

    // Delete service
    const deleteServiceRes = await fetch(`${BASE_URL}/api/provider/services/${serviceId}?email=${encodeURIComponent(provEmail)}`, {
      method: 'DELETE'
    });
    const deleteServiceData = await deleteServiceRes.json();
    assert(deleteServiceData.success === true, '11g. Service deleted via DELETE /api/provider/services/:id');

    dbService = await Service.findById(serviceId);
    assert(!dbService, '11h. Service document confirmed deleted from MongoDB services collection');

    // ---------------------------------------------------------------------------------
    // STEP 12: Booking Creation and Status Updates Persistence
    // ---------------------------------------------------------------------------------
    console.log('\n--- REQUIREMENT 12: Booking Persistence & Status Workflow ---');
    const bookingRes = await fetch(`${BASE_URL}/api/customer/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Kavitha S',
        customerEmail: 'kavitha.s@smartserve.ai',
        customerPhone: '+91 94444 55555',
        providerName: 'Vikram Master Electricals Pro',
        providerEmail: provEmail,
        providerPhone: '+91 98401 99999',
        serviceType: 'Electrician',
        serviceName: 'Electrician Standard Service',
        date: '2026-11-10',
        time: '10:00 AM',
        amount: 350,
        location: 'Peelamedu, Coimbatore'
      })
    });
    const bookingData = await bookingRes.json();
    assert(bookingData.success === true, '12a. Booking created via POST /api/customer/bookings');
    const bookingDbId = bookingData.booking._id;

    let dbBooking = await Booking.findById(bookingDbId);
    assert(!!dbBooking, '12b. Booking document persisted in MongoDB bookings collection');
    assert(dbBooking.status === 'Pending', '12c. Initial booking status is Pending in MongoDB');

    // Provider accepts booking (Pending -> Confirmed)
    const acceptBookingRes = await fetch(`${BASE_URL}/api/provider/bookings/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bookingDbId, status: 'Confirmed' })
    });
    const acceptBookingData = await acceptBookingRes.json();
    assert(acceptBookingData.success === true, '12d. Booking status updated to Confirmed');

    dbBooking = await Booking.findById(bookingDbId);
    assert(dbBooking.status === 'Confirmed', '12e. Confirmed status persisted in MongoDB');

    // Complete booking
    await fetch(`${BASE_URL}/api/provider/bookings/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bookingDbId, status: 'Completed' })
    });
    dbBooking = await Booking.findById(bookingDbId);
    assert(dbBooking.status === 'Completed', '12f. Completed status persisted in MongoDB');

    // ---------------------------------------------------------------------------------
    // STEPS 13-14: Account Deletion Password Verification & Error Reporting
    // ---------------------------------------------------------------------------------
    console.log('\n--- REQUIREMENT 13-14: Account Deletion With Incorrect/Correct Password ---');
    // 13a & 14. Failed operation with wrong password
    const delFailRes = await fetch(`${BASE_URL}/api/provider/account/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-authenticated-email': provEmail
      },
      body: JSON.stringify({ email: provEmail, password: 'WrongPasswordForDeletion!' })
    });
    const delFailData = await delFailRes.json();
    assert(delFailRes.status === 401, '13a. Wrong password for deletion returns 401');
    assert(delFailData.success === false, '14. Failed deletion does NOT produce a false success message');

    // Confirm account remains intact
    const intactUser = await User.findById(dbUser._id);
    assert(!!intactUser, '14b. User record remains intact after failed deletion attempt');

    // 13b. Successful deletion with correct password
    const delSuccessRes = await fetch(`${BASE_URL}/api/provider/account/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-authenticated-email': provEmail
      },
      body: JSON.stringify({ email: provEmail, password: provPassword })
    });
    const delSuccessData = await delSuccessRes.json();
    assert(delSuccessRes.status === 200 && delSuccessData.success === true, '13b. Account deletion with correct password succeeds');

    // Verify deletion in MongoDB
    const deletedUser = await User.findById(dbUser._id);
    const deletedProvider = await Provider.findById(dbProvider._id);
    const deletedServices = await Service.find({ providerId: dbProvider._id });
    assert(!deletedUser, '13c. User removed from MongoDB users collection');
    assert(!deletedProvider, '13d. Provider removed from MongoDB providers collection');
    assert(deletedServices.length === 0, '13e. Provider services cleaned up from MongoDB');

    // Clean up test booking
    await Booking.findByIdAndDelete(bookingDbId);

    // ---------------------------------------------------------------------------------
    // STEP 15: Customer Registration & Authentication
    // ---------------------------------------------------------------------------------
    console.log('\n--- REQUIREMENT 15: Customer Registration & Authentication ---');
    const custEmail = `test_cust_flow_${timestamp}@smartserve.ai`;
    const custPassword = 'CustomerFlowPass!123';

    const regCustRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Arunmozhi Varman',
        email: custEmail,
        password: custPassword,
        phone: '+91 97777 88888',
        role: 'Customer'
      })
    });
    const regCustData = await regCustRes.json();
    assert(regCustData.success === true, '15a. Customer registration succeeded');

    const dbCustUser = await User.findOne({ email: custEmail });
    assert(!!dbCustUser, '15b. Customer User document created in MongoDB');
    assert(isSha256(dbCustUser.password), '15c. Customer password stored as SHA-256 hash');

    const dbCustDoc = await Customer.findOne({ user: dbCustUser._id });
    assert(!!dbCustDoc, '15d. Customer document created in MongoDB');
    assert(dbCustDoc.email === custEmail, '15e. Customer email persisted in Customer document');

    // Authenticate customer
    const loginCustRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: custEmail, password: custPassword, role: 'Customer' })
    });
    const loginCustData = await loginCustRes.json();
    assert(loginCustData.success === true, '15f. Customer login succeeded with password');

    // Clean up test customer
    await User.findByIdAndDelete(dbCustUser._id);
    await Customer.findByIdAndDelete(dbCustDoc._id);

    // ---------------------------------------------------------------------------------
    // STEP 16: Verify Unrelated Existing Accounts Remain Intact
    // ---------------------------------------------------------------------------------
    console.log('\n--- REQUIREMENT 16: Unrelated Accounts Integrity ---');
    const finalUsersCount = await User.countDocuments();
    const finalProvidersCount = await Provider.countDocuments();
    const finalCustomersCount = await Customer.countDocuments();
    assert(finalUsersCount === initialUsersCount, `16a. Users count intact (Started: ${initialUsersCount}, Ended: ${finalUsersCount})`);
    assert(finalProvidersCount === initialProvidersCount, `16b. Providers count intact (Started: ${initialProvidersCount}, Ended: ${finalProvidersCount})`);
    assert(finalCustomersCount === initialCustomersCount, `16c. Customers count intact (Started: ${initialCustomersCount}, Ended: ${finalCustomersCount})`);

    // Verify admin account is intact
    const adminUser = await User.findOne({ role: 'Admin' });
    assert(!!adminUser, '16d. Super Administrator account intact in MongoDB');

    console.log('\n================================================================');
    console.log(`PERSISTENCE VERIFICATION SUITE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    await mongoose.disconnect();
    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal test suite error:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runPersistenceTests();
