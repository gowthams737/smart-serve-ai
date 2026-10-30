import express from 'express';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Provider from '../models/Provider.js';
import Booking from '../models/Booking.js';
import ServiceCategory from '../models/ServiceCategory.js';
import Complaint from '../models/Complaint.js';
import Notification from '../models/Notification.js';
import Review from '../models/Review.js';
import Setting from '../models/Setting.js';
import Service from '../models/Service.js';
import Earning from '../models/Earning.js';
import { formatDateDDMMYYYY } from '../utils/dateFormat.js';

const router = express.Router();

// 1. Dashboard Overview Stats
router.get('/dashboard/stats', async (req, res, next) => {
  try {
    const customersCount = await Customer.countDocuments();
    const providersCount = await Provider.countDocuments();
    const servicesCount = await ServiceCategory.countDocuments();
    const bookings = await Booking.find({});

    const totalBookings = bookings.length;
    const activeBookings = bookings.filter(b => b.status === 'Active').length;
    const completedBookings = bookings.filter(b => b.status === 'Completed').length;
    const pendingBookings = bookings.filter(b => b.status === 'Pending').length;
    const revenue = bookings
      .filter(b => b.status === 'Completed')
      .reduce((sum, b) => sum + b.amount, 0);

    res.status(200).json({
      success: true,
      stats: {
        customers: customersCount,
        providers: providersCount,
        services: servicesCount,
        bookings: totalBookings,
        activeBookings,
        completedBookings,
        pendingBookings,
        revenue
      }
    });
  } catch (error) {
    next(error);
  }
});

// 2. Customers List
router.get('/customers', async (req, res, next) => {
  try {
    const list = await Customer.find({}).populate('user');
    const valid = list.filter(c => c.user);
    const formatted = valid.map(c => ({
      id: c._id,
      userId: c.user?._id,
      fullName: c.name || c.user?.fullName || 'Unknown',
      email: c.email || c.user?.email || '',
      phone: c.phone || c.user?.phone || '',
      city: c.city,
      address: c.address,
      status: c.status,
      bookingsCount: c.bookingsCount,
      totalSpent: c.totalSpent,
      joinedDate: c.user?.joinedDate || ''
    }));
    res.status(200).json({ success: true, customers: formatted });
  } catch (error) {
    next(error);
  }
});

// Update Customer Profile/Status
router.post('/customers/update/:id', async (req, res, next) => {
  try {
    const { fullName, email, phone, city, status } = req.body;
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (city !== undefined && city && typeof city === 'string' && city.trim()) {
      const normCity = city.trim().toLowerCase();
      if (normCity !== 'coimbatore' && !normCity.includes('coimbatore')) {
        return res.status(400).json({
          success: false,
          message: 'Customer locations are supported only in Coimbatore, Tamil Nadu, India.'
        });
      }
    }
    customer.city = 'Coimbatore';
    customer.status = status !== undefined ? status : customer.status;
    await customer.save();

    if (customer.user) {
      const user = await User.findById(customer.user);
      if (user) {
        user.fullName = fullName || user.fullName;
        user.email = email || user.email;
        user.phone = phone || user.phone;
        await user.save();
      }
    }

    res.status(200).json({ success: true, customer });
  } catch (error) {
    next(error);
  }
});

// Delete Customer
router.delete('/customers/delete/:id', async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (customer.user) {
      await User.findByIdAndDelete(customer.user);
    }
    const customerEmail = customer.email;
    if (customerEmail) {
      await Notification.deleteMany({ recipientEmail: customerEmail.toLowerCase() });
    }
    await Customer.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// 3. Providers List
router.get('/providers', async (req, res, next) => {
  try {
    const list = await Provider.find({}).populate('user');
    const valid = list.filter(p => p.user);
    const formatted = valid.map(p => ({
      id: p._id,
      userId: p.user?._id,
      name: p.name || p.user?.fullName || 'Unknown',
      email: p.email || p.user?.email || '',
      phone: p.phone || p.user?.phone || '',
      category: p.category,
      experience: p.experience,
      gender: p.gender || 'Not specified',
      age: p.age || null,
      rating: p.rating,
      reviewsCount: p.reviewsCount,
      availability: p.availability,
      status: p.status,
      city: p.city,
      about: p.about || p.bio || '',
      bio: p.bio || p.about || '',
      workingHours: p.workingHours,
      photo: p.photo || p.user?.profileImage,
      completedJobs: p.completedJobs,
      earnings: p.earnings
    }));
    res.status(200).json({ success: true, providers: formatted });
  } catch (error) {
    next(error);
  }
});

// Approve/Reject Provider status
router.post('/providers/status', async (req, res, next) => {
  try {
    const { id, status } = req.body;
    const provider = await Provider.findById(id).populate('user');
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    provider.status = status;
    await provider.save();

    await Notification.create({
      title: `Provider Account ${status}`,
      message: `${provider.name || provider.user?.fullName}'s profile verification was ${status.toLowerCase()}.`,
      type: 'registration',
      recipientRole: 'Admin'
    });

    res.status(200).json({ success: true, provider });
  } catch (error) {
    next(error);
  }
});

// Delete Provider
router.delete('/providers/delete/:id', async (req, res, next) => {
  try {
    const provider = await Provider.findById(req.params.id);
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    if (provider.user) {
      await User.findByIdAndDelete(provider.user);
    }
    await Service.deleteMany({ providerId: provider._id });
    const provEmail = provider.email;
    if (provEmail) {
      await Service.deleteMany({ providerEmail: provEmail.toLowerCase() });
      await Earning.deleteMany({ providerEmail: provEmail.toLowerCase() });
      await Notification.deleteMany({ recipientEmail: provEmail.toLowerCase() });
    }
    await Provider.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Provider profile deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// 4. Services List & Admin Config
router.get('/services', async (req, res, next) => {
  try {
    const list = await ServiceCategory.find({});
    res.status(200).json({ success: true, services: list });
  } catch (error) {
    next(error);
  }
});

// Add Service Category
router.post('/services/add', async (req, res, next) => {
  try {
    const { name, startingPrice, duration, description, status } = req.body;
    const exists = await ServiceCategory.findOne({ name });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Service category already exists' });
    }

    const service = await ServiceCategory.create({
      name,
      startingPrice: Number(startingPrice),
      duration,
      description,
      status: status || 'Active'
    });
    res.status(201).json({ success: true, service });
  } catch (error) {
    next(error);
  }
});

// Update Service Category
router.post('/services/update/:id', async (req, res, next) => {
  try {
    const { name, startingPrice, duration, description, status } = req.body;
    const service = await ServiceCategory.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service category not found' });
    }

    service.name = name || service.name;
    service.startingPrice = startingPrice !== undefined ? Number(startingPrice) : service.startingPrice;
    service.duration = duration || service.duration;
    service.description = description !== undefined ? description : service.description;
    service.status = status || service.status;

    await service.save();
    res.status(200).json({ success: true, service });
  } catch (error) {
    next(error);
  }
});

// Delete Service Category
router.delete('/services/delete/:id', async (req, res, next) => {
  try {
    await ServiceCategory.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Service category deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// 5. Bookings
router.get('/bookings', async (req, res, next) => {
  try {
    const list = await Booking.find({}).sort({ createdAt: -1 });
    const formatted = list.map(b => {
      const bObj = b.toObject();
      bObj.date = formatDateDDMMYYYY(b.date) || b.date;
      return bObj;
    });
    res.status(200).json({ success: true, bookings: formatted });
  } catch (error) {
    next(error);
  }
});

// Update Booking Status
router.post('/bookings/status', async (req, res, next) => {
  try {
    const { id, status } = req.body;
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    booking.status = status;
    await booking.save();
    res.status(200).json({ success: true, booking });
  } catch (error) {
    next(error);
  }
});

// 6. Complaints
router.get('/complaints', async (req, res, next) => {
  try {
    const list = await Complaint.find({}).sort({ createdAt: -1 });
    res.status(200).json({ success: true, complaints: list });
  } catch (error) {
    next(error);
  }
});

router.post('/complaints/status', async (req, res, next) => {
  try {
    const { id, status } = req.body;
    const complaint = await Complaint.findById(id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }
    complaint.status = status;
    await complaint.save();
    res.status(200).json({ success: true, complaint });
  } catch (error) {
    next(error);
  }
});

// 7. Notifications
router.get('/notifications', async (req, res, next) => {
  try {
    const list = await Notification.find({ recipientRole: 'Admin' }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, notifications: list });
  } catch (error) {
    next(error);
  }
});

router.post('/notifications/mark-read', async (req, res, next) => {
  try {
    await Notification.updateMany({ recipientRole: 'Admin' }, { read: true });
    const list = await Notification.find({ recipientRole: 'Admin' }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, notifications: list });
  } catch (error) {
    next(error);
  }
});

// GET all reviews
router.get('/reviews', async (req, res, next) => {
  try {
    const list = await Review.find({}).sort({ createdAt: -1 });
    res.status(200).json({ success: true, reviews: list });
  } catch (error) {
    next(error);
  }
});

// DELETE a review
router.delete('/reviews/delete/:id', async (req, res, next) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Platform Settings
router.get('/settings', async (req, res, next) => {
  try {
    let setting = await Setting.findOne();
    if (!setting) {
      setting = await Setting.create({});
    }
    res.status(200).json({ success: true, settings: setting });
  } catch (error) {
    next(error);
  }
});

router.post('/settings', async (req, res, next) => {
  try {
    const { general, notifications, appearance, serviceConfiguration, permissions } = req.body;
    let setting = await Setting.findOne();
    if (!setting) {
      setting = new Setting();
    }
    if (general) setting.general = { ...setting.general, ...general };
    if (notifications) setting.notifications = { ...setting.notifications, ...notifications };
    if (appearance) setting.appearance = { ...setting.appearance, ...appearance };
    if (serviceConfiguration) setting.serviceConfiguration = { ...setting.serviceConfiguration, ...serviceConfiguration };
    if (permissions) setting.permissions = permissions;

    await setting.save();
    res.status(200).json({ success: true, settings: setting, message: 'Settings saved successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
