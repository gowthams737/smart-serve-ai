import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Provider from '../models/Provider.js';
import ServiceCategory from '../models/ServiceCategory.js';
import Booking from '../models/Booking.js';
import Complaint from '../models/Complaint.js';
import Notification from '../models/Notification.js';
import Review from '../models/Review.js';
import Earning from '../models/Earning.js';
import { hashPassword } from '../routes/authRoutes.js';

dotenv.config();

const mongoUri = process.env.MONGODB_URI_TEST || process.env.MONGODB_URI || 'mongodb://localhost:27017/smartserve';

// Strict guard: Do not run seed against live/production database
const isLiveDb = mongoUri.includes('/smartserve') && !mongoUri.includes('_test');
if (isLiveDb && process.env.ALLOW_SEED_IN_PRODUCTION !== 'true') {
  console.error('\n❌ [ABORT] Automatic seeding of demonstration/sample data into the live/production database is strictly prohibited.');
  console.error('To run seeds in test environments, target a dedicated test database (e.g. MONGODB_URI_TEST=mongodb://localhost:27017/smartserve_test).\n');
  process.exit(1);
}

const seedData = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing collections
    await User.deleteMany({});
    await Customer.deleteMany({});
    await Provider.deleteMany({});
    await ServiceCategory.deleteMany({});
    await Booking.deleteMany({});
    await Complaint.deleteMany({});
    await Notification.deleteMany({});
    await Review.deleteMany({});
    await Earning.deleteMany({});

    console.log('Cleared existing data.');

    // 1. Seed Service Categories
    const categories = [
      { name: 'Electrician', icon: '⚡', image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500', startingPrice: 350, rating: 4.6, duration: 'Per Hour', description: 'Wiring, switches, fan installation, short circuit repair and more.', color: '#f59e0b', bookingsCount: 120 },
      { name: 'Plumber', icon: '🔧', image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=500', startingPrice: 299, rating: 4.5, duration: 'Per Visit', description: 'Pipe fitting, leak repair, tap installation, drainage solutions.', color: '#3b82f6', bookingsCount: 95 },
      { name: 'Carpenter', icon: '🪚', image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=500', startingPrice: 399, rating: 4.7, duration: 'Per Hour', description: 'Furniture repair, cabinet making, door fitting, woodwork.', color: '#a16207', bookingsCount: 88 },
      { name: 'Painter', icon: '🎨', image: 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=500', startingPrice: 15, rating: 4.4, duration: 'Per Sq.Ft', description: 'Interior & exterior painting, texture, waterproofing.', color: '#8b5cf6', bookingsCount: 42 },
      { name: 'AC Repair', icon: '❄️', image: 'https://images.unsplash.com/photo-1631545806609-eef17de69bfa?w=500', startingPrice: 499, rating: 4.5, duration: 'Per Visit', description: 'AC servicing, gas refill, installation, deep cleaning.', color: '#06b6d4', bookingsCount: 150 },
      { name: 'Home Cleaning', icon: '🏠', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500', startingPrice: 1899, rating: 4.8, duration: 'Per BHK', description: 'Full home deep cleaning, kitchen, bathroom, dusting.', color: '#22c55e', bookingsCount: 220 },
      { name: 'Deep Cleaning', icon: '✨', image: 'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=500', startingPrice: 3499, rating: 4.7, duration: 'Per BHK', description: 'Move-in/move-out cleaning, sofa, carpet, window cleaning.', color: '#10b981', bookingsCount: 75 },
      { name: 'Pest Control', icon: '🐜', image: 'https://images.unsplash.com/photo-1632935190508-2e0f28e6e1f4?w=500', startingPrice: 1199, rating: 4.6, duration: 'Per BHK', description: 'Cockroach, termite, mosquito, bed bug treatment.', color: '#ef4444', bookingsCount: 30 },
      { name: 'RO Water Purifier', icon: '💧', image: 'https://images.unsplash.com/photo-1564419320461-6eb9c3073f31?w=500', startingPrice: 499, rating: 4.4, duration: 'Per Service', description: 'RO service, filter replacement, installation, AMC.', color: '#0284c7', bookingsCount: 65 },
      { name: 'Gardening', icon: '🌿', image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=500', startingPrice: 499, rating: 4.7, duration: 'Per Visit', description: 'Lawn care, plant setup, trimming, landscaping, maintenance.', color: '#16a34a', bookingsCount: 20 },
      { name: 'Beautician', icon: '💅', image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500', startingPrice: 999, rating: 4.8, duration: 'Per Session', description: 'Facial, waxing, hair styling, manicure, pedicure at home.', color: '#ec4899', bookingsCount: 42 },
      { name: 'Interior Designer', icon: '🛋️', image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=500', startingPrice: 80, rating: 4.9, duration: 'Per Sq.Ft', description: 'Space planning, modular kitchen, false ceiling, decor.', color: '#d946ef', bookingsCount: 15 }
    ];

    await ServiceCategory.insertMany(categories);
    console.log('Seeded Service Categories.');

    // 2. Seed Admin User
    const adminUser = await User.create({
      fullName: 'Gowtham S',
      email: 'gowtham.s@smartserve.ai',
      phone: '+91 98430 12345',
      role: 'Admin',
      joinedDate: '2025-01-15'
    });
    console.log('Seeded Admin User.');

    // 3. Seed Customers
    const customersRaw = [
      { fullName: 'Sandhya Rajesh', email: 'sandhya.r@gmail.com', phone: '+91 98431 87654', city: 'Coimbatore', address: 'Block A-4, RS Puram, Coimbatore - 641002', bookingsCount: 8, totalSpent: 12500, status: 'Active' },
      { fullName: 'Manoj Kumar', email: 'manoj.k@yahoo.com', phone: '+91 97860 12399', city: 'Coimbatore', address: '102 Tidel Park Road, Peelamedu, Coimbatore - 641014', bookingsCount: 12, totalSpent: 19800, status: 'Active' },
      { fullName: 'Eshwari Srinivasan', email: 'eshwari.s@outlook.com', phone: '+91 94435 99887', city: 'Coimbatore', address: '88 Gandhipuram Main Road, Coimbatore - 641012', bookingsCount: 15, totalSpent: 28400, status: 'Active' },
      { fullName: 'Ramachandran Venkat', email: 'ramachandran.v@gmail.com', phone: '+91 99420 54321', city: 'Coimbatore', address: '22 Alagesan Road, Saibaba Colony, Coimbatore - 641011', bookingsCount: 3, totalSpent: 4200, status: 'Inactive' },
      { fullName: 'Karthik Raja', email: 'karthik.raja@live.com', phone: '+91 90035 11223', city: 'Coimbatore', address: 'KGISL IT Park Campus, Saravanampatti, Coimbatore - 641035', bookingsCount: 5, totalSpent: 6799, status: 'Active' }
    ];

    for (const c of customersRaw) {
      const user = await User.create({
        fullName: c.fullName,
        email: c.email,
        phone: c.phone,
        password: hashPassword('password123'),
        role: 'Customer'
      });
      await Customer.create({
        user: user._id,
        city: c.city,
        address: c.address,
        bookingsCount: c.bookingsCount,
        totalSpent: c.totalSpent,
        status: c.status
      });
    }
    console.log('Seeded Customer Users.');

    // 4. Seed Providers
    const providersRaw = [
      {
        name: 'Rajesh Kumar', email: 'rajesh.k@smartserve.ai', phone: '+91 94432 01201',
        category: 'Electrician', experience: 8, gender: 'Male', age: 34, rating: 4.8, reviewsCount: 124, status: 'Approved',
        availability: 'Available Today', city: 'Coimbatore', completedJobs: 342, earnings: 14500,
        workingHours: { start: '08:00', end: '18:00' },
        rate: 350, pricingUnit: 'Per Hour',
        photo: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=400',
        skills: ['Wiring', 'Fan Install', 'MCB Repair', 'LED Setup'],
        about: 'Certified electrician with 8+ years of residential and commercial wiring expertise in Coimbatore.'
      },
      {
        name: 'Priya Sharma', email: 'priya.s@smartserve.ai', phone: '+91 98432 01202',
        category: 'Home Cleaning', experience: 6, gender: 'Female', age: 29, rating: 4.9, reviewsCount: 89, status: 'Approved',
        availability: 'Available Today', city: 'Coimbatore', completedJobs: 256, earnings: 38900,
        workingHours: { start: '09:00', end: '17:00' },
        rate: 1899, pricingUnit: 'Per BHK',
        photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
        skills: ['Deep Clean', 'Sanitization', 'Eco Products', 'Carpet Clean'],
        about: 'Professional home cleaner certified in eco-friendly cleaning methods.'
      },
      {
        name: 'Amit Patel', email: 'amit.p@smartserve.ai', phone: '+91 99420 01203',
        category: 'Plumber', experience: 10, gender: 'Male', age: 38, rating: 4.7, reviewsCount: 156, status: 'Pending',
        availability: 'Available Tomorrow', city: 'Coimbatore', completedJobs: 489, earnings: 0,
        workingHours: { start: '08:30', end: '19:00' },
        rate: 299, pricingUnit: 'Per Visit',
        photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
        skills: ['Pipe Fitting', 'Leak Repair', 'Drain Clear', 'Tap Install'],
        about: 'Master plumber in Coimbatore with a decade of experience.'
      },
      {
        name: 'Ramesh Chandran', email: 'ramesh.c@smartserve.ai', phone: '+91 90430 98765',
        category: 'Carpenter', experience: 12, gender: 'Male', age: 42, rating: 4.6, reviewsCount: 75, status: 'Approved',
        availability: 'Available Today', city: 'Coimbatore', completedJobs: 180, earnings: 22000,
        workingHours: { start: '09:00', end: '18:00' },
        rate: 399, pricingUnit: 'Per Hour',
        photo: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400',
        skills: ['Custom Cabinets', 'Furniture Repair', 'Modular Kitchen Fitting'],
        about: 'Highly skilled carpenter specializing in modular furniture and cabinet assembly.'
      },
      {
        name: 'Anjali Nair', email: 'anjali.n@smartserve.ai', phone: '+91 96541 23456',
        category: 'Beautician', experience: 5, gender: 'Female', age: 27, rating: 4.8, reviewsCount: 42, status: 'Pending',
        availability: 'Weekend Only', city: 'Coimbatore', completedJobs: 92, earnings: 0,
        workingHours: { start: '10:00', end: '19:00' },
        rate: 999, pricingUnit: 'Per Session',
        photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
        skills: ['Bridal Makeup', 'Home Facials', 'Manicure', 'Pedicure'],
        about: 'Professional beautician offering makeup and grooming services at home.'
      }
    ];

    for (const p of providersRaw) {
      const user = await User.create({
        fullName: p.name,
        email: p.email,
        phone: p.phone,
        profileImage: p.photo,
        password: hashPassword('password123'),
        role: 'Provider'
      });
      await Provider.create({
        user: user._id,
        category: p.category,
        experience: p.experience,
        gender: p.gender,
        age: p.age,
        about: p.about,
        bio: p.about,
        workingHours: p.workingHours,
        rate: p.rate || 350,
        hourlyRate: p.rate || 350,
        pricingUnit: p.pricingUnit || 'Per Visit',
        rating: p.rating,
        reviewsCount: p.reviewsCount,
        availability: p.availability,
        status: p.status,
        city: p.city,
        completedJobs: p.completedJobs,
        earnings: p.earnings,
        skills: p.skills,
        photo: p.photo,
        pricing: [
          { service: `${p.category} Standard Service`, price: p.rate || 350, unit: p.pricingUnit || 'Per Visit' }
        ]
      });
    }
    console.log('Seeded Provider Users.');

    // 5. Seed Bookings
    const bookings = [
      {
        bookingId: 'b1',
        customerName: 'Sandhya Rajesh', customerEmail: 'sandhya.r@gmail.com', customerPhone: '+91 98431 87654',
        providerName: 'Priya Sharma', providerEmail: 'priya.s@smartserve.ai', providerPhone: '+91 98432 01202',
        date: '2026-08-14', time: '10:00 AM', serviceType: 'Home Cleaning', serviceName: 'Full Home Deep Cleaning',
        amount: 3499, status: 'Pending', location: 'RS Puram'
      },
      {
        bookingId: 'b2',
        customerName: 'Manoj Kumar', customerEmail: 'manoj.k@yahoo.com', customerPhone: '+91 97860 12399',
        providerName: 'Priya Sharma', providerEmail: 'priya.s@smartserve.ai', providerPhone: '+91 98432 01202',
        date: '2026-08-15', time: '02:00 PM', serviceType: 'Home Cleaning', serviceName: 'Express Kitchen Cleaning',
        amount: 1499, status: 'Active', location: 'Peelamedu'
      },
      {
        bookingId: 'b3',
        customerName: 'Eshwari Srinivasan', customerEmail: 'eshwari.s@outlook.com', customerPhone: '+91 94435 99887',
        providerName: 'Priya Sharma', providerEmail: 'priya.s@smartserve.ai', providerPhone: '+91 98432 01202',
        date: '2026-07-29', time: '11:00 AM', serviceType: 'Home Cleaning', serviceName: 'Sofa & Upholstery Shampooing',
        amount: 999, status: 'Completed', location: 'Gandhipuram'
      },
      {
        bookingId: 'b4',
        customerName: 'Sandhya Rajesh', customerEmail: 'sandhya.r@gmail.com', customerPhone: '+91 98431 87654',
        providerName: 'Rajesh Kumar', providerEmail: 'rajesh.k@smartserve.ai', providerPhone: '+91 94432 01201',
        date: '2026-07-28', time: '04:00 PM', serviceType: 'Electrician', serviceName: 'AC Repair & Servicing',
        amount: 899, status: 'Completed', location: 'RS Puram'
      }
    ];
    await Booking.insertMany(bookings);
    console.log('Seeded Bookings.');

    // 6. Seed Complaints
    const complaints = [
      {
        complaintId: 'cmp-1',
        customerName: 'Sandhya Rajesh', customerEmail: 'sandhya.r@gmail.com',
        providerName: 'Rajesh Kumar', providerEmail: 'rajesh.k@smartserve.ai',
        comment: 'The electrician arrived 45 minutes late and did not clean up the packaging materials afterward.',
        status: 'Pending', priority: 'Medium', date: '2026-08-11',
        resolutionTimeline: 'Resolution within 24 hours expected.'
      },
      {
        complaintId: 'cmp-2',
        customerName: 'Manoj Kumar', customerEmail: 'manoj.k@yahoo.com',
        providerName: 'Priya Sharma', providerEmail: 'priya.s@smartserve.ai',
        comment: 'The kitchen sink area is still sticky post deep cleaning. Need a re-visit.',
        status: 'Investigating', priority: 'High', date: '2026-08-10',
        resolutionTimeline: 'Provider contact initiated. Response expected within 12 hours.'
      },
      {
        complaintId: 'cmp-3',
        customerName: 'Eshwari Srinivasan', customerEmail: 'eshwari.s@outlook.com',
        providerName: 'Ramesh Chandran', providerEmail: 'ramesh.c@smartserve.ai',
        comment: 'Scratch on the wooden cabinet after the drawer fitting.',
        status: 'Resolved', priority: 'Low', date: '2026-07-15',
        resolutionTimeline: 'Resolved on 2026-07-17. Refund of ₹500 issued.'
      }
    ];
    await Complaint.insertMany(complaints);
    console.log('Seeded Complaints.');

    // 7. Seed Notifications
    const notifications = [
      { title: 'New Provider Registration', message: 'Amit Patel registered as a Plumber in Gandhipuram, Coimbatore.', time: '5 minutes ago', type: 'registration', read: false },
      { title: 'Customer Complaint Filed', message: 'Sandhya Rajesh filed a complaint regarding Rajesh Kumar (Electrician).', time: '2 hours ago', type: 'complaint', read: false },
      { title: 'High-Value Booking Alert', message: 'Karthik Raja booked Full Home Deep Cleaning for ₹3,499.', time: '1 day ago', type: 'booking', read: true },
      { title: 'System Performance Report', message: 'Weekly report generated successfully. Total platform revenue is up 12%.', time: '2 days ago', type: 'system', read: true }
    ];
    await Notification.insertMany(notifications);
    console.log('Seeded Notifications.');

    // 8. Seed Reviews & Earnings
    const allSeededProviders = await Provider.find({}).populate('user');
    const providerMap = {};
    for (const p of allSeededProviders) {
      providerMap[p.user.fullName] = p._id.toString();
    }

    const reviews = [
      {
        bookingId: 'b4',
        providerId: providerMap['Rajesh Kumar'] || 'p1',
        customerName: 'Sandhya Rajesh',
        customerImage: 'https://images.unsplash.com/photo-1594744803329-e58b31de215f?w=100',
        rating: 5,
        comment: 'Rajesh fixed our entire home wiring in one visit. Super professional and clean work!',
        serviceTaken: 'AC Repair & Servicing',
        date: '2026-07-28',
        reply: 'Thank you Sandhya! Glad to help.'
      },
      {
        bookingId: 'b3',
        providerId: providerMap['Priya Sharma'] || 'p2',
        customerName: 'Eshwari Srinivasan',
        customerImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100',
        rating: 5,
        comment: 'Priya did an incredible deep clean. My apartment looks brand new!',
        serviceTaken: 'Sofa & Upholstery Shampooing',
        date: '2026-07-29',
        reply: 'Thank you Eshwari! Glad you liked the clean.'
      }
    ];
    await Review.insertMany(reviews);
    console.log('Seeded Reviews.');

    // Seed Earnings
    const earningsData = [
      {
        providerEmail: 'priya.s@smartserve.ai',
        today: 0,
        weekly: 4998,
        monthly: 38900,
        total: 125000,
        completedJobsCount: 256
      },
      {
        providerEmail: 'rajesh.k@smartserve.ai',
        today: 0,
        weekly: 899,
        monthly: 14500,
        total: 85000,
        completedJobsCount: 342
      }
    ];
    await Earning.insertMany(earningsData);
    console.log('Seeded Earnings.');

    console.log('Database Seeding Completed Successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
