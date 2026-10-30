import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartserve';

async function inspect() {
  console.log('Connecting to:', uri);
  await mongoose.connect(uri);
  console.log('Active DB name:', mongoose.connection.name);
  console.log('Active Host:', mongoose.connection.host);
  console.log('Active Port:', mongoose.connection.port);

  const admin = mongoose.connection.db.admin();
  const dbs = await admin.listDatabases();
  console.log('\nAll databases on server:', dbs.databases.map(d => `${d.name} (${(d.sizeOnDisk/1024).toFixed(1)} KB)`));

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log(`\nCollections in "${mongoose.connection.name}":`);
  for (const c of collections) {
    const count = await mongoose.connection.db.collection(c.name).countDocuments();
    console.log(`  - ${c.name}: ${count} documents`);
  }

  // Inspect users
  console.log('\nSample Users:');
  const sampleUsers = await mongoose.connection.db.collection('users').find({}).limit(5).toArray();
  for (const u of sampleUsers) {
    console.log(`  User: ${u.email} | Role: ${u.role} | Pwd length: ${u.password?.length} | IsSha256: ${/^[0-9a-f]{64}$/i.test(u.password)}`);
  }

  // Inspect providers
  console.log('\nSample Providers:');
  const sampleProviders = await mongoose.connection.db.collection('providers').find({}).limit(3).toArray();
  for (const p of sampleProviders) {
    console.log('Provider full doc:', JSON.stringify(p, null, 2));
  }

  await mongoose.disconnect();
}

inspect().catch(console.error);
