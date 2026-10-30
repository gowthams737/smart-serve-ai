import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Provider from '../models/Provider.js';
import Setting from '../models/Setting.js';
import Service from '../models/Service.js';
import ServiceCategory from '../models/ServiceCategory.js';
import { hashPassword, isSha256 } from '../routes/authRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartserve';

export const runPersistenceMigration = async () => {
  console.log('=== SMART SERVE AI - DATABASE PERSISTENCE MIGRATION ===');
  console.log(`Connecting to MongoDB at: ${mongoUri}...`);

  await mongoose.connect(mongoUri);
  console.log(`MongoDB connected successfully to database: ${mongoose.connection.name}\n`);

  const report = {
    orphanedProvidersRemoved: 0,
    orphanedCustomersRemoved: 0,
    usersMigrated: 0,
    providersSynchronized: 0,
    customersSynchronized: 0,
    servicesSynchronized: 0,
    settingsInitialized: false,
    categoriesVerified: 0
  };

  // 1. Clean up orphaned Provider and Customer records (where User was deleted in legacy runs)
  const allProviders = await Provider.find({});
  for (const p of allProviders) {
    const userExists = await User.findById(p.user);
    if (!userExists) {
      await Provider.findByIdAndDelete(p._id);
      report.orphanedProvidersRemoved++;
      console.log(`  [Cleaned Orphaned Provider] ID: ${p._id} (User ref ${p.user} does not exist)`);
    }
  }

  const allCustomers = await Customer.find({});
  for (const c of allCustomers) {
    const userExists = await User.findById(c.user);
    if (!userExists) {
      await Customer.findByIdAndDelete(c._id);
      report.orphanedCustomersRemoved++;
      console.log(`  [Cleaned Orphaned Customer] ID: ${c._id} (User ref ${c.user} does not exist)`);
    }
  }

  // 2. Migrate Users: Ensure all users have valid SHA-256 password hashes
  const users = await User.find({});
  console.log(`\nAuditing ${users.length} user records for password hash persistence...`);
  for (const user of users) {
    let changed = false;
    if (!user.password || user.password.trim() === '') {
      user.password = hashPassword('password123');
      changed = true;
    } else if (!isSha256(user.password)) {
      user.password = hashPassword(user.password);
      changed = true;
    }

    if (changed) {
      await user.save();
      report.usersMigrated++;
      console.log(`  [User Migrated] ${user.email} (${user.role}) -> SHA-256 hash persisted.`);
    }
  }

  // 3. Migrate Providers: Ensure name, email, phone, bio, photo are synced directly on Provider document
  const validProviders = await Provider.find({}).populate('user');
  console.log(`\nAuditing ${validProviders.length} valid provider records for complete data persistence...`);
  for (const p of validProviders) {
    if (!p.user) continue;
    let changed = false;

    if (!p.name || p.name !== p.user.fullName) {
      p.name = p.user.fullName;
      changed = true;
    }
    if (!p.email || p.email !== p.user.email) {
      p.email = p.user.email;
      changed = true;
    }
    if (!p.phone || p.phone !== p.user.phone) {
      p.phone = p.user.phone;
      changed = true;
    }
    if (!p.photo && p.user.profileImage) {
      p.photo = p.user.profileImage;
      changed = true;
    }
    if (!p.bio && p.about) {
      p.bio = p.about;
      changed = true;
    }
    if (!p.about && p.bio) {
      p.about = p.bio;
      changed = true;
    }
    if (!Array.isArray(p.workingDays) || p.workingDays.length === 0) {
      p.workingDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      changed = true;
    }

    if (!p.pricingUnit || p.pricingUnit.trim() === '') {
      p.pricingUnit = 'Per Visit';
      changed = true;
    }
    if (!p.rate || p.rate <= 0) {
      p.rate = p.pricing?.[0]?.price || 350;
      p.hourlyRate = p.rate;
      changed = true;
    }

    // Check if provider has active services in Service collection
    const activeServices = await Service.find({ providerId: p._id });
    if (activeServices.length === 0) {
      const defaultServiceName = `${p.category} Standard Service`;
      const servPrice = p.rate || 350;
      const servUnit = p.pricingUnit || 'Per Visit';
      await Service.create({
        providerEmail: p.user.email,
        providerId: p._id,
        name: defaultServiceName,
        category: p.category,
        description: p.bio || p.about || `Professional ${p.category} services.`,
        price: servPrice,
        pricingUnit: servUnit,
        estimatedDuration: '1 hour',
        image: p.photo || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500',
        isAvailable: true
      });
      p.pricing = [{ service: defaultServiceName, price: servPrice, unit: servUnit }];
      changed = true;
      report.servicesSynchronized++;
      console.log(`  [Service Synchronized] Created default service for ${p.user.email} (${p.category})`);
    } else {
      // Sync pricing array with active services
      for (const s of activeServices) {
        if (!s.pricingUnit) {
          s.pricingUnit = p.pricingUnit || 'Per Visit';
          await s.save();
        }
      }
      p.pricing = activeServices.map(s => ({
        service: s.name,
        price: s.price,
        unit: s.pricingUnit || p.pricingUnit || 'Per Visit'
      }));
      if (activeServices.length > 0 && activeServices[0].price > 0) {
        p.rate = activeServices[0].price;
        p.hourlyRate = activeServices[0].price;
      }
      changed = true;
    }

    if (changed) {
      await p.save();
      report.providersSynchronized++;
      console.log(`  [Provider Synchronized] ${p.name} (${p.email}) -> details updated.`);
    }
  }

  // 4. Migrate Customers: Ensure name, email, phone, savedAddresses, savedProviders exist
  const validCustomers = await Customer.find({}).populate('user');
  console.log(`\nAuditing ${validCustomers.length} valid customer records for persistence fields...`);
  for (const c of validCustomers) {
    if (!c.user) continue;
    let changed = false;

    if (!c.name || c.name !== c.user.fullName) {
      c.name = c.user.fullName;
      changed = true;
    }
    if (!c.email || c.email !== c.user.email) {
      c.email = c.user.email;
      changed = true;
    }
    if (!c.phone || c.phone !== c.user.phone) {
      c.phone = c.user.phone;
      changed = true;
    }
    if (!Array.isArray(c.savedAddresses)) {
      c.savedAddresses = [];
      changed = true;
    }
    if (!Array.isArray(c.savedProviders)) {
      c.savedProviders = [];
      changed = true;
    }
    if (!c.state || c.state.trim() === '') {
      c.state = 'Tamil Nadu';
      changed = true;
    }
    if (!c.pincode || c.pincode.trim() === '') {
      c.pincode = '641002';
      changed = true;
    }
    if (!c.city || c.city.trim() === '') {
      c.city = 'Coimbatore';
      changed = true;
    }

    if (changed) {
      await c.save();
      report.customersSynchronized++;
      console.log(`  [Customer Synchronized] ${c.name} (${c.email}) -> fields updated.`);
    }
  }

  // 5. Platform Settings: Ensure default document exists in MongoDB
  let platformSetting = await Setting.findOne();
  if (!platformSetting) {
    platformSetting = await Setting.create({
      general: {
        siteName: 'SmartServe AI',
        supportEmail: 'support@smartserve.ai',
        contactNumber: '+91 422 2451000',
        address: '102 Tidel Park, Peelamedu, Coimbatore, TN - 641014',
        maintenanceMode: false
      },
      notifications: {
        emailAlerts: true,
        smsAlerts: false,
        providerApprovalAlerts: true,
        complaintEscalationAlerts: true,
        bookingStatusAlerts: true
      },
      appearance: {
        defaultTheme: 'dark',
        primaryColor: '#2563eb',
        fontSize: 'medium',
        compactMode: false
      },
      serviceConfiguration: {
        commissionRate: 15,
        minimumBookingAmount: 299,
        autoAssignProviders: false,
        radiusLimitKm: 15
      },
      permissions: [
        { role: 'Admin', module: 'All Modules', access: 'Write/Edit' },
        { role: 'Support Representative', module: 'Complaints, Booking History', access: 'Write/Edit' }
      ]
    });
    report.settingsInitialized = true;
    console.log('\n[Settings] Default platform settings created in MongoDB.');
  } else {
    console.log('\n[Settings] Existing platform settings verified in MongoDB.');
  }

  // 6. Verify Service Categories
  report.categoriesVerified = await ServiceCategory.countDocuments();
  console.log(`\n[Categories] ${report.categoriesVerified} service categories verified in MongoDB.`);

  console.log('\n=== MIGRATION COMPLETE ===');
  console.log(JSON.stringify(report, null, 2));

  return report;
};

// Execute if run directly
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('backend/scripts/migrate_persistence.js')) {
  runPersistenceMigration()
    .then(() => {
      console.log('Migration finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
