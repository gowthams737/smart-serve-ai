import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartserve';

async function performAudit() {
  console.log('=== SMART SERVE AI: SAFE READ-ONLY DATABASE AUDIT ===\n');
  await mongoose.connect(mongoUri);

  const db = mongoose.connection.db;
  const collections = await db.listCollections().toArray();
  const collNames = collections.map(c => c.name).sort();

  console.log(`Auditing Database: ${mongoose.connection.name}`);
  console.log(`Found Collections (${collNames.length}): ${collNames.join(', ')}\n`);

  // Define known seeded / demonstration emails from seed.js
  const SEED_EMAILS = new Set([
    'gowtham.s@smartserve.ai',
    'sandhya.r@gmail.com',
    'manoj.k@yahoo.com',
    'eshwari.s@outlook.com',
    'ramachandran.v@gmail.com',
    'karthik.raja@live.com',
    'rajesh.k@smartserve.ai',
    'priya.s@smartserve.ai',
    'amit.p@smartserve.ai',
    'ramesh.c@smartserve.ai',
    'anjali.n@smartserve.ai'
  ]);

  // Test account pattern indicators
  const isTestEmail = (email) => {
    if (!email) return false;
    const e = email.toLowerCase();
    return (
      e.startsWith('sec_cust_') ||
      e.startsWith('sec_prov_') ||
      e.startsWith('legacy_sha_') ||
      e.startsWith('browser_cust_') ||
      e.startsWith('test_prov_') ||
      e.startsWith('test_customer_') ||
      e.startsWith('test_provider_') ||
      e.startsWith('provider_179') ||
      e.startsWith('prov_a_') ||
      e.startsWith('prov_b_') ||
      e.startsWith('prov_partial_') ||
      e.startsWith('prov_keep_') ||
      e.startsWith('persist_prov_') ||
      e.startsWith('testprov_') ||
      e.startsWith('ai_test_') ||
      e.startsWith('cbe.test@') ||
      e.includes('underage_') ||
      e.includes('badexp_')
    );
  };

  const auditReport = {};

  for (const name of collNames) {
    const coll = db.collection(name);
    const count = await coll.countDocuments();
    const docs = await coll.find({}).toArray();

    auditReport[name] = {
      totalCount: count,
      genuineCount: 0,
      seedDemoCount: 0,
      testFixtureCount: 0,
      unverifiableCount: 0,
      records: docs
    };
  }

  // --- Collection Analysis ---

  // 1. Users
  const userDocs = auditReport['users']?.records || [];
  const userMap = new Map();
  userDocs.forEach(u => {
    userMap.set(u._id.toString(), u);
    userMap.set(u.email?.toLowerCase(), u);
    const e = u.email?.toLowerCase();
    if (SEED_EMAILS.has(e)) {
      auditReport['users'].seedDemoCount++;
      u._auditCategory = 'SEED_DEMO';
    } else if (isTestEmail(e)) {
      auditReport['users'].testFixtureCount++;
      u._auditCategory = 'TEST_FIXTURE';
    } else {
      auditReport['users'].genuineCount++;
      u._auditCategory = 'GENUINE';
    }
  });

  // 2. Customers
  const custDocs = auditReport['customers']?.records || [];
  const custMap = new Map();
  custDocs.forEach(c => {
    custMap.set(c._id.toString(), c);
    const u = c.user ? userMap.get(c.user.toString()) : null;
    const email = (c.email || u?.email || '').toLowerCase();
    if (SEED_EMAILS.has(email)) {
      auditReport['customers'].seedDemoCount++;
      c._auditCategory = 'SEED_DEMO';
    } else if (isTestEmail(email)) {
      auditReport['customers'].testFixtureCount++;
      c._auditCategory = 'TEST_FIXTURE';
    } else if (u) {
      auditReport['customers'].genuineCount++;
      c._auditCategory = 'GENUINE';
    } else {
      auditReport['customers'].unverifiableCount++;
      c._auditCategory = 'UNVERIFIABLE';
    }
  });

  // 3. Providers
  const provDocs = auditReport['providers']?.records || [];
  const provMap = new Map();
  provDocs.forEach(p => {
    provMap.set(p._id.toString(), p);
    const u = p.user ? userMap.get(p.user.toString()) : null;
    const email = (p.email || u?.email || '').toLowerCase();
    if (SEED_EMAILS.has(email)) {
      auditReport['providers'].seedDemoCount++;
      p._auditCategory = 'SEED_DEMO';
    } else if (isTestEmail(email)) {
      auditReport['providers'].testFixtureCount++;
      p._auditCategory = 'TEST_FIXTURE';
    } else if (u) {
      auditReport['providers'].genuineCount++;
      p._auditCategory = 'GENUINE';
    } else {
      auditReport['providers'].unverifiableCount++;
      p._auditCategory = 'UNVERIFIABLE';
    }
  });

  // 4. Services
  const serviceDocs = auditReport['services']?.records || [];
  serviceDocs.forEach(s => {
    const prov = s.providerId ? provMap.get(s.providerId.toString()) : null;
    const provEmail = (s.providerEmail || prov?.email || '').toLowerCase();
    if (SEED_EMAILS.has(provEmail)) {
      auditReport['services'].seedDemoCount++;
      s._auditCategory = 'SEED_DEMO';
    } else if (isTestEmail(provEmail) || isTestEmail(s.name)) {
      auditReport['services'].testFixtureCount++;
      s._auditCategory = 'TEST_FIXTURE';
    } else if (prov) {
      auditReport['services'].genuineCount++;
      s._auditCategory = 'GENUINE';
    } else {
      auditReport['services'].unverifiableCount++;
      s._auditCategory = 'UNVERIFIABLE';
    }
  });

  // 5. Bookings
  const bookingDocs = auditReport['bookings']?.records || [];
  bookingDocs.forEach(b => {
    const cEmail = (b.customerEmail || '').toLowerCase();
    const pEmail = (b.providerEmail || '').toLowerCase();
    if (SEED_EMAILS.has(cEmail) || SEED_EMAILS.has(pEmail) || b.bookingId === 'b1' || b.bookingId === 'b2' || b.bookingId === 'b3' || b.bookingId === 'b4') {
      auditReport['bookings'].seedDemoCount++;
      b._auditCategory = 'SEED_DEMO';
    } else if (isTestEmail(cEmail) || isTestEmail(pEmail) || b.customerName?.toLowerCase().includes('persist')) {
      auditReport['bookings'].testFixtureCount++;
      b._auditCategory = 'TEST_FIXTURE';
    } else {
      auditReport['bookings'].genuineCount++;
      b._auditCategory = 'GENUINE';
    }
  });

  // 6. Reviews
  const reviewDocs = auditReport['reviews']?.records || [];
  reviewDocs.forEach(r => {
    const cEmail = (r.customerEmail || '').toLowerCase();
    const pId = r.providerId ? r.providerId.toString() : '';
    const prov = provMap.get(pId);
    if (SEED_EMAILS.has(cEmail) || (prov && SEED_EMAILS.has(prov.email))) {
      auditReport['reviews'].seedDemoCount++;
      r._auditCategory = 'SEED_DEMO';
    } else if (isTestEmail(cEmail)) {
      auditReport['reviews'].testFixtureCount++;
      r._auditCategory = 'TEST_FIXTURE';
    } else {
      auditReport['reviews'].genuineCount++;
      r._auditCategory = 'GENUINE';
    }
  });

  // 7. Notifications
  const notifDocs = auditReport['notifications']?.records || [];
  notifDocs.forEach(n => {
    const rEmail = (n.recipientEmail || '').toLowerCase();
    if (SEED_EMAILS.has(rEmail)) {
      auditReport['notifications'].seedDemoCount++;
      n._auditCategory = 'SEED_DEMO';
    } else if (isTestEmail(rEmail)) {
      auditReport['notifications'].testFixtureCount++;
      n._auditCategory = 'TEST_FIXTURE';
    } else {
      auditReport['notifications'].genuineCount++;
      n._auditCategory = 'GENUINE';
    }
  });

  // 8. Service Categories
  const catDocs = auditReport['servicecategories']?.records || [];
  catDocs.forEach(c => {
    // Service categories are system-defined platform catalog options
    auditReport['servicecategories'].genuineCount++;
    c._auditCategory = 'GENUINE';
  });

  // 9. Complaints
  const complaintDocs = auditReport['complaints']?.records || [];
  complaintDocs.forEach(c => {
    const cEmail = (c.customerEmail || '').toLowerCase();
    if (SEED_EMAILS.has(cEmail)) {
      auditReport['complaints'].seedDemoCount++;
      c._auditCategory = 'SEED_DEMO';
    } else if (isTestEmail(cEmail)) {
      auditReport['complaints'].testFixtureCount++;
      c._auditCategory = 'TEST_FIXTURE';
    } else {
      auditReport['complaints'].genuineCount++;
      c._auditCategory = 'GENUINE';
    }
  });

  // 10. Earnings
  const earningDocs = auditReport['earnings']?.records || [];
  earningDocs.forEach(e => {
    const pEmail = (e.providerEmail || '').toLowerCase();
    if (SEED_EMAILS.has(pEmail)) {
      auditReport['earnings'].seedDemoCount++;
      e._auditCategory = 'SEED_DEMO';
    } else if (isTestEmail(pEmail)) {
      auditReport['earnings'].testFixtureCount++;
      e._auditCategory = 'TEST_FIXTURE';
    } else {
      auditReport['earnings'].genuineCount++;
      e._auditCategory = 'GENUINE';
    }
  });

  // 11. Settings & Counters
  if (auditReport['settings']) auditReport['settings'].genuineCount = auditReport['settings'].totalCount;
  if (auditReport['counters']) auditReport['counters'].genuineCount = auditReport['counters'].totalCount;
  if (auditReport['chatconversations']) auditReport['chatconversations'].genuineCount = auditReport['chatconversations'].totalCount;

  // Print Summary Table
  console.log('-----------------------------------------------------------------------------------------------------');
  console.log(
    'Collection'.padEnd(20) +
    'Total'.padEnd(10) +
    'Genuine'.padEnd(12) +
    'Seed/Demo'.padEnd(14) +
    'Test Fixture'.padEnd(16) +
    'Unverifiable'.padEnd(14)
  );
  console.log('-----------------------------------------------------------------------------------------------------');

  for (const name of collNames) {
    const r = auditReport[name];
    console.log(
      name.padEnd(20) +
      String(r.totalCount).padEnd(10) +
      String(r.genuineCount).padEnd(12) +
      String(r.seedDemoCount).padEnd(14) +
      String(r.testFixtureCount).padEnd(16) +
      String(r.unverifiableCount).padEnd(14)
    );
  }
  console.log('-----------------------------------------------------------------------------------------------------\n');

  // Print Detailed Breakdown of Genuine Records
  console.log('=== GENUINE APPLICATION RECORDS (PROTECTED) ===');
  for (const name of collNames) {
    const gen = (auditReport[name].records || []).filter(r => r._auditCategory === 'GENUINE');
    if (gen.length > 0) {
      console.log(`\nCollection: [${name}] (${gen.length} genuine records)`);
      gen.forEach(r => {
        if (name === 'users') {
          console.log(`  - User: ${r.fullName} (${r.email}) | Role: ${r.role} | Joined: ${r.joinedDate || r.createdAt || 'N/A'}`);
        } else if (name === 'customers') {
          console.log(`  - Customer: ${r.name || r.email || r._id} | City: ${r.city} | Address: ${r.address}`);
        } else if (name === 'providers') {
          console.log(`  - Provider: ${r.name || r.email} | Category: ${r.category} | Status: ${r.status}`);
        } else if (name === 'services') {
          console.log(`  - Service: "${r.name}" (${r.category}) | Price: ₹${r.price} | ProviderId: ${r.providerId}`);
        } else if (name === 'bookings') {
          console.log(`  - Booking #${r.bookingId}: ${r.customerName} -> ${r.providerName} | Status: ${r.status} | Amount: ₹${r.amount}`);
        } else if (name === 'reviews') {
          console.log(`  - Review #${r.bookingId}: Rating ${r.rating}* by ${r.customerName}`);
        } else if (name === 'notifications') {
          console.log(`  - Notif: "${r.title}" for ${r.recipientEmail || r.recipientRole}`);
        } else {
          console.log(`  - Record ID: ${r._id}`);
        }
      });
    }
  }

  // Print Detailed Breakdown of Seed/Demo & Test Records (For user review and cleanup proposal)
  console.log('\n=== SEED / DEMONSTRATION & TEST FIXTURES IDENTIFIED FOR REVIEW ===');
  for (const name of collNames) {
    const candidateDocs = (auditReport[name].records || []).filter(r => r._auditCategory === 'SEED_DEMO' || r._auditCategory === 'TEST_FIXTURE');
    if (candidateDocs.length > 0) {
      console.log(`\nCollection: [${name}] (${candidateDocs.length} records)`);
      candidateDocs.forEach(r => {
        const type = r._auditCategory;
        if (name === 'users') {
          console.log(`  [${type}] ${r.fullName} (${r.email}) [Role: ${r.role}]`);
        } else if (name === 'providers') {
          console.log(`  [${type}] ${r.name} (${r.email}) [Category: ${r.category}]`);
        } else if (name === 'customers') {
          console.log(`  [${type}] ${r.name || r.email || r._id} (${r.city})`);
        } else if (name === 'services') {
          console.log(`  [${type}] "${r.name}" (Provider: ${r.providerEmail || r.providerId})`);
        } else if (name === 'bookings') {
          console.log(`  [${type}] Booking #${r.bookingId} (${r.customerName} -> ${r.providerName})`);
        } else if (name === 'notifications') {
          console.log(`  [${type}] "${r.title}" (To: ${r.recipientEmail || r.recipientRole})`);
        } else {
          console.log(`  [${type}] ID: ${r._id}`);
        }
      });
    }
  }

  // Check Cross-Reference Inconsistencies & Orphaned Records
  console.log('\n=== CROSS-REFERENCE INTEGRITY AUDIT ===');
  let issues = 0;

  // 1. Providers without Users
  provDocs.forEach(p => {
    if (!p.user || !userMap.has(p.user.toString())) {
      console.log(`  [ORPHAN] Provider ${p._id} (${p.name || p.email}) references missing or null user: ${p.user}`);
      issues++;
    }
  });

  // 2. Customers without Users
  custDocs.forEach(c => {
    if (!c.user || !userMap.has(c.user.toString())) {
      console.log(`  [ORPHAN] Customer ${c._id} references missing or null user: ${c.user}`);
      issues++;
    }
  });

  // 3. Services without valid Provider
  serviceDocs.forEach(s => {
    if (!s.providerId || !provMap.has(s.providerId.toString())) {
      console.log(`  [ORPHAN] Service ${s._id} ("${s.name}") references non-existent providerId: ${s.providerId}`);
      issues++;
    }
  });

  if (issues === 0) {
    console.log('✓ All Provider, Customer, and Service foreign keys and references are 100% consistent!');
  } else {
    console.log(`⚠️ Found ${issues} orphaned or mismatched reference(s).`);
  }

  await mongoose.disconnect();
  console.log('\n=== AUDIT FINISHED (READ-ONLY: ZERO RECORDS MODIFIED) ===');
}

performAudit().catch(err => {
  console.error('Audit failed:', err);
  process.exit(1);
});
