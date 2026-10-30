import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import User from '../models/User.js';
import Provider from '../models/Provider.js';
import Customer from '../models/Customer.js';
import Service from '../models/Service.js';
import { hashPassword, isSha256 } from '../routes/authRoutes.js';
import { saveImageIfBase64 } from '../utils/imageHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartserve';

async function migrate() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);

  // 1. Migrate Base64 and Unsplash default images in Users
  const users = await User.find({});
  console.log(`Auditing ${users.length} users...`);
  for (const user of users) {
    let changed = false;

    // Password check: ensure all passwords are valid SHA-256
    if (user.password && !isSha256(user.password)) {
      console.log(`Migrating plaintext password to SHA-256 for user: ${user.email}`);
      user.password = hashPassword(user.password);
      changed = true;
    } else if (!user.password && user.role !== 'Admin') {
      console.log(`Setting standard password hash for empty password user: ${user.email}`);
      user.password = hashPassword('password123');
      changed = true;
    }

    // Image check: convert base64 to disk file
    if (user.profileImage && user.profileImage.startsWith('data:image/')) {
      console.log(`Saving base64 image to file for user: ${user.email}`);
      const fileUrl = saveImageIfBase64(user.profileImage);
      user.profileImage = fileUrl;
      changed = true;
    }

    if (changed) {
      await user.save();
    }
  }

  // 2. Migrate Providers
  const providers = await Provider.find({}).populate('user');
  console.log(`Auditing ${providers.length} providers...`);
  for (const prov of providers) {
    let changed = false;

    // If photo is the unwanted Mongoose default Unsplash placeholder
    if (prov.photo && prov.photo.includes('images.unsplash.com/photo-1566492031773-4f4e44671857')) {
      const userPhoto = prov.user?.profileImage;
      if (userPhoto && !userPhoto.includes('images.unsplash.com/photo-1566492031773-4f4e44671857')) {
        prov.photo = userPhoto;
      } else {
        prov.photo = '';
      }
      changed = true;
      console.log(`Cleared default Unsplash photo for provider: ${prov.email}`);
    } else if (prov.photo && prov.photo.startsWith('data:image/')) {
      console.log(`Saving base64 image to file for provider: ${prov.email}`);
      const fileUrl = saveImageIfBase64(prov.photo);
      prov.photo = fileUrl;
      changed = true;
    }

    // Ensure user profile image matches provider photo if user had base64
    if (prov.user && prov.photo && prov.user.profileImage !== prov.photo) {
      prov.user.profileImage = prov.photo;
      await prov.user.save();
    }

    if (changed) {
      await prov.save();
      if (prov.photo) {
        await Service.updateMany({ providerId: prov._id }, { $set: { image: prov.photo } });
      }
    }
  }

  // 3. Migrate Customers
  const customers = await Customer.find({}).populate('user');
  console.log(`Auditing ${customers.length} customers...`);
  for (const cust of customers) {
    let changed = false;
    if (cust.photo && cust.photo.startsWith('data:image/')) {
      console.log(`Saving base64 image to file for customer: ${cust.email}`);
      cust.photo = saveImageIfBase64(cust.photo);
      changed = true;
    } else if (!cust.photo && cust.user?.profileImage) {
      cust.photo = cust.user.profileImage;
      changed = true;
    }

    if (changed) {
      await cust.save();
    }
  }

  console.log('Migration completed successfully.');
  await mongoose.disconnect();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
