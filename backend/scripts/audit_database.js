import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Provider from '../models/Provider.js';
import Customer from '../models/Customer.js';
import Service from '../models/Service.js';
import Booking from '../models/Booking.js';
import { isBcrypt, isSha256 } from '../routes/authRoutes.js';
import { uploadedFileExists } from '../utils/imageHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartserve';

async function auditDatabase() {
  console.log('=== SMART SERVE AI: DATABASE AUDIT & DATA INTEGRITY CHECK ===\n');
  await mongoose.connect(mongoUri);

  const users = await User.find({}).lean();
  const customers = await Customer.find({}).lean();
  const providers = await Provider.find({}).lean();
  const services = await Service.find({}).lean();
  const bookings = await Booking.find({}).lean();

  console.log(`Summary of Collections:`);
  console.log(`- Users: ${users.length}`);
  console.log(`- Customers: ${customers.length}`);
  console.log(`- Providers: ${providers.length}`);
  console.log(`- Services: ${services.length}`);
  console.log(`- Bookings: ${bookings.length}\n`);

  // 1. Audit Users
  console.log('--- 1. Auditing User Credentials & Hashes ---');
  let bcryptCount = 0;
  let sha256Count = 0;
  let plaintextCount = 0;
  let emptyPassCount = 0;

  for (const u of users) {
    let hashType = 'EMPTY';
    if (u.password) {
      if (isBcrypt(u.password)) {
        hashType = 'BCRYPT';
        bcryptCount++;
      } else if (isSha256(u.password)) {
        hashType = 'SHA-256 (Backward-compatible, will rehash on login)';
        sha256Count++;
      } else {
        hashType = 'PLAINTEXT';
        plaintextCount++;
      }
    } else {
      emptyPassCount++;
    }

    let imgStatus = 'EMPTY';
    if (u.profileImage) {
      if (u.profileImage.startsWith('data:image/')) {
        imgStatus = 'RAW_BASE64 (needs migration)';
      } else if (u.profileImage.includes('/uploads/')) {
        const exists = uploadedFileExists(u.profileImage);
        imgStatus = exists ? 'VALID_DISK_FILE' : 'FILE_NOT_ON_DISK';
      } else {
        imgStatus = 'EXTERNAL_URL';
      }
    }

    console.log(`User [${u.role}]: ${u.email} | Pass: ${hashType} | Image: ${imgStatus}`);
  }

  console.log(`\nPassword Hash Distribution:`);
  console.log(`- Bcrypt: ${bcryptCount}`);
  console.log(`- SHA-256 (migration): ${sha256Count}`);
  console.log(`- Plaintext: ${plaintextCount}`);
  console.log(`- Empty: ${emptyPassCount}`);

  // 2. Audit Providers
  console.log('\n--- 2. Auditing Providers & Photos ---');
  let hardcodedUnsplashCount = 0;
  for (const p of providers) {
    const hasUnsplash = p.photo && p.photo.includes('images.unsplash.com/photo-1566492031773-4f4e44671857');
    if (hasUnsplash) hardcodedUnsplashCount++;
    console.log(`Provider: ${p.email} | Rate: ₹${p.rate} | Category: ${p.category} | Photo: ${p.photo ? (hasUnsplash ? 'UNSPLASH_DEFAULT' : (p.photo.includes('/uploads/') ? 'UPLOADED_FILE' : 'CUSTOM_URL')) : 'EMPTY'}`);
  }
  console.log(`Hardcoded Unsplash Providers: ${hardcodedUnsplashCount}`);

  // 3. Audit Services
  console.log('\n--- 3. Auditing Services ---');
  console.log(`Total Services: ${services.length}`);
  for (const s of services) {
    console.log(`Service: "${s.name}" (Provider: ${s.providerEmail}) | Price: ₹${s.price} | Image: ${s.image ? (s.image.includes('/uploads/') ? 'UPLOAD_FILE' : 'CUSTOM') : 'EMPTY'}`);
  }

  // 4. Audit Bookings
  console.log('\n--- 4. Auditing Bookings (Historical Snapshot Integrity) ---');
  console.log(`Total Bookings: ${bookings.length}`);
  for (const b of bookings.slice(0, 5)) {
    console.log(`Booking #${b.bookingId || b._id} | Customer: ${b.customerName} (${b.customerPhone}) | Provider: ${b.providerName} | Status: ${b.status} | Amount: ₹${b.amount}`);
  }

  console.log('\n=== AUDIT COMPLETE ===');
  await mongoose.disconnect();
}

auditDatabase().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
