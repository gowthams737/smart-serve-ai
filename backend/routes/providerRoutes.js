import express from 'express';
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Provider from '../models/Provider.js';
import Service from '../models/Service.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Review from '../models/Review.js';
import Earning from '../models/Earning.js';
import Customer from '../models/Customer.js';
import { hashPassword, verifyPassword, isSha256, isBcrypt, processPasswordChange } from './authRoutes.js';
import { formatWorkingHours } from '../utils/timeFormat.js';
import { formatDateDDMMYYYY, compareDatesDDMMYYYY, formatRelativeTime } from '../utils/dateFormat.js';
import { registerSSEClient, broadcastNotification } from '../utils/notificationBroadcaster.js';
import { saveImageIfBase64, normalizeImageUrl } from '../utils/imageHandler.js';

const router = express.Router();

const calculateProviderStats = async (user, provider) => {
  const providerEmail = user.email.toLowerCase();
  const providerIdStr = provider._id.toString();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));

  // 1. Total Services: Count distinct active registered services
  const activeServices = await Service.find({ providerId: provider._id, isAvailable: true }).lean();
  const distinctNames = new Set(activeServices.map(s => (s.name || '').trim().toLowerCase()));
  const totalServices = distinctNames.size;
  const currentServicesAdded = await Service.countDocuments({
    providerId: provider._id,
    isAvailable: true,
    createdAt: { $gte: thirtyDaysAgo }
  });
  const prevServicesAdded = await Service.countDocuments({
    providerId: provider._id,
    isAvailable: true,
    createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
  });
  let servicesTrend = { hasHistoricalData: false, message: 'Not enough historical data' };
  if (prevServicesAdded > 0) {
    const pct = Math.round(((currentServicesAdded - prevServicesAdded) / prevServicesAdded) * 100);
    servicesTrend = {
      hasHistoricalData: true,
      percentage: pct,
      direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral',
      label: 'Compared with previous 30 days'
    };
  }

  // 2. Bookings - Combined across all services: Total, Ongoing, Completed, Pending
  const provEmailNorm = providerEmail.toLowerCase().trim();
  const providerFilter = {
    $or: [
      { providerEmail: provEmailNorm },
      ...(provider._id ? [{ providerId: provider._id }] : [])
    ]
  };

  const [totalBookingsCount, ongoingBookingsCount, completedBookingsCount, pendingBookingsCount] = await Promise.all([
    Booking.countDocuments(providerFilter),
    Booking.countDocuments({ ...providerFilter, status: { $in: ['Active', 'In Progress', 'Confirmed'] } }),
    Booking.countDocuments({ ...providerFilter, status: 'Completed' }),
    Booking.countDocuments({ ...providerFilter, status: 'Pending' })
  ]);

  // Bookings growth comparison
  const currentBookings = await Booking.countDocuments({
    ...providerFilter,
    createdAt: { $gte: thirtyDaysAgo }
  });
  const prevBookings = await Booking.countDocuments({
    ...providerFilter,
    createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
  });
  let bookingsTrend = { hasHistoricalData: false, message: 'Not enough historical data' };
  if (prevBookings > 0) {
    const pct = Math.round(((currentBookings - prevBookings) / prevBookings) * 100);
    bookingsTrend = {
      hasHistoricalData: true,
      percentage: pct,
      direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral',
      label: 'Compared with previous 30 days'
    };
  }

  // Completed jobs comparison
  const currentCompleted = await Booking.countDocuments({
    ...providerFilter,
    status: 'Completed',
    updatedAt: { $gte: thirtyDaysAgo }
  });
  const prevCompleted = await Booking.countDocuments({
    ...providerFilter,
    status: 'Completed',
    updatedAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
  });
  let completedTrend = { hasHistoricalData: false, message: 'Not enough historical data' };
  if (prevCompleted > 0) {
    const pct = Math.round(((currentCompleted - prevCompleted) / prevCompleted) * 100);
    completedTrend = {
      hasHistoricalData: true,
      percentage: pct,
      direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral',
      label: 'Compared with previous 30 days'
    };
  }

  // 3. Reviews & Ratings
  const provUserIdStr = provider.user ? (provider.user._id ? provider.user._id.toString() : provider.user.toString()) : '';
  const reviews = await Review.find({
    $or: [
      { providerId: providerIdStr },
      ...(provUserIdStr ? [{ providerId: provUserIdStr }] : [])
    ]
  }).sort({ createdAt: -1 });
  const reviewsCount = reviews.length;
  let averageRating = null;
  if (reviewsCount > 0) {
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    averageRating = Number((sum / reviewsCount).toFixed(1));
  } else if (provider.rating && provider.rating > 0) {
    averageRating = provider.rating;
  }

  const currentReviews = reviews.filter(r => new Date(r.createdAt || r.date) >= thirtyDaysAgo);
  const prevReviews = reviews.filter(r => new Date(r.createdAt || r.date) >= sixtyDaysAgo && new Date(r.createdAt || r.date) < thirtyDaysAgo);
  let ratingTrend = { hasHistoricalData: false, message: 'Not enough historical data' };
  if (currentReviews.length > 0 && prevReviews.length > 0) {
    const curAvg = currentReviews.reduce((sum, r) => sum + r.rating, 0) / currentReviews.length;
    const pAvg = prevReviews.reduce((sum, r) => sum + r.rating, 0) / prevReviews.length;
    const pct = Math.round(((curAvg - pAvg) / pAvg) * 100);
    ratingTrend = {
      hasHistoricalData: true,
      percentage: pct,
      direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral',
      label: 'Compared with previous 30 days'
    };
  }

  // 4. Genuine Profile Completion Calculation
  const profileFields = [
    user.fullName,
    user.email,
    user.phone,
    provider.photo || user.profileImage,
    provider.category,
    provider.experience,
    provider.bio || provider.about,
    provider.workingHours?.start,
    provider.rate,
    provider.city
  ];
  const filledFields = profileFields.filter(f => f !== undefined && f !== null && f !== '').length;
  const profileCompletion = Math.round((filledFields / profileFields.length) * 100);

  const effectiveCompletedJobs = completedBookingsCount;

  return {
    profileCompletion,
    completedJobs: effectiveCompletedJobs,
    reviewsCount: reviewsCount > 0 ? reviewsCount : (provider.reviewsCount || 0),
    rating: averageRating !== null ? averageRating : (provider.rating || 5.0),
    stats: {
      totalBookings: {
        value: totalBookingsCount,
        trend: bookingsTrend
      },
      ongoingBookings: {
        value: ongoingBookingsCount,
        trend: bookingsTrend
      },
      completedBookings: {
        value: completedBookingsCount,
        trend: completedTrend
      },
      // Backward-compatible keys
      activeBookings: {
        value: ongoingBookingsCount,
        trend: bookingsTrend
      },
      completedJobs: {
        value: completedBookingsCount,
        trend: completedTrend
      },
      totalServices: {
        value: totalServices,
        trend: servicesTrend
      },
      averageRating: {
        value: averageRating !== null ? averageRating : (provider.rating || 5.0),
        reviewsCount: reviewsCount > 0 ? reviewsCount : (provider.reviewsCount || 0),
        hasReviews: reviewsCount > 0,
        trend: ratingTrend
      }
    }
  };
};

const mapProviderProfile = (user, provider, dynamicStats = {}) => {
  const photo = normalizeImageUrl(provider.photo || user?.profileImage || '');
  const name = user?.fullName || provider.name || 'Provider';
  const email = user?.email || provider.email || '';
  const phone = user?.phone || provider.phone || '';
  return {
    id: provider._id,
    name: name,
    fullName: name,
    email: email,
    phone: phone,
    category: provider.category,
    experience: provider.experience,
    gender: provider.gender || 'Male',
    age: provider.age || 25,
    bio: provider.bio || provider.about || '',
    about: provider.about || provider.bio || '',
    rating: dynamicStats.rating !== undefined ? dynamicStats.rating : (provider.rating || 5.0),
    reviewsCount: dynamicStats.reviewsCount !== undefined ? dynamicStats.reviewsCount : (provider.reviewsCount || 0),
    availability: provider.availability,
    city: provider.city,
    state: provider.state,
    pincode: provider.pincode,
    address: provider.address,
    languages: provider.languages,
    completedJobs: dynamicStats.completedJobs !== undefined ? dynamicStats.completedJobs : (provider.completedJobs || 0),
    earnings: provider.earnings,
    workingHours: provider.workingHours,
    workingHoursFormatted: formatWorkingHours(provider.workingHours),
    rate: provider.rate || provider.pricing?.[0]?.price || 0,
    hourlyRate: provider.hourlyRate || provider.rate || 0,
    pricingUnit: provider.pricingUnit || provider.pricing?.[0]?.unit || 'Per Visit',
    workingDays: provider.workingDays,
    holidays: (provider.holidays || []).map(h => formatDateDDMMYYYY(h) || h),
    blockedDates: (provider.blockedDates && provider.blockedDates.length > 0 ? provider.blockedDates : (provider.holidays || [])).map(h => formatDateDDMMYYYY(h) || h),
    isOnline: provider.isOnline !== undefined ? provider.isOnline : true,
    photo: photo,
    profilePhoto: photo,
    coverImage: provider.coverImage,
    skills: provider.skills && Array.isArray(provider.skills) ? provider.skills.join(', ') : (provider.skills || ''),
    pricing: provider.pricing,
    status: provider.status,
    profileCompletion: dynamicStats.profileCompletion !== undefined ? dynamicStats.profileCompletion : 100
  };
};

// Get Provider details/stats by Email
router.get('/profile/:email', async (req, res, next) => {
  try {
    const authHeaderEmail = req.headers['x-authenticated-email'] || req.headers['x-auth-email'];
    if (authHeaderEmail && authHeaderEmail.toLowerCase().trim() !== req.params.email.toLowerCase().trim()) {
      return res.status(403).json({ success: false, message: 'Forbidden: Access to another provider\'s private profile is not permitted.' });
    }

    const user = await User.findOne({ email: req.params.email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Provider user not found' });
    }

    let provider = await Provider.findOne({ user: user._id });
    if (!provider) {
      provider = await Provider.findOne({ email: req.params.email.toLowerCase() });
    }
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider details not found. Please complete provider registration.' });
    }

    const dynamicStats = await calculateProviderStats(user, provider);
    const profile = mapProviderProfile(user, provider, dynamicStats);

    res.status(200).json({
      success: true,
      profile,
      provider: profile,
      stats: dynamicStats.stats
    });
  } catch (error) {
    next(error);
  }
});

// Get Dashboard Statistics for Provider
router.get('/stats/:email', async (req, res, next) => {
  try {
    const { error, user, provider } = await getProviderByEmail(req.params.email);
    if (error) return res.status(404).json({ success: false, message: error });

    const dynamicStats = await calculateProviderStats(user, provider);
    res.status(200).json({
      success: true,
      stats: dynamicStats.stats
    });
  } catch (error) {
    next(error);
  }
});

// Update Provider Profile Settings/Availability
router.post('/profile/update', async (req, res, next) => {
  try {
    const {
      email,
      fullName,
      phone,
      category,
      experience,
      gender,
      age,
      about,
      bio,
      skills,
      serviceRate,
      rate,
      pricingUnit,
      pricing,
      availability,
      workingHours,
      workingDays,
      holidays,
      blockedDates,
      isOnline,
      address,
      city,
      state,
      pincode,
      languages,
      profilePhoto,
      photo,
      coverImage
    } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    let provider = await Provider.findOne({ user: user._id });
    if (!provider) {
      provider = await Provider.findOne({ email: req.params.email.toLowerCase() });
    }
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider details not found. Please complete provider registration.' });
    }

    // Update User model fields
    if (fullName !== undefined) user.fullName = fullName;
    if (phone !== undefined) user.phone = phone;
    const uploadedPhoto = profilePhoto !== undefined ? profilePhoto : photo;
    if (uploadedPhoto !== undefined) {
      const savedPhotoUrl = saveImageIfBase64(uploadedPhoto);
      const previousPhoto = provider.photo;
      user.profileImage = savedPhotoUrl;
      provider.photo = savedPhotoUrl;
      // Preserve unrelated custom service images: update only services using previous photo or empty image
      if (previousPhoto) {
        await Service.updateMany(
          { providerId: provider._id, $or: [{ image: previousPhoto }, { image: '' }, { image: { $exists: false } }] },
          { $set: { image: savedPhotoUrl } }
        );
      } else {
        await Service.updateMany(
          { providerId: provider._id, $or: [{ image: '' }, { image: { $exists: false } }, { name: `${provider.category} Standard Service` }] },
          { $set: { image: savedPhotoUrl } }
        );
      }
    }
    await user.save();

    // Update Provider model fields
    provider.name = user.fullName;
    provider.email = user.email;
    provider.phone = user.phone;
    if (category !== undefined) provider.category = category;
    if (experience !== undefined) provider.experience = Number(experience);
    if (gender !== undefined) provider.gender = gender;
    if (age !== undefined) provider.age = Number(age);
    if (bio !== undefined) {
      provider.bio = bio;
      provider.about = bio;
    } else if (about !== undefined) {
      provider.about = about;
      provider.bio = about;
    }
    
    if (skills !== undefined) {
      if (typeof skills === 'string') {
        provider.skills = skills.split(',').map(s => s.trim()).filter(Boolean);
      } else if (Array.isArray(skills)) {
        provider.skills = skills;
      }
    }

    const rawRate = serviceRate !== undefined ? serviceRate : rate;
    if (rawRate !== undefined && rawRate !== null && rawRate !== '') {
      const numRate = Number(rawRate);
      if (!isNaN(numRate) && numRate > 0) {
        provider.rate = numRate;
        provider.hourlyRate = numRate;
      }
    }
    if (pricingUnit !== undefined && typeof pricingUnit === 'string' && pricingUnit.trim()) {
      provider.pricingUnit = pricingUnit.trim();
    }

    provider.pricing = pricing !== undefined ? pricing : provider.pricing;
    // If rate was updated, also update any default/first service in pricing and Service model
    if (provider.rate > 0) {
      if (Array.isArray(provider.pricing) && provider.pricing.length > 0) {
        provider.pricing[0].price = provider.rate;
        if (provider.pricingUnit) provider.pricing[0].unit = provider.pricingUnit;
      }
      const firstService = await Service.findOne({ providerId: provider._id }).sort({ createdAt: 1 });
      if (firstService) {
        firstService.price = provider.rate;
        if (provider.pricingUnit) firstService.pricingUnit = provider.pricingUnit;
        await firstService.save();
      }
    }
    provider.availability = availability !== undefined ? availability : provider.availability;
    if (workingHours !== undefined) {
      let start = '';
      let end = '';
      if (typeof workingHours === 'object' && workingHours?.start && workingHours?.end) {
        start = String(workingHours.start).trim();
        end = String(workingHours.end).trim();
      } else if (typeof workingHours === 'string' && workingHours.includes('-')) {
        const parts = workingHours.split('-').map(s => s.trim());
        start = parts[0] || '';
        end = parts[1] || '';
      }

      if (start && end) {
        const parseMinutes = (timeStr) => {
          if (!timeStr || typeof timeStr !== 'string') return -1;
          const parts = timeStr.trim().split(':');
          if (parts.length < 2) return -1;
          const h = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          if (isNaN(h) || isNaN(m)) return -1;
          return h * 60 + m;
        };

        const startMinutes = parseMinutes(start);
        const endMinutes = parseMinutes(end);

        if (startMinutes < 0 || endMinutes < 0 || startMinutes >= endMinutes) {
          return res.status(400).json({
            success: false,
            message: 'Invalid working hours: Start time must be earlier than end time.'
          });
        }

        provider.workingHours = { start, end };
        provider.markModified('workingHours');
      }
    }
    if (workingDays !== undefined) {
      if (!Array.isArray(workingDays) || workingDays.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one working day must be selected.'
        });
      }
      provider.workingDays = workingDays;
      provider.markModified('workingDays');
    }
    const incomingHolidays = holidays !== undefined ? holidays : blockedDates;
    if (incomingHolidays !== undefined) {
      const rawList = Array.isArray(incomingHolidays) ? incomingHolidays : [incomingHolidays];
      const normalized = rawList
        .map(h => formatDateDDMMYYYY(h) || (typeof h === 'string' ? h.trim() : ''))
        .filter(Boolean);
      const uniqueDates = [...new Set(normalized)];
      uniqueDates.sort(compareDatesDDMMYYYY);
      provider.holidays = uniqueDates;
      provider.blockedDates = uniqueDates;
    }
    if (isOnline !== undefined) {
      provider.isOnline = Boolean(isOnline);
    }
    if (city !== undefined && city && typeof city === 'string' && city.trim()) {
      const normCity = city.trim().toLowerCase();
      if (normCity !== 'coimbatore' && !normCity.includes('coimbatore')) {
        return res.status(400).json({
          success: false,
          message: 'Provider service location must be Coimbatore, Tamil Nadu, India only.'
        });
      }
    }
    provider.address = address !== undefined ? address : provider.address;
    provider.city = 'Coimbatore';
    provider.state = 'Tamil Nadu';
    provider.pincode = pincode !== undefined ? pincode : provider.pincode;
    provider.languages = languages !== undefined ? languages : provider.languages;
    if (coverImage !== undefined) provider.coverImage = coverImage;

    await provider.save();
    
    const dynamicStats = await calculateProviderStats(user, provider);
    const profile = mapProviderProfile(user, provider, dynamicStats);
    res.status(200).json({
      success: true,
      message: 'Provider profile updated successfully',
      provider: profile,
      profile,
      stats: dynamicStats.stats
    });
  } catch (error) {
    next(error);
  }
});

// Get Bookings by Provider Email
router.get('/bookings/:email', async (req, res, next) => {
  try {
    const list = await Booking.find({ providerEmail: req.params.email.toLowerCase() }).sort({ createdAt: -1 });
    const formatted = list.map(b => {
      const bObj = b.toObject();
      bObj.date = formatDateDDMMYYYY(b.date) || b.date;
      bObj.address = bObj.customerAddress || bObj.location || bObj.address || 'Address not provided';
      bObj.customerAddress = bObj.address;
      bObj.customerPhone = bObj.customerPhone || 'Phone number not provided';
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
    const { id, status, providerEmail } = req.body;
    const cleanId = (typeof id === 'string') ? id.trim() : id;
    const cleanNoHash = (typeof cleanId === 'string' && cleanId.startsWith('#')) ? cleanId.slice(1) : cleanId;

    const query = {
      $or: [
        ...(mongoose.Types.ObjectId.isValid(cleanId) ? [{ _id: cleanId }] : []),
        { bookingId: cleanId },
        { bookingId: `#${cleanNoHash}` },
        { bookingId: cleanNoHash }
      ]
    };
    if (providerEmail && typeof providerEmail === 'string' && providerEmail.trim()) {
      query.providerEmail = providerEmail.toLowerCase().trim();
    }

    let booking = await Booking.findOne(query);
    if (!booking) {
      booking = await Booking.findOne({
        $or: [
          ...(mongoose.Types.ObjectId.isValid(cleanId) ? [{ _id: cleanId }] : []),
          { bookingId: cleanId },
          { bookingId: `#${cleanNoHash}` },
          { bookingId: cleanNoHash }
        ]
      });
    }

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (providerEmail && booking.providerEmail.toLowerCase() !== providerEmail.toLowerCase().trim()) {
      return res.status(403).json({ success: false, message: 'You are not authorized to update this booking' });
    }

    booking.status = status;
    await booking.save();

    // If completed, update provider earnings & completed jobs
    if (status === 'Completed') {
      const user = await User.findOne({ email: booking.providerEmail.toLowerCase() });
      if (user) {
        const provider = await Provider.findOne({ user: user._id });
        if (provider) {
          const actualCompleted = await Booking.countDocuments({
            providerEmail: booking.providerEmail.toLowerCase(),
            status: 'Completed'
          });
          provider.completedJobs = actualCompleted;
          provider.earnings += booking.amount;
          await provider.save();
        }
      }
    }

    // Add genuine real-time notification
    const formattedBookingId = (booking.bookingId || '').startsWith('#') ? booking.bookingId : `#${booking.bookingId}`;
    let custTitle = 'Booking Status Updated';
    let custMessage = `Booking ${formattedBookingId} has been marked as ${status}.`;
    let custType = 'booking';
    let custTargetRoute = `/customer/bookings-and-saved?tab=bookings&id=${booking._id.toString()}`;

    if (status === 'Active' || status === 'Confirmed') {
      custTitle = 'Booking Request Accepted';
      custMessage = `${booking.providerName || 'Your service provider'} has accepted your booking ${formattedBookingId} for ${booking.serviceName || booking.serviceType}.`;
      custType = 'booking_confirmed';
    } else if (status === 'Rejected') {
      custTitle = 'Booking Request Declined';
      custMessage = `Your booking request ${formattedBookingId} for ${booking.serviceName || booking.serviceType} could not be accepted by ${booking.providerName || 'the provider'}.`;
      custType = 'provider_cancelled';
    } else if (status === 'In Progress') {
      custTitle = 'Service In Progress';
      custMessage = `${booking.providerName || 'Your provider'} has started working on booking ${formattedBookingId}.`;
      custType = 'booking';
    } else if (status === 'Completed') {
      custTitle = 'Service Completed';
      custMessage = `Your service for booking ${formattedBookingId} (${booking.serviceName || booking.serviceType}) is completed! Click to rate your experience.`;
      custType = 'service_completed';
      custTargetRoute = `/customer/bookings-and-saved?tab=bookings&rate=true&id=${booking._id.toString()}`;
    } else if (status === 'Cancelled') {
      custTitle = 'Booking Cancelled';
      custMessage = `Booking ${formattedBookingId} for ${booking.serviceName || booking.serviceType} has been cancelled.`;
      custType = 'provider_cancelled';
    }

    const custNotifKey = `cust_status_${booking._id.toString()}_${status}`;
    const custNotif = await Notification.findOneAndUpdate(
      { dedupKey: custNotifKey },
      {
        $setOnInsert: {
          title: custTitle,
          message: custMessage,
          type: custType,
          recipientRole: 'Customer',
          recipientEmail: booking.customerEmail.toLowerCase().trim(),
          bookingId: booking._id.toString(),
          targetRoute: custTargetRoute,
          dedupKey: custNotifKey,
          read: false
        }
      },
      { upsert: true, new: true }
    );
    broadcastNotification(custNotif);

    // If cancelled, ensure provider is also notified
    if (status === 'Cancelled') {
      const provNotifKey = `prov_status_${booking._id.toString()}_${status}`;
      const provNotif = await Notification.findOneAndUpdate(
        { dedupKey: provNotifKey },
        {
          $setOnInsert: {
            title: 'Booking Cancelled',
            message: `Booking ${formattedBookingId} (${booking.serviceName || booking.serviceType}) for ${booking.customerName} has been cancelled.`,
            type: 'provider_cancelled',
            recipientRole: 'Provider',
            recipientEmail: booking.providerEmail.toLowerCase().trim(),
            bookingId: booking._id.toString(),
            targetRoute: `/provider/bookings?id=${booking._id.toString()}`,
            dedupKey: provNotifKey,
            read: false
          }
        },
        { upsert: true, new: true }
      );
      broadcastNotification(provNotif);
    }

    res.status(200).json({ success: true, booking });
  } catch (error) {
    next(error);
  }
});

// SSE Real-time Notification Stream for Provider
router.get('/notifications/stream/:email', (req, res) => {
  const email = (req.params.email || '').toLowerCase().trim();
  if (!email) {
    return res.status(400).json({ success: false, message: 'Provider email is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify({ type: 'connected', email })}\n\n`);
  registerSSEClient(email, res);

  const heartbeat = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch (err) {
      clearInterval(heartbeat);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
  });
});

// Get Notifications for Provider
router.get('/notifications/:email', async (req, res, next) => {
  try {
    const email = req.params.email?.trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Provider email is required' });
    }

    const list = await Notification.find({
      $or: [
        { recipientEmail: email },
        { recipientRole: 'All', recipientEmail: { $in: [null, '', undefined] } }
      ]
    }).sort({ createdAt: -1 }).limit(50);

    const formatted = list.map(n => {
      const nObj = n.toObject ? n.toObject() : { ...n };
      nObj.id = n._id.toString();
      nObj.time = formatRelativeTime(n.createdAt) || n.time || 'Just now';
      if (!nObj.targetRoute && nObj.bookingId) {
        nObj.targetRoute = `/provider/bookings?id=${nObj.bookingId}`;
      } else if (!nObj.targetRoute && (nObj.type === 'booking' || nObj.type === 'new_booking')) {
        nObj.targetRoute = '/provider/bookings';
      }
      return nObj;
    });

    res.status(200).json({ success: true, notifications: formatted });
  } catch (error) {
    next(error);
  }
});

// Get Reviews for Provider by Email
router.get('/reviews/:email', async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.params.email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Provider user not found' });
    }
    let provider = await Provider.findOne({ user: user._id });
    if (!provider) {
      provider = await Provider.findOne({ email: req.params.email.toLowerCase() });
    }
    if (!provider) {
      return res.status(404).json({ success: false, message: 'Provider details not found. Please complete provider registration.' });
    }
    const list = await Review.find({
      $or: [
        { providerId: provider._id.toString() },
        { providerId: user._id.toString() }
      ]
    }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, reviews: list });
  } catch (error) {
    next(error);
  }
});

// Reply to Review
router.post('/reviews/reply', async (req, res, next) => {
  try {
    const { reviewId, replyText } = req.body;
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    review.reply = replyText;
    await review.save();
    res.status(200).json({ success: true, review });
  } catch (error) {
    next(error);
  }
});

// Get Provider Earnings stats
router.get('/earnings/:email', async (req, res, next) => {
  try {
    const email = req.params.email.toLowerCase();
    let earning = await Earning.findOne({ providerEmail: email });
    if (!earning) {
      // Create default earning record
      earning = await Earning.create({
        providerEmail: email,
        today: 0,
        weekly: 0,
        monthly: 0,
        total: 0,
        completedJobsCount: 0
      });
    }
    // Dynamically calculate based on actual completed bookings
    const bookings = await Booking.find({ providerEmail: email, status: 'Completed' });
    const dynamicAmount = bookings.reduce((sum, b) => sum + b.amount, 0);
    
    res.status(200).json({
      success: true,
      earnings: {
        today: earning.today || 0,
        weekly: dynamicAmount,
        monthly: dynamicAmount,
        total: dynamicAmount || earning.total || 0,
        completedJobsCount: bookings.length,
        transactions: bookings.map(b => ({
          id: b._id,
          bookingId: b.bookingId,
          customerName: b.customerName,
          serviceName: b.serviceName,
          amount: b.amount,
          date: b.date,
          status: b.status
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

// Mark a single notification as read for a provider
router.post('/notifications/read/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email } = req.body;
    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    if (email && notification.recipientEmail && notification.recipientEmail.toLowerCase() !== email.trim().toLowerCase()) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to notification' });
    }

    notification.read = true;
    await notification.save();

    const nObj = notification.toObject();
    nObj.id = notification._id.toString();
    nObj.time = formatRelativeTime(notification.createdAt) || notification.time || 'Just now';
    if (!nObj.targetRoute && nObj.bookingId) {
      nObj.targetRoute = `/provider/bookings?id=${nObj.bookingId}`;
    }

    res.status(200).json({ success: true, notification: nObj });
  } catch (error) {
    next(error);
  }
});

// Mark all notifications as read for a provider
router.post('/notifications/read', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    await Notification.updateMany(
      {
        $or: [
          { recipientEmail: normalizedEmail },
          { recipientRole: 'All', recipientEmail: { $in: [null, '', undefined] } }
        ]
      },
      { read: true }
    );
    
    // Return all notifications updated
    const list = await Notification.find({
      $or: [
        { recipientEmail: normalizedEmail },
        { recipientRole: 'All', recipientEmail: { $in: [null, '', undefined] } }
      ]
    }).sort({ createdAt: -1 });

    const formatted = list.map(n => {
      const nObj = n.toObject ? n.toObject() : { ...n };
      nObj.id = n._id.toString();
      nObj.time = formatRelativeTime(n.createdAt) || n.time || 'Just now';
      if (!nObj.targetRoute && nObj.bookingId) {
        nObj.targetRoute = `/provider/bookings?id=${nObj.bookingId}`;
      } else if (!nObj.targetRoute && (nObj.type === 'booking' || nObj.type === 'new_booking')) {
        nObj.targetRoute = '/provider/bookings';
      }
      return nObj;
    });

    res.status(200).json({ success: true, notifications: formatted });
  } catch (error) {
    next(error);
  }
});

// Add a notification (e.g. status changes, system toggle)
router.post('/notifications/add', async (req, res, next) => {
  try {
    const { recipientEmail, title, message, type, bookingId, targetRoute, dedupKey } = req.body;
    if (!recipientEmail || !title || !message) {
      return res.status(400).json({ success: false, message: 'recipientEmail, title, and message are required' });
    }

    if (dedupKey) {
      const existing = await Notification.findOne({ dedupKey });
      if (existing) {
        const nObj = existing.toObject();
        nObj.id = existing._id.toString();
        nObj.time = formatRelativeTime(existing.createdAt) || existing.time || 'Just now';
        return res.status(200).json({ success: true, notification: nObj, duplicate: true });
      }
    }

    const notification = await Notification.create({
      title,
      message,
      type: type || 'system',
      read: false,
      recipientRole: 'Provider',
      recipientEmail: recipientEmail.trim().toLowerCase(),
      bookingId: bookingId || undefined,
      targetRoute: targetRoute || undefined,
      dedupKey: dedupKey || undefined
    });

    const nObj = notification.toObject();
    nObj.id = notification._id.toString();
    nObj.time = formatRelativeTime(notification.createdAt) || notification.time || 'Just now';

    res.status(201).json({ success: true, notification: nObj });
  } catch (error) {
    next(error);
  }
});

// ─── Service CRUD Routes ───────────────────────────────────────────────────────

// Helper: resolve provider document from email
const getProviderByEmail = async (email) => {
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return { error: 'Provider user not found' };
  const provider = await Provider.findOne({ user: user._id });
  if (!provider) return { error: 'Provider details not found' };
  return { user, provider };
};

// Helper to keep Provider.pricing in sync with Service collection
const syncProviderPricing = async (providerId) => {
  try {
    const allServices = await Service.find({ providerId, isAvailable: true });
    const provider = await Provider.findById(providerId);
    if (!provider) return;

    const pricing = allServices.map(s => ({
      service: s.name,
      price: s.price,
      unit: s.pricingUnit || provider.pricingUnit || 'Per Visit'
    }));

    if (allServices.length > 0) {
      provider.rate = allServices[0].price;
      provider.hourlyRate = allServices[0].price;
      if (allServices[0].pricingUnit) {
        provider.pricingUnit = allServices[0].pricingUnit;
      }
    }

    provider.pricing = pricing.length > 0 ? pricing : [{
      service: `${provider.category} Standard Service`,
      price: provider.rate || 350,
      unit: provider.pricingUnit || 'Per Visit'
    }];
    await provider.save();
  } catch (err) {
    console.error('Error syncing provider pricing:', err);
  }
};

// GET all services for a provider
router.get('/services/:email', async (req, res, next) => {
  try {
    const { error, provider } = await getProviderByEmail(req.params.email);
    if (error) return res.status(404).json({ success: false, message: error });

    const services = await Service.find({ providerId: provider._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, services });
  } catch (err) {
    next(err);
  }
});

// POST create a new service
router.post('/services', async (req, res, next) => {
  try {
    const { email, name, category, description, price, estimatedDuration, image, isAvailable } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Provider email is required' });
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Service name is required' });
    if (price === undefined || price === null || isNaN(price) || Number(price) <= 0) {
      return res.status(400).json({ success: false, message: 'A valid positive price is required' });
    }
    if (!estimatedDuration || !estimatedDuration.trim()) {
      return res.status(400).json({ success: false, message: 'Estimated duration is required' });
    }

    const { error, provider, user } = await getProviderByEmail(email);
    if (error) return res.status(404).json({ success: false, message: error });

    // Prevent renaming to an existing duplicate service for this provider
    if (name && name.trim()) {
      const existingService = await Service.findOne({
        _id: { $ne: req.params.id },
        providerId: provider._id,
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
      });
      if (existingService) {
        return res.status(400).json({
          success: false,
          message: `Service "${name.trim()}" is already registered for this provider.`
        });
      }
    }

    // Automatically reuse the provider's registered profile image
    const providerPhoto = normalizeImageUrl(provider.photo || user?.profileImage || '');
    const isHardcodedUnsplash = typeof image === 'string' && image.includes('images.unsplash.com/photo-1581578731548-c64695cc6952');
    const finalImage = (image && !isHardcodedUnsplash) ? normalizeImageUrl(image) : providerPhoto;

    const service = await Service.create({
      providerEmail: email.toLowerCase(),
      providerId: provider._id,
      name: name.trim(),
      category: category || provider.category || 'Home Cleaning',
      description: description || '',
      price: Number(price),
      pricingUnit: provider.pricingUnit || 'Per Visit',
      estimatedDuration: estimatedDuration.trim(),
      image: finalImage,
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true
    });

    await syncProviderPricing(provider._id);

    res.status(201).json({ success: true, service });
  } catch (err) {
    next(err);
  }
});

// PUT update an existing service (ownership enforced)
router.put('/services/:id', async (req, res, next) => {
  try {
    const { email, name, category, description, price, estimatedDuration, image, isAvailable } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Provider email is required' });

    const { error, provider, user } = await getProviderByEmail(email);
    if (error) return res.status(404).json({ success: false, message: error });

    // Prevent renaming to an existing duplicate service for this provider
    if (name && name.trim()) {
      const existingService = await Service.findOne({
        _id: { $ne: req.params.id },
        providerId: provider._id,
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
      });
      if (existingService) {
        return res.status(400).json({
          success: false,
          message: `Service "${name.trim()}" is already registered for this provider.`
        });
      }
    }

    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });

    // Ownership check
    if (service.providerId.toString() !== provider._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not authorised to modify this service' });
    }

    // Validate if price is being updated
    if (price !== undefined && (isNaN(price) || Number(price) <= 0)) {
      return res.status(400).json({ success: false, message: 'A valid positive price is required' });
    }

    if (name !== undefined) service.name = name.trim();
    if (category !== undefined) service.category = category;
    if (description !== undefined) service.description = description;
    if (price !== undefined) service.price = Number(price);
    if (estimatedDuration !== undefined) service.estimatedDuration = estimatedDuration.trim();
    if (image !== undefined) {
      const isHardcodedUnsplash = typeof image === 'string' && image.includes('images.unsplash.com/photo-1581578731548-c64695cc6952');
      const providerPhoto = normalizeImageUrl(provider.photo || user?.profileImage || '');
      service.image = (image && !isHardcodedUnsplash) ? normalizeImageUrl(image) : providerPhoto;
    }
    if (isAvailable !== undefined) service.isAvailable = Boolean(isAvailable);

    await service.save();
    await syncProviderPricing(provider._id);
    res.status(200).json({ success: true, service });
  } catch (err) {
    next(err);
  }
});

// DELETE a service (ownership enforced)
router.delete('/services/:id', async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, message: 'Provider email is required as query param' });

    const { error, provider } = await getProviderByEmail(email);
    if (error) return res.status(404).json({ success: false, message: error });

    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: 'Service not found' });

    // Ownership check
    if (service.providerId.toString() !== provider._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not authorised to delete this service' });
    }

    await Service.findByIdAndDelete(req.params.id);
    await syncProviderPricing(provider._id);
    res.status(200).json({ success: true, message: 'Service deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ─── Provider Account Deletion ───────────────────────────────────────────────

const deleteProviderAccountHandler = async (req, res, next) => {
  try {
    const email = req.body?.email || req.body?.providerEmail || req.query?.email;
    const password = req.body?.password || req.body?.currentPassword || req.headers['x-provider-password'];
    const authenticatedEmail = req.headers['x-authenticated-email'] || req.body?.authenticatedEmail;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required to authorize account deletion.'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Prevent Provider A from attempting to delete Provider B's account
    if (authenticatedEmail) {
      const normalizedAuth = String(authenticatedEmail).trim().toLowerCase();
      if (normalizedAuth !== normalizedEmail) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You are not authorized to delete another provider\'s account.'
        });
      }
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Service provider account not found.'
      });
    }

    // Role check: Only Service Providers can delete their account via this route
    if (user.role !== 'Provider') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only Service Provider accounts can be deleted via this endpoint.'
      });
    }

    // Password verification using secure helper supporting modern SHA-256 and legacy formats
    const isMatch = verifyPassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Account deletion unauthorized.'
      });
    }

    // Locate the provider document
    const provider = await Provider.findOne({ user: user._id });
    const providerIdStr = provider ? provider._id.toString() : null;

    // 1. Detach/Anonymize audit records (Bookings) - retain for audit and customer history
    await Booking.updateMany(
      { providerEmail: normalizedEmail },
      {
        $set: {
          providerName: `${user.fullName} (Account Closed)`,
          providerPhone: 'N/A'
        }
      }
    );

    // 2. Detach Reviews so they are archived without breaking relationships
    if (providerIdStr) {
      await Review.updateMany(
        { providerId: providerIdStr },
        {
          $set: {
            providerId: `deleted_${providerIdStr}`
          }
        }
      );
    }

    // 3. Remove this provider from any customer's savedProviders list
    if (providerIdStr) {
      await Customer.updateMany(
        { savedProviders: providerIdStr },
        { $pull: { savedProviders: providerIdStr } }
      );
    }

    // 4. Delete the provider's active services
    if (provider) {
      await Service.deleteMany({ providerId: provider._id });
    }
    await Service.deleteMany({ providerEmail: normalizedEmail });

    // 5. Delete provider earnings summary and notifications
    await Earning.deleteMany({ providerEmail: normalizedEmail });
    await Notification.deleteMany({ recipientEmail: normalizedEmail });

    // 6. Delete Provider profile and User authentication account
    if (provider) {
      await Provider.findByIdAndDelete(provider._id);
      await Provider.deleteMany({ user: user._id });
    }
    await User.findByIdAndDelete(user._id);

    return res.status(200).json({
      success: true,
      message: 'Your service provider account has been deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

router.post('/account/delete', deleteProviderAccountHandler);
router.delete('/account', deleteProviderAccountHandler);

// Change Password for Provider (delegates to shared processPasswordChange controller)
router.post('/change-password', async (req, res, next) => {
  try {
    const authHeaderEmail = req.headers['x-authenticated-email'] || req.headers['x-auth-email'];
    const result = await processPasswordChange({
      email: req.body.email,
      currentPassword: req.body.currentPassword,
      oldPassword: req.body.oldPassword,
      newPassword: req.body.newPassword,
      requiredRole: 'Provider',
      reqAuthEmail: authHeaderEmail
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    next(error);
  }
});

export default router;
