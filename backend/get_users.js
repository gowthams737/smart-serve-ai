import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  await mongoose.connect('mongodb://localhost:27017/smartserve');
  const users = await mongoose.connection.db.collection('users').find().toArray();
  console.log(users.map(u => ({ id: u._id.toString(), email: u.email, role: u.role, fullName: u.fullName })));
  await mongoose.disconnect();
}
main().catch(console.error);
