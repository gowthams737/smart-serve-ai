import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Provider from '../models/Provider.js';
import Customer from '../models/Customer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartserve';

async function inspectRelationships() {
  await mongoose.connect(uri);
  console.log('--- AUDITING PROVIDERS AND USERS ---');

  const allProviders = await Provider.find({}).populate('user');
  console.log(`Total providers in DB: ${allProviders.length}`);

  let valid = 0;
  let orphaned = 0;
  for (const p of allProviders) {
    if (!p.user) {
      orphaned++;
      console.log(`  Orphaned Provider ID: ${p._id} | User ref: ${p.get('user')} | Category: ${p.category}`);
    } else {
      valid++;
      console.log(`  Valid Provider ID: ${p._id} | User: ${p.user.email} (${p.user.fullName}) | Age: ${p.age} | Gender: ${p.gender} | Exp: ${p.experience} | Photo: ${p.photo ? 'present' : 'none'}`);
    }
  }
  console.log(`Summary: ${valid} valid linked providers, ${orphaned} orphaned providers.`);

  console.log('\n--- AUDITING CUSTOMERS AND USERS ---');
  const allCustomers = await Customer.find({}).populate('user');
  console.log(`Total customers in DB: ${allCustomers.length}`);
  let validCust = 0;
  let orphanedCust = 0;
  for (const c of allCustomers) {
    if (!c.user) {
      orphanedCust++;
      console.log(`  Orphaned Customer ID: ${c._id} | User ref: ${c.get('user')}`);
    } else {
      validCust++;
      console.log(`  Valid Customer ID: ${c._id} | User: ${c.user.email} (${c.user.fullName}) | Addresses: ${c.savedAddresses?.length || 0} | Saved: ${c.savedProviders?.length || 0}`);
    }
  }
  console.log(`Summary: ${validCust} valid linked customers, ${orphanedCust} orphaned customers.`);

  await mongoose.disconnect();
}

inspectRelationships().catch(console.error);
