import express from 'express';
import mongoose from 'mongoose';
import ServiceCategory from '../models/ServiceCategory.js';
import Provider from '../models/Provider.js';
import User from '../models/User.js';
import Booking from '../models/Booking.js';
import Customer from '../models/Customer.js';
import Notification from '../models/Notification.js';
import Review from '../models/Review.js';
import Service from '../models/Service.js';
import { generateAIServicePlan, findAllCategoriesInText, findProviderByName } from './aiRoutes.js';
import { formatWorkingHours } from '../utils/timeFormat.js';
import { formatDateDDMMYYYY, parseDDMMYYYY, areDatesEqual, getDayOfWeek, getTodayDDMMYYYY } from '../utils/dateFormat.js';
import { generateServiceBookingId } from '../utils/bookingIdGenerator.js';
import { registerSSEClient, broadcastNotification } from '../utils/notificationBroadcaster.js';

const router = express.Router();

function escapeRegex(str) {
  return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Get Service Categories (Enriched with real provider counts & genuine starting prices)
router.get('/services', async (req, res, next) => {
  try {
    const list = await ServiceCategory.find({ status: 'Active' });
    const approvedProviders = await Provider.find({ status: 'Approved' }).populate('user');
    const validProviders = approvedProviders.filter(p => p.user);
    const validProviderIds = validProviders.map(p => p._id);
    const validProviderIdStrs = validProviders.map(p => p._id.toString());
    const validUserIdStrs = validProviders.map(p => p.user._id.toString());

    const allServices = await Service.find({
      providerId: { $in: validProviderIds },
      isAvailable: true
    });

    const allReviews = await Review.find({
      $or: [
        { providerId: { $in: validProviderIdStrs } },
        { providerId: { $in: validUserIdStrs } }
      ]
    });

    const enriched = list.map(cat => {
      const catLower = cat.name.toLowerCase().trim();
      const catProviders = validProviders.filter(p => (p.category || '').toLowerCase().trim() === catLower);
      const catProviderIdStrs = catProviders.map(p => p._id.toString());
      const catUserIdStrs = catProviders.map(p => p.user._id.toString());
      const catServices = allServices.filter(s => (s.category || '').toLowerCase().trim() === catLower);

      // Authentic starting price calculation
      const prices = [];
      catServices.forEach(s => { if (s.price > 0) prices.push(s.price); });
      catProviders.forEach(p => {
        if (p.rate > 0) prices.push(p.rate);
        if (p.hourlyRate > 0) prices.push(p.hourlyRate);
        if (p.pricing && p.pricing.length > 0) {
          p.pricing.forEach(pr => { if (pr.price > 0) prices.push(pr.price); });
        }
      });
      const startingPrice = prices.length > 0 ? Math.min(...prices) : (cat.startingPrice || 299);

      // Authentic rating calculation from genuine reviews
      const catReviews = allReviews.filter(r => catProviderIdStrs.includes(r.providerId) || catUserIdStrs.includes(r.providerId));
      const avgRating = catReviews.length > 0
        ? Number((catReviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / catReviews.length).toFixed(1))
        : (cat.rating || 4.5);

      return {
        id: cat._id,
        _id: cat._id,
        name: cat.name,
        icon: cat.icon || '⚡',
        image: cat.image,
        startingPrice: startingPrice,
        rating: avgRating,
        duration: cat.duration || 'Per Visit',
        description: cat.description || '',
        color: cat.color || '#3b82f6',
        providersCount: catProviders.length,
        servicesCount: catServices.length
      };
    });

    res.status(200).json({ success: true, services: enriched, categories: enriched });
  } catch (error) {
    next(error);
  }
});

// Categories Alias
router.get('/categories', async (req, res, next) => {
  try {
    const list = await ServiceCategory.find({ status: 'Active' });
    res.status(200).json({ success: true, categories: list, services: list });
  } catch (error) {
    next(error);
  }
});

// Get Services Catalog (Genuine active services filtered to approved providers, no orphaned services)
router.get('/services-catalog', async (req, res, next) => {
  try {
    const { category, search, maxPrice, minRating, city, availability, sortBy } = req.query;

    const services = await Service.find({ isAvailable: true }).populate({
      path: 'providerId',
      populate: { path: 'user' }
    });

    // Enforce provider eligibility: status === 'Approved', user exists and is not deleted
    let validServices = services.filter(s => s.providerId && s.providerId.status === 'Approved' && s.providerId.user);

    // Fetch genuine reviews for ratings
    const provIds = validServices.map(s => String(s.providerId._id));
    const userIds = validServices.map(s => String(s.providerId.user._id));
    const allReviews = await Review.find({
      $or: [
        { providerId: { $in: provIds } },
        { providerId: { $in: userIds } }
      ]
    });

    let formatted = validServices.map(s => {
      const p = s.providerId;
      const pIdStr = String(p._id);
      const uIdStr = String(p.user._id);
      const pReviews = allReviews.filter(r => r.providerId === pIdStr || r.providerId === uIdStr);
      const reviewsCount = pReviews.length;
      const avgRating = reviewsCount > 0
        ? Number((pReviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviewsCount).toFixed(1))
        : (p.rating || 5.0);

      const provPhoto = (p.photo && !p.photo.includes('images.unsplash.com/photo-1566492031773-4f4e44671857'))
        ? p.photo
        : (p.user?.profileImage || '');

      return {
        id: s._id,
        _id: s._id,
        name: s.name,
        category: s.category || p.category,
        description: s.description || '',
        price: s.price,
        pricingUnit: s.pricingUnit || p.pricingUnit || 'Per Visit',
        duration: s.estimatedDuration || '1 - 2 hours',
        image: s.image || provPhoto,
        rating: avgRating,
        reviewsCount: reviewsCount,
        providerId: p._id,
        provider: {
          id: p._id,
          _id: p._id,
          name: p.name || p.user?.fullName || 'Provider',
          category: p.category,
          city: p.city || 'Coimbatore',
          photo: provPhoto,
          experience: p.experience || 3,
          rating: avgRating,
          reviewsCount: reviewsCount,
          isOnline: p.isOnline !== undefined ? p.isOnline : true,
          workingHours: p.workingHours || { start: '09:00', end: '18:00' },
          workingDays: p.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          holidays: p.holidays || [],
          blockedDates: p.blockedDates || []
        }
      };
    });

    // Filter by category
    if (category && category !== 'All') {
      const catLower = category.toLowerCase().trim();
      formatted = formatted.filter(s =>
        (s.category || '').toLowerCase().trim() === catLower ||
        (s.provider.category || '').toLowerCase().trim() === catLower
      );
    }

    // Filter by search
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      formatted = formatted.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.description || '').toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q) ||
        (s.provider.name || '').toLowerCase().includes(q)
      );
    }

    // Filter by maxPrice
    if (maxPrice && !isNaN(Number(maxPrice))) {
      formatted = formatted.filter(s => s.price <= Number(maxPrice));
    }

    // Filter by minRating
    if (minRating && !isNaN(Number(minRating)) && Number(minRating) > 0) {
      formatted = formatted.filter(s => s.rating >= Number(minRating));
    }

    // Filter by city (Restricted to Coimbatore, Tamil Nadu, India)
    if (city && city !== 'All') {
      const normCity = city.trim().toLowerCase();
      if (normCity !== 'coimbatore' && !normCity.includes('coimbatore')) {
        return res.status(400).json({
          success: false,
          message: 'Services are supported only in Coimbatore, Tamil Nadu, India.'
        });
      }
      formatted = formatted.filter(s => (s.provider.city || 'Coimbatore').toLowerCase().includes('coimbatore'));
    }

    // Filter by availability
    if (availability && availability !== 'All') {
      if (availability === 'Online Now') {
        formatted = formatted.filter(s => s.provider.isOnline === true);
      } else if (availability === 'Available Today') {
        const todayStr = getTodayDDMMYYYY();
        const todayDay = getDayOfWeek(todayStr);
        formatted = formatted.filter(s => {
          if (s.provider.isOnline === false) return false;
          const holidays = [...(s.provider.holidays || []), ...(s.provider.blockedDates || [])];
          if (holidays.some(h => areDatesEqual(h, todayStr))) return false;
          const wDays = s.provider.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
          return wDays.includes(todayDay);
        });
      }
    }

    // Sorting
    if (sortBy === 'price_asc') {
      formatted.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      formatted.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating_desc') {
      formatted.sort((a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount);
    }

    res.status(200).json({ success: true, services: formatted, total: formatted.length });
  } catch (error) {
    next(error);
  }
});

// Get Providers (with genuine ratings from Review collection, authentic photos, no mock fallbacks)
router.get('/providers', async (req, res, next) => {
  try {
    const list = await Provider.find({ status: 'Approved' }).populate('user');
    const validProviders = list.filter(p => p.user);

    // Fetch all reviews in one go for fast lookup
    const validProviderIds = validProviders.map(p => String(p._id));
    const validUserIds = validProviders.map(p => String(p.user._id));
    const allReviews = await Review.find({
      $or: [
        { providerId: { $in: validProviderIds } },
        { providerId: { $in: validUserIds } }
      ]
    });

    const allServices = await Service.find({
      providerId: { $in: validProviders.map(p => p._id) },
      isAvailable: true
    });

    let formatted = validProviders.map((p) => {
      // Find authentic reviews for this provider
      const pIdStr = String(p._id);
      const uIdStr = String(p.user._id);
      const providerReviews = allReviews.filter(r => r.providerId === pIdStr || r.providerId === uIdStr);
      const reviewsCount = providerReviews.length;
      const avgRating = reviewsCount > 0
        ? Number((providerReviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviewsCount).toFixed(1))
        : 0;

      // Authentic registered profile image only; never substitute fake/hardcoded Unsplash stock photos
      const authenticPhoto = (p.photo && !p.photo.includes('images.unsplash.com/photo-1566492031773-4f4e44671857'))
        ? p.photo
        : (p.user?.profileImage || '');

      // Check if provider has specific services registered
      const provServices = allServices.filter(s => s.providerId.toString() === p._id.toString());
      let pricing = p.pricing && p.pricing.length > 0 ? p.pricing : [];
      if (provServices.length > 0) {
        pricing = provServices.map(s => ({
          id: s._id,
          service: s.name,
          price: s.price,
          unit: s.pricingUnit || p.pricingUnit || 'Per Visit',
          description: s.description,
          duration: s.estimatedDuration,
          image: s.image || authenticPhoto
        }));
      }
      if (pricing.length === 0) {
        const fallbackPrice = p.rate || p.hourlyRate || 0;
        const fallbackUnit = p.pricingUnit || 'Per Visit';
        pricing = [{
          service: `${p.category} Standard Service`,
          price: fallbackPrice,
          unit: fallbackUnit,
          image: authenticPhoto
        }];
      }

      const effectiveRate = p.rate > 0 ? p.rate : (pricing.length > 0 ? Math.min(...pricing.map(item => item.price)) : 0);
      const effectiveUnit = p.pricingUnit || pricing[0]?.unit || 'Per Visit';

      return {
        id: p._id,
        _id: p._id,
        name: p.name || p.user?.fullName || 'Provider',
        fullName: p.name || p.user?.fullName || 'Provider',
        email: p.email || p.user?.email || '',
        phone: p.phone || p.user?.phone || '',
        category: p.category,
        experience: p.experience || 1,
        gender: p.gender || 'Not specified',
        age: p.age || null,
        about: p.about || p.bio || '',
        bio: p.bio || p.about || '',
        rating: avgRating,
        reviewsCount: reviewsCount,
        reviews: providerReviews,
        availability: p.availability || 'Available Today',
        city: p.city || 'Coimbatore',
        state: p.state || 'Tamil Nadu',
        completedJobs: p.completedJobs || 0,
        rate: effectiveRate,
        price: effectiveRate,
        pricingUnit: effectiveUnit,
        workingHours: p.workingHours || { start: '09:00', end: '18:00' },
        workingHoursFormatted: formatWorkingHours(p.workingHours),
        workingDays: p.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        isOnline: p.isOnline !== undefined ? p.isOnline : true,
        holidays: (p.holidays || []).map(h => formatDateDDMMYYYY(h) || h),
        blockedDates: (p.blockedDates && p.blockedDates.length > 0 ? p.blockedDates : (p.holidays || [])).map(h => formatDateDDMMYYYY(h) || h),
        photo: authenticPhoto,
        coverImage: p.coverImage || '',
        skills: p.skills || [],
        pricing: pricing
      };
    });

    // ── Apply Query Parameters for Filtering & Search ──
    const { category, service, serviceId, city, minRating, maxPrice, minExperience, availability, search, sortBy } = req.query;

    if (serviceId) {
      formatted = formatted.filter(p =>
        p.pricing.some(item => item.id && String(item.id) === String(serviceId))
      );
    }

    if (service) {
      const sLower = service.toLowerCase().trim();
      formatted = formatted.filter(p =>
        p.pricing.some(item => (item.service || '').toLowerCase().includes(sLower)) ||
        (p.category || '').toLowerCase() === sLower
      );
    }

    if (category && category !== 'All') {
      const cLower = category.toLowerCase().trim();
      formatted = formatted.filter(p =>
        (p.category || '').toLowerCase().trim() === cLower ||
        p.pricing.some(item => (item.category || '').toLowerCase().trim() === cLower)
      );
    }

    if (city && city !== 'All') {
      const normCity = city.trim().toLowerCase();
      if (normCity !== 'coimbatore' && !normCity.includes('coimbatore')) {
        return res.status(400).json({
          success: false,
          message: 'Provider searches are supported only in Coimbatore, Tamil Nadu, India.'
        });
      }
      formatted = formatted.filter(p => (p.city || 'Coimbatore').toLowerCase().includes('coimbatore'));
    }

    if (minRating) {
      const minR = Number(minRating);
      if (!isNaN(minR) && minR > 0) {
        formatted = formatted.filter(p => p.rating >= minR);
      }
    }

    if (maxPrice) {
      const maxP = Number(maxPrice);
      if (!isNaN(maxP) && maxP > 0) {
        formatted = formatted.filter(p => (p.rate || p.price) <= maxP);
      }
    }

    if (minExperience) {
      const minExp = Number(minExperience);
      if (!isNaN(minExp) && minExp > 0) {
        formatted = formatted.filter(p => (p.experience || 0) >= minExp);
      }
    }

    if (availability && availability !== 'All') {
      if (availability === 'Online Now') {
        formatted = formatted.filter(p => p.isOnline === true);
      } else if (availability === 'Available Today') {
        const todayStr = getTodayDDMMYYYY();
        const todayDay = getDayOfWeek(todayStr);
        formatted = formatted.filter(p => {
          if (p.isOnline === false) return false;
          const holidays = [...(p.holidays || []), ...(p.blockedDates || [])];
          if (holidays.some(h => areDatesEqual(h, todayStr))) return false;
          const wDays = p.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
          return wDays.includes(todayDay);
        });
      }
    }

    if (search && search.trim()) {
      const rawQ = search.trim();
      const q = rawQ.toLowerCase();

      // Retrieve all active categories for taxonomy matching (handles English, typos, Tanglish)
      const allActiveCats = await ServiceCategory.find({ status: 'Active' }).lean();
      const matchedCats = findAllCategoriesInText(rawQ, allActiveCats);
      const namedProvider = findProviderByName(rawQ, formatted);

      formatted = formatted.filter(p => {
        // Direct name match (e.g. searching 'Gowtham' or 'Kannan')
        const matchesName = (p.name || '').toLowerCase().includes(q) || (p.fullName || '').toLowerCase().includes(q);
        if (namedProvider && (String(p._id) === String(namedProvider.id || namedProvider._id) || matchesName)) {
          return true;
        }

        // Direct category match
        const matchesCategory = (p.category || '').toLowerCase() === q || (p.category || '').toLowerCase().includes(q);

        // Taxonomy match (handles typos e.g. 'electrishan' and Tanglish e.g. 'enaku electrician venum')
        const matchesTaxonomy = matchedCats.some(cat => (p.category || '').toLowerCase() === cat.toLowerCase());

        // Service title in provider's configured pricing
        const matchesPricing = p.pricing && p.pricing.some(item => (item.service || '').toLowerCase().includes(q));

        // Skills match
        const matchesSkills = p.skills && (Array.isArray(p.skills) ? p.skills.join(' ') : p.skills).toLowerCase().includes(q);

        // If the query identified specific categories in the taxonomy (e.g. 'plumber' or 'electrician'),
        // strictly restrict results to providers in those matched categories or explicit name match
        if (matchedCats.length > 0) {
          return matchesTaxonomy || matchesName;
        }

        return matchesName || matchesCategory || matchesSkills || matchesPricing;
      });
    }

    // Sort
    if (sortBy === 'price_asc') {
      formatted.sort((a, b) => (a.rate || a.price) - (b.rate || b.price));
    } else if (sortBy === 'price_desc') {
      formatted.sort((a, b) => (b.rate || b.price) - (a.rate || a.price));
    } else if (sortBy === 'rating_desc') {
      formatted.sort((a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount);
    } else if (sortBy === 'experience_desc') {
      formatted.sort((a, b) => (b.experience || 0) - (a.experience || 0));
    }

    // Deduplicate providers strictly by stable MongoDB provider ID
    const seenProviderIds = new Set();
    const uniqueProviders = [];
    for (const p of formatted) {
      const idStr = String(p.id || p._id);
      if (!seenProviderIds.has(idStr)) {
        seenProviderIds.add(idStr);
        uniqueProviders.push(p);
      }
    }

    res.status(200).json({ success: true, providers: uniqueProviders, total: uniqueProviders.length });
  } catch (error) {
    next(error);
  }
});

// Top Rated Approved Providers (computed from genuine reviews and completed jobs)
router.get('/top-providers', async (req, res, next) => {
  try {
    const list = await Provider.find({ status: 'Approved' }).populate('user');
    const validProviders = list.filter(p => p.user);

    const validProviderIds = validProviders.map(p => String(p._id));
    const validUserIds = validProviders.map(p => String(p.user._id));
    const allReviews = await Review.find({
      $or: [
        { providerId: { $in: validProviderIds } },
        { providerId: { $in: validUserIds } }
      ]
    });

    const scored = validProviders.map(p => {
      const pIdStr = String(p._id);
      const uIdStr = String(p.user._id);
      const pReviews = allReviews.filter(r => r.providerId === pIdStr || r.providerId === uIdStr);
      const reviewsCount = pReviews.length;
      const avgRating = reviewsCount > 0
        ? Number((pReviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviewsCount).toFixed(1))
        : 0;

      const authenticPhoto = (p.photo && !p.photo.includes('images.unsplash.com/photo-1566492031773-4f4e44671857'))
        ? p.photo
        : (p.user?.profileImage || '');

      return {
        id: p._id,
        _id: p._id,
        name: p.name || p.user?.fullName || 'Provider',
        category: p.category,
        experience: p.experience,
        city: p.city || 'Coimbatore',
        jobs: p.completedJobs || 0,
        rating: avgRating,
        reviewsCount: reviewsCount,
        photo: authenticPhoto,
        price: p.rate || 0,
        pricingUnit: p.pricingUnit || 'Per Visit'
      };
    });

    // Deduplicate by stable provider ID
    const seenTopIds = new Set();
    const uniqueScored = [];
    for (const p of scored) {
      const idStr = String(p.id || p._id);
      if (!seenTopIds.has(idStr)) {
        seenTopIds.add(idStr);
        uniqueScored.push(p);
      }
    }

    // Sort by rating desc, then jobs desc
    uniqueScored.sort((a, b) => b.rating - a.rating || b.jobs - a.jobs);

    res.status(200).json({ success: true, providers: uniqueScored.slice(0, 6) });
  } catch (error) {
    next(error);
  }
});

// AI Smart Recommendations (dynamically generated from approved providers & active services)
router.get('/recommendations', async (req, res, next) => {
  try {
    const approvedProviders = await Provider.find({ status: 'Approved' }).populate('user');
    const validProviders = approvedProviders.filter(p => p.user);

    if (validProviders.length === 0) {
      return res.status(200).json({ success: true, recommendations: [] });
    }

    const validProviderIds = validProviders.map(p => String(p._id));
    const validUserIds = validProviders.map(p => String(p.user._id));
    const allReviews = await Review.find({
      $or: [
        { providerId: { $in: validProviderIds } },
        { providerId: { $in: validUserIds } }
      ]
    });

    const recommendations = [];
    const seenRecProviderIds = new Set();

    for (const p of validProviders) {
      const pIdStr = String(p._id);
      if (seenRecProviderIds.has(pIdStr)) continue;
      seenRecProviderIds.add(pIdStr);

      const uIdStr = String(p.user._id);
      const pReviews = allReviews.filter(r => r.providerId === pIdStr || r.providerId === uIdStr);
      const reviewsCount = pReviews.length;
      const avgRating = reviewsCount > 0
        ? Number((pReviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviewsCount).toFixed(1))
        : 0;

      const authenticPhoto = (p.photo && !p.photo.includes('images.unsplash.com/photo-1566492031773-4f4e44671857'))
        ? p.photo
        : (p.user?.profileImage || '');

      const services = await Service.find({ providerId: p._id, isAvailable: true }).lean();

      const primaryService = services[0];
      const serviceName = primaryService ? primaryService.name : `${p.category} Standard Service`;
      const estimatedPrice = primaryService ? primaryService.price : (p.rate || p.hourlyRate || 350);
      const estimatedDuration = (primaryService && primaryService.estimatedDuration && primaryService.estimatedDuration.trim())
        ? primaryService.estimatedDuration.trim()
        : 'Duration not available';

      recommendations.push({
        id: `rec-${p._id}`,
        serviceId: primaryService ? primaryService._id : p._id,
        serviceName,
        category: p.category,
        image: (primaryService && primaryService.image) ? primaryService.image : authenticPhoto,
        reason: avgRating > 4
          ? `Top-rated (${avgRating}★) verified professional in ${p.city || 'Coimbatore'}.`
          : `Verified ${p.category} with ${p.experience}+ years experience in ${p.city || 'Coimbatore'}.`,
        criteria: avgRating > 4 ? 'Best Rated Near You' : 'Popular Services & Location',
        confidence: avgRating > 4 ? 96 : 88,
        estimatedPrice,
        estimatedDuration,
        rating: avgRating,
        reviewsCount,
        providerId: p._id,
        providerName: p.name || p.user?.fullName || 'Provider',
        providerCity: p.city || 'Coimbatore',
        badge: avgRating > 4 ? 'Best Rated Near You' : 'Verified Partner',
        services: services.map(s => ({
          id: s._id,
          name: s.name,
          price: s.price,
          duration: (s.estimatedDuration && s.estimatedDuration.trim()) ? s.estimatedDuration.trim() : 'Duration not available'
        }))
      });
    }

    res.status(200).json({ success: true, recommendations: recommendations.slice(0, 8) });
  } catch (error) {
    next(error);
  }
});

// Calculate Real-Time Cost Estimate (Strict Provider Fee Only)
router.post('/estimate', async (req, res, next) => {
  try {
    const {
      category,
      serviceId,
      serviceName,
      providerId,
      houseSize,
      rooms,
      areaSqFt,
      hours,
      quantity
    } = req.body;

    if (!category || typeof category !== 'string' || !category.trim()) {
      return res.status(400).json({ success: false, message: 'Service category is required.' });
    }

    // Backend validation for room count
    if (rooms !== undefined && rooms !== null && rooms !== '') {
      const parsedRooms = Number(rooms);
      if (!Number.isInteger(parsedRooms) || parsedRooms < 1 || parsedRooms > 20) {
        return res.status(400).json({
          success: false,
          message: 'Room count must be an integer between 1 and 20.'
        });
      }
    }

    const cleanCategory = category.trim();

    // 1. Verify Category in MongoDB
    const catDoc = await ServiceCategory.findOne({
      name: new RegExp(`^${escapeRegex(cleanCategory)}$`, 'i'),
      status: 'Active'
    }).lean();

    if (!catDoc) {
      return res.status(400).json({
        success: false,
        message: `Category "${cleanCategory}" is not an active service category in Coimbatore.`
      });
    }

    // 2. Query Approved Providers in Coimbatore for this category
    const approvedProviders = await Provider.find({
      category: new RegExp(`^${escapeRegex(catDoc.name)}$`, 'i'),
      status: 'Approved',
      $or: [
        { city: { $regex: /coimbatore/i } },
        { city: '' },
        { city: { $exists: false } }
      ]
    }).lean();

    // If no approved provider is registered for this category
    if (!approvedProviders || approvedProviders.length === 0) {
      return res.status(200).json({
        success: true,
        available: false,
        category: catDoc.name,
        startingPrice: catDoc.startingPrice,
        durationUnit: catDoc.duration || 'Per Visit',
        duration: 'Duration not available',
        estimatedDuration: 'Duration not available',
        message: `Cost estimate is currently unavailable for ${catDoc.name}. While SmartServe AI supports this category (starting from ₹${catDoc.startingPrice} ${catDoc.duration || 'Per Visit'}), there are currently no verified ${catDoc.name} providers registered or available in Coimbatore.`,
        providerFee: null,
        total: null,
        breakdown: null,
        recommendedProviders: []
      });
    }

    // 3. Determine target provider with strict validation
    let targetProvider = approvedProviders[0];
    if (providerId) {
      if (!mongoose.Types.ObjectId.isValid(providerId)) {
        return res.status(400).json({ success: false, message: 'Invalid provider ID format.' });
      }
      const specified = approvedProviders.find(p => p._id.toString() === providerId.toString());
      if (!specified) {
        return res.status(404).json({ success: false, message: 'Selected provider was not found or is not approved for this category.' });
      }
      targetProvider = specified;
    }

    // 4. Determine specific service & rate with strict validation
    let specificService = null;
    if (serviceId) {
      if (!mongoose.Types.ObjectId.isValid(serviceId)) {
        return res.status(400).json({ success: false, message: 'Invalid service ID format.' });
      }
      specificService = await Service.findOne({
        _id: serviceId,
        providerId: targetProvider._id,
        isAvailable: true
      }).lean();
      if (!specificService) {
        return res.status(404).json({ success: false, message: 'Selected service does not belong to the selected provider or is currently unavailable.' });
      }
    }
    if (!specificService && serviceName) {
      specificService = await Service.findOne({
        name: new RegExp(`^${escapeRegex(serviceName.trim())}$`, 'i'),
        providerId: targetProvider._id,
        isAvailable: true
      }).lean();
    }
    if (!specificService) {
      specificService = await Service.findOne({
        providerId: targetProvider._id,
        category: new RegExp(`^${escapeRegex(catDoc.name)}$`, 'i'),
        isAvailable: true
      }).lean();
    }

    let unitRate = 0;
    let unit = catDoc.duration || 'Per Visit';
    let serviceTitle = `${catDoc.name} Service`;

    if (specificService && typeof specificService.price === 'number') {
      unitRate = specificService.price;
      unit = specificService.pricingUnit || targetProvider.pricingUnit || catDoc.duration || 'Per Visit';
      serviceTitle = specificService.name;
    } else if (targetProvider.pricing && Array.isArray(targetProvider.pricing) && targetProvider.pricing.length > 0) {
      let matchedPricing = null;
      if (serviceName) {
        matchedPricing = targetProvider.pricing.find(p => p.service && p.service.toLowerCase().trim() === serviceName.toLowerCase().trim());
      }
      if (!matchedPricing) {
        matchedPricing = targetProvider.pricing[0];
      }
      if (matchedPricing && typeof matchedPricing.price === 'number') {
        unitRate = matchedPricing.price;
        unit = matchedPricing.unit || targetProvider.pricingUnit || catDoc.duration || 'Per Visit';
        serviceTitle = matchedPricing.service || serviceTitle;
      }
    }

    if (!unitRate) {
      if (typeof targetProvider.hourlyRate === 'number' && targetProvider.hourlyRate > 0) {
        unitRate = targetProvider.hourlyRate;
        unit = 'Per Hour';
      } else if (typeof targetProvider.rate === 'number' && targetProvider.rate > 0) {
        unitRate = targetProvider.rate;
        unit = targetProvider.pricingUnit || catDoc.duration || 'Per Visit';
      } else {
        unitRate = catDoc.startingPrice;
        unit = catDoc.duration || 'Per Visit';
      }
    }

    // 5. Retrieve duration from provider's configured service record
    let resolvedDuration = '';
    if (specificService && specificService.estimatedDuration && specificService.estimatedDuration.trim()) {
      resolvedDuration = specificService.estimatedDuration.trim();
    } else {
      let matchedPricing = null;
      if (serviceName && targetProvider.pricing) {
        matchedPricing = targetProvider.pricing.find(p => p.service && p.service.toLowerCase().trim() === serviceName.toLowerCase().trim());
      }
      if (!matchedPricing && targetProvider.pricing && targetProvider.pricing.length > 0) {
        matchedPricing = targetProvider.pricing[0];
      }
      if (matchedPricing && matchedPricing.duration && matchedPricing.duration.trim()) {
        resolvedDuration = matchedPricing.duration.trim();
      }
    }
    const finalDuration = resolvedDuration || 'Duration not available';

    // 6. Calculate genuine provider fee strictly according to verified pricing rules
    let calculatedFee = 0;
    let calculationExplanation = '';
    const normUnit = unit.toLowerCase();

    if (normUnit.includes('hour')) {
      const parsedHours = (typeof hours === 'number' && hours > 0) ? hours : (rooms && rooms > 0 ? Math.max(1, Math.min(8, Math.round(rooms * 0.75))) : 2);
      calculatedFee = Math.round(unitRate * parsedHours);
      calculationExplanation = `Calculated as ₹${unitRate}/hr × ${parsedHours} hour(s) based on verified provider rate configured by ${targetProvider.name}.`;
    } else if (normUnit.includes('sq.ft') || normUnit.includes('sqft')) {
      const bhkAreaMap = { '1 BHK': 500, '2 BHK': 850, '3 BHK': 1200, '4 BHK': 1600, 'Villa/Independent': 2500 };
      const parsedArea = (typeof areaSqFt === 'number' && areaSqFt > 0) ? areaSqFt : (bhkAreaMap[houseSize] || 850);
      calculatedFee = Math.round(unitRate * parsedArea);
      calculationExplanation = `Calculated as ₹${unitRate}/sq.ft × ${parsedArea} sq.ft (${houseSize || 'standard area'}) based on verified provider rate configured by ${targetProvider.name}.`;
    } else if (normUnit.includes('bhk')) {
      const bhkMultiplierMap = { '1 BHK': 1.0, '2 BHK': 1.4, '3 BHK': 1.9, '4 BHK': 2.4, 'Villa/Independent': 3.2 };
      const multiplier = bhkMultiplierMap[houseSize] || 1.0;
      calculatedFee = Math.round(unitRate * multiplier);
      calculationExplanation = `Calculated as ₹${unitRate} base rate × ${multiplier} multiplier for ${houseSize || '1 BHK'} based on verified provider rate configured by ${targetProvider.name}.`;
    } else {
      const parsedQty = (typeof quantity === 'number' && quantity > 0) ? quantity : 1;
      calculatedFee = Math.round(unitRate * parsedQty);
      calculationExplanation = `Fixed provider service fee of ₹${unitRate} ${unit}${parsedQty > 1 ? ` × ${parsedQty}` : ''} configured by ${targetProvider.name}.`;
    }

    // Strict requirement: Price breakdown contains ONLY the provider fee.
    // Total customer payable amount must EQUAL the applicable provider fee.
    const breakdown = {
      providerServiceFee: calculatedFee,
      total: calculatedFee
    };

    // Deduplicate recommended providers by stable provider ID
    const seenRecProvIds = new Set();
    const uniqueRecommended = [];
    for (const p of approvedProviders) {
      const pId = String(p._id);
      if (!seenRecProvIds.has(pId)) {
        seenRecProvIds.add(pId);
        uniqueRecommended.push(p);
      }
    }

    return res.status(200).json({
      success: true,
      available: true,
      category: catDoc.name,
      service: serviceTitle,
      serviceId: specificService ? specificService._id : undefined,
      provider: {
        id: targetProvider._id,
        _id: targetProvider._id,
        name: targetProvider.name,
        rating: targetProvider.rating || 0,
        reviewsCount: targetProvider.reviewsCount || 0,
        city: targetProvider.city || 'Coimbatore'
      },
      duration: finalDuration,
      estimatedDuration: finalDuration,
      providerFee: calculatedFee,
      total: calculatedFee,
      unit,
      explanation: calculationExplanation,
      breakdown,
      recommendedProviders: uniqueRecommended.slice(0, 4).map(p => ({
        id: p._id,
        _id: p._id,
        name: p.name,
        rating: p.rating || 0,
        reviewsCount: p.reviewsCount || 0,
        city: p.city || 'Coimbatore',
        photo: p.photo || '',
        price: p.pricing && p.pricing.length > 0
          ? `₹${p.pricing[0].price} ${p.pricing[0].unit || 'Per Visit'}`
          : (p.hourlyRate ? `₹${p.hourlyRate} Per Hour` : `₹${p.rate || catDoc.startingPrice} ${p.pricingUnit || catDoc.duration}`)
      }))
    });
  } catch (error) {
    next(error);
  }
});

// AI Service Planner Endpoint (MongoDB Single Source of Truth)
router.post('/planner', async (req, res, next) => {
  try {
    const result = await generateAIServicePlan(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// Create Booking
router.post('/bookings', async (req, res, next) => {
  try {
    const {
      customerName, customerEmail, customerPhone,
      providerName, providerEmail, providerPhone,
      date, time, serviceType, serviceName, amount, location, city
    } = req.body;

    // Location validation: Enforce Coimbatore only
    if (city && typeof city === 'string' && city.trim()) {
      const normCity = city.trim().toLowerCase();
      if (normCity !== 'coimbatore' && !normCity.includes('coimbatore')) {
        return res.status(400).json({
          success: false,
          message: 'Service bookings are supported only within Coimbatore, Tamil Nadu, India.'
        });
      }
    }

    // Validate room count if provided
    if (req.body.rooms !== undefined && req.body.rooms !== null && req.body.rooms !== '') {
      const parsedRooms = Number(req.body.rooms);
      if (!Number.isInteger(parsedRooms) || parsedRooms < 1 || parsedRooms > 20) {
        return res.status(400).json({
          success: false,
          message: 'Room count must be an integer between 1 and 20.'
        });
      }
    }

    const unsupportedCities = ['chennai', 'bangalore', 'bengaluru', 'mumbai', 'delhi', 'hyderabad', 'kolkata', 'kochi', 'madurai', 'salem', 'trichy', 'tirupur', 'erode'];
    if (location && typeof location === 'string') {
      const locLower = location.toLowerCase();
      if (unsupportedCities.some(ext => locLower.includes(ext))) {
        return res.status(400).json({
          success: false,
          message: 'Service bookings are supported only within Coimbatore, Tamil Nadu, India.'
        });
      }
    }

    if (!date) {
      return res.status(400).json({ success: false, message: 'Booking date is required.' });
    }

    // 1. Validate date validity and format
    const parsedDate = parseDDMMYYYY(date);
    if (!parsedDate.valid) {
      return res.status(400).json({
        success: false,
        message: `Invalid booking date: ${parsedDate.error || 'Please provide a valid date in DD/MM/YYYY format.'}`
      });
    }
    const standardDate = parsedDate.formatted;

    // 2. Lookup provider for availability validation
    let provider = null;
    if (req.body.providerId && mongoose.Types.ObjectId.isValid(req.body.providerId)) {
      provider = await Provider.findById(req.body.providerId);
    }
    if (!provider && providerEmail) {
      const user = await User.findOne({ email: providerEmail.toLowerCase() });
      if (user) {
        provider = await Provider.findOne({ user: user._id });
      }
      if (!provider) {
        provider = await Provider.findOne({ email: providerEmail.toLowerCase() });
      }
    }
    if (!provider && providerName) {
      provider = await Provider.findOne({ name: providerName });
    }

    // Single Source of Truth: Ensure provider exists in MongoDB and is currently Approved!
    if (!provider || provider.status !== 'Approved') {
      return res.status(400).json({
        success: false,
        message: 'The selected service provider is no longer available, was removed, or is not approved. Please select an active verified provider.'
      });
    }

    // 3. Enforce Provider Availability Rules
    if (provider) {
      // Enforce Provider Coimbatore location check
      if (provider.city && provider.city.toLowerCase() !== 'coimbatore' && !provider.city.toLowerCase().includes('coimbatore')) {
        return res.status(400).json({
          success: false,
          message: 'Selected provider is not registered to deliver services in Coimbatore.'
        });
      }

      // A. Online status check
      if (provider.isOnline === false) {
        return res.status(400).json({
          success: false,
          message: `${provider.name || 'This provider'} is currently offline and not accepting new bookings.`
        });
      }

      // B. Holiday and blocked dates check
      const allHolidays = [...(provider.holidays || []), ...(provider.blockedDates || [])];
      const isHoliday = allHolidays.some(h => areDatesEqual(h, standardDate));
      if (isHoliday) {
        return res.status(400).json({
          success: false,
          message: `The provider has marked ${standardDate} as a holiday/blocked date and is unavailable for bookings.`
        });
      }

      // C. Working days check
      const workingDays = provider.workingDays && provider.workingDays.length > 0
        ? provider.workingDays
        : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      const dayOfWeek = getDayOfWeek(standardDate);
      if (!workingDays.includes(dayOfWeek)) {
        return res.status(400).json({
          success: false,
          message: `The provider does not work on ${dayOfWeek}s. Active working days are: ${workingDays.join(', ')}.`
        });
      }

      // D. Working hours check
      if (time && provider.workingHours && provider.workingHours.start && provider.workingHours.end) {
        const parseMinutes = (tStr) => {
          if (!tStr) return null;
          const match = tStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
          if (!match) return null;
          let h = parseInt(match[1], 10);
          const m = parseInt(match[2], 10);
          const mer = match[3] ? match[3].toUpperCase() : null;
          if (mer === 'PM' && h < 12) h += 12;
          if (mer === 'AM' && h === 12) h = 0;
          return h * 60 + m;
        };

        const bookingMinutes = parseMinutes(time);
        const startMinutes = parseMinutes(provider.workingHours.start);
        const endMinutes = parseMinutes(provider.workingHours.end);

        if (bookingMinutes !== null && startMinutes !== null && endMinutes !== null) {
          if (bookingMinutes < startMinutes || bookingMinutes >= endMinutes) {
            return res.status(400).json({
              success: false,
              message: `Requested time ${time} is outside provider's working hours (${provider.workingHours.start} - ${provider.workingHours.end}).`
            });
          }
        }
      }
    }

    // 4. Retrieve authenticated customer profile from MongoDB
    let customerDoc = null;
    let customerUser = null;
    if (customerEmail) {
      customerUser = await User.findOne({ email: customerEmail.toLowerCase().trim() });
      if (customerUser) {
        customerDoc = await Customer.findOne({ user: customerUser._id });
      }
      if (!customerDoc) {
        customerDoc = await Customer.findOne({ email: customerEmail.toLowerCase().trim() });
      }
    }

    const resolvedCustomerName = (customerName || customerUser?.fullName || customerDoc?.name || 'Customer').trim();
    const resolvedCustomerEmail = (customerEmail || customerUser?.email || '').toLowerCase().trim();
    const rawCustomerPhone = (req.body.customerPhone || customerPhone || customerDoc?.phone || customerUser?.phone || '').trim();
    const resolvedCustomerPhone = rawCustomerPhone || 'Phone number not provided';

    // Save snapshot of customer address so subsequent profile changes do not alter historical booking address
    const inputAddress = (req.body.customerAddress || req.body.address || location || '').trim();
    let resolvedCustomerAddress = 'Address not provided';
    if (inputAddress && inputAddress.toLowerCase() !== 'address not provided') {
      resolvedCustomerAddress = inputAddress;
    } else if (customerDoc?.address && customerDoc.address.trim() && customerDoc.address.trim() !== 'Coimbatore, TN') {
      resolvedCustomerAddress = customerDoc.address.trim();
    } else if (customerDoc?.savedAddresses && customerDoc.savedAddresses.length > 0 && customerDoc.savedAddresses[0]?.address) {
      resolvedCustomerAddress = customerDoc.savedAddresses[0].address.trim();
    } else if (customerDoc?.address && customerDoc.address.trim()) {
      resolvedCustomerAddress = customerDoc.address.trim();
    }

    // If customer updated their phone or address before/during booking, persist to their profile for future bookings
    if (customerDoc) {
      let profileUpdated = false;
      if (!customerDoc.phone && rawCustomerPhone) {
        customerDoc.phone = rawCustomerPhone;
        profileUpdated = true;
      }
      if ((!customerDoc.address || customerDoc.address === 'Coimbatore, TN') && resolvedCustomerAddress !== 'Address not provided') {
        customerDoc.address = resolvedCustomerAddress;
        profileUpdated = true;
      }
      if (profileUpdated) {
        await customerDoc.save();
      }
    }

    // 5. Validate that the selected provider actually offers the requested service
    if (provider) {
      const providerServices = await Service.find({ providerId: provider._id, isAvailable: true }).lean();
      const offeredNames = providerServices.map(s => (s.name || '').toLowerCase().trim());
      const offeredCats = providerServices.map(s => (s.category || '').toLowerCase().trim());
      if (provider.category) offeredCats.push(provider.category.toLowerCase().trim());
      if (provider.pricing && Array.isArray(provider.pricing)) {
        provider.pricing.forEach(p => {
          if (p.service) offeredNames.push(p.service.toLowerCase().trim());
        });
      }

      const reqName = (serviceName || '').toLowerCase().trim();
      const reqType = (serviceType || '').toLowerCase().trim();

      const offersService = 
        offeredNames.some(n => n === reqName || (reqName && n.includes(reqName)) || (reqName && reqName.includes(n))) ||
        offeredCats.some(c => c === reqType || (reqType && c.includes(reqType)) || (reqType && reqType.includes(c))) ||
        (provider.category || '').toLowerCase().trim() === reqType ||
        (provider.category || '').toLowerCase().trim() === reqName;

      if (!offersService) {
        return res.status(400).json({
          success: false,
          message: `${provider.name || 'Selected provider'} does not offer the requested service (${serviceName || serviceType}).`
        });
      }
    }

    // 6. Concurrency-safe provider-specific and service-specific Booking ID generation
    const bookingId = await generateServiceBookingId({
      provider,
      providerId: provider?._id || req.body.providerId,
      providerEmail: (provider?.email || providerEmail || '').toLowerCase().trim(),
      serviceName,
      serviceType,
      category: provider?.category
    });

    // Resolve registered provider photo from Provider or User
    let resolvedProviderPhoto = provider?.photo || '';
    if (!resolvedProviderPhoto && (providerEmail || provider?._id)) {
      const provUser = await User.findOne({ email: (provider?.email || providerEmail).toLowerCase() });
      if (provUser && provUser.profileImage) {
        resolvedProviderPhoto = provUser.profileImage;
      }
    }

    // 6. Validate pricing on backend: use authenticated provider and selected service actual configured rate
    let validatedAmount = 0;
    let matchingService = null;
    if (provider) {
      matchingService = await Service.findOne({
        providerId: provider._id,
        isAvailable: true,
        $or: [
          ...(req.body.serviceId && mongoose.Types.ObjectId.isValid(req.body.serviceId) ? [{ _id: req.body.serviceId }] : []),
          ...(serviceName ? [{ name: new RegExp(`^${escapeRegex(serviceName.trim())}$`, 'i') }] : [])
        ]
      }).lean();

      if (matchingService && typeof matchingService.price === 'number') {
        validatedAmount = matchingService.price;
      } else if (provider.pricing && Array.isArray(provider.pricing)) {
        const matchedPricing = provider.pricing.find(p =>
          (p.service && serviceName && p.service.toLowerCase().trim() === serviceName.toLowerCase().trim()) ||
          (p.service && serviceType && p.service.toLowerCase().trim() === serviceType.toLowerCase().trim())
        );
        if (matchedPricing && typeof matchedPricing.price === 'number') {
          validatedAmount = matchedPricing.price;
        }
      }

      if (!validatedAmount) {
        if (typeof provider.hourlyRate === 'number' && provider.hourlyRate > 0) {
          validatedAmount = provider.hourlyRate;
        } else if (typeof provider.rate === 'number' && provider.rate > 0) {
          validatedAmount = provider.rate;
        }
      }
    }

    if (!validatedAmount) {
      const categoryDoc = await ServiceCategory.findOne({
        status: 'Active',
        $or: [
          { name: new RegExp(`^${escapeRegex(serviceType || provider?.category || '')}$`, 'i') },
          { name: new RegExp(`^${escapeRegex(serviceName || '')}$`, 'i') }
        ]
      }).lean();
      if (categoryDoc && typeof categoryDoc.startingPrice === 'number') {
        validatedAmount = categoryDoc.startingPrice;
      }
    }

    // Dynamic fee revalidation for room count
    if (validatedAmount > 0 && req.body.rooms !== undefined && req.body.rooms !== null && req.body.rooms !== '') {
      const parsedRooms = Number(req.body.rooms);
      if (Number.isInteger(parsedRooms) && parsedRooms >= 1 && parsedRooms <= 20) {
        const unit = (matchingService?.pricingUnit || provider?.pricingUnit || '').toLowerCase();
        if (unit.includes('hour')) {
          const hours = Math.max(1, Math.min(8, Math.round(parsedRooms * 0.75)));
          validatedAmount = Math.round(validatedAmount * hours);
        } else if (unit.includes('sq.ft') || unit.includes('sqft')) {
          const area = parsedRooms * 400;
          validatedAmount = Math.round(validatedAmount * area);
        } else if (unit.includes('bhk')) {
          const mult = parsedRooms <= 1 ? 1.0 : parsedRooms === 2 ? 1.4 : parsedRooms === 3 ? 1.9 : 2.4;
          validatedAmount = Math.round(validatedAmount * mult);
        }
      }
    }

    // Persist verified provider fee. Prevent manipulated or stale frontend totals!
    const finalValidatedAmount = validatedAmount > 0 ? validatedAmount : (typeof amount === 'number' && amount > 0 ? amount : 0);

    const booking = await Booking.create({
      bookingId,
      customerName: resolvedCustomerName,
      customerEmail: resolvedCustomerEmail,
      customerPhone: resolvedCustomerPhone,
      customerAddress: resolvedCustomerAddress,
      providerId: provider?._id || (mongoose.Types.ObjectId.isValid(req.body.providerId) ? req.body.providerId : undefined),
      providerName: provider?.name || providerName,
      providerEmail: (provider?.email || providerEmail).toLowerCase(),
      providerPhone: provider?.phone || providerPhone || '',
      date: standardDate,
      time,
      serviceType: serviceType || provider?.category || 'Service',
      serviceName: serviceName || `${provider?.category || 'Standard'} Service`,
      amount: finalValidatedAmount,
      location: resolvedCustomerAddress,
      status: 'Pending',
      providerPhoto: resolvedProviderPhoto
    });

    // Update Customer Stats
    const user = await User.findOne({ email: customerEmail.toLowerCase() });
    if (user) {
      const customer = await Customer.findOne({ user: user._id });
      if (customer) {
        customer.bookingsCount += 1;
        customer.totalSpent += finalValidatedAmount;
        await customer.save();
      }
    }

    const formattedBookingId = (booking.bookingId || '').startsWith('#') ? booking.bookingId : `#${booking.bookingId}`;

    // Add Genuine Notification for Customer
    const custDedupKey = `cust_booking_${booking._id.toString()}`;
    const existingCustNotif = await Notification.findOne({ dedupKey: custDedupKey });
    if (!existingCustNotif) {
      const custNotif = await Notification.create({
        title: 'Booking Request Submitted',
        message: `Your booking ${formattedBookingId} for ${serviceName || serviceType} with ${provider?.name || providerName} has been submitted successfully.`,
        type: 'booking',
        recipientRole: 'Customer',
        recipientEmail: resolvedCustomerEmail,
        bookingId: booking._id.toString(),
        targetRoute: `/customer/bookings-and-saved?tab=bookings&id=${booking._id.toString()}`,
        dedupKey: custDedupKey
      });
      broadcastNotification(custNotif);
    }

    // Add Notification for Admin with deduplication
    const adminDedupKey = `admin_booking_${booking._id.toString()}`;
    const existingAdminNotif = await Notification.findOne({ dedupKey: adminDedupKey });
    if (!existingAdminNotif) {
      const adminNotif = await Notification.create({
        title: 'New Booking Created',
        message: `${customerName} booked ${serviceName} (₹${amount}) with ${providerName}.`,
        type: 'booking',
        recipientRole: 'Admin',
        bookingId: booking._id.toString(),
        targetRoute: `/admin/bookings?id=${booking._id.toString()}`,
        dedupKey: adminDedupKey
      });
      broadcastNotification(adminNotif);
    }

    // Notify the provider with deduplication
    const provDedupKey = `prov_booking_${booking._id.toString()}`;
    const existingProvNotif = await Notification.findOne({ dedupKey: provDedupKey });
    if (!existingProvNotif) {
      const provNotif = await Notification.create({
        title: 'New Booking Request',
        message: `You have received a new booking request from ${customerName} for ${serviceName} (₹${amount}).`,
        type: 'new_booking',
        recipientRole: 'Provider',
        recipientEmail: providerEmail.toLowerCase(),
        bookingId: booking._id.toString(),
        targetRoute: `/provider/bookings?id=${booking._id.toString()}`,
        dedupKey: provDedupKey
      });
      broadcastNotification(provNotif);
    }

    res.status(201).json({ success: true, booking });
  } catch (error) {
    next(error);
  }
});

// Get Bookings by Customer Email (Enriched with real registered provider photos)
router.get('/bookings/:email', async (req, res, next) => {
  try {
    const authHeaderEmail = req.headers['x-authenticated-email'] || req.headers['x-auth-email'];
    if (authHeaderEmail && authHeaderEmail.toLowerCase().trim() !== req.params.email.toLowerCase().trim()) {
      return res.status(403).json({ success: false, message: 'Forbidden: Access to another customer\'s private bookings is not permitted.' });
    }

    const customerUser = await User.findOne({ email: req.params.email.toLowerCase().trim() });
    if (!customerUser) {
      return res.status(404).json({ success: false, message: 'Customer user not found in database.' });
    }

    const list = await Booking.find({ customerEmail: req.params.email.toLowerCase() }).sort({ createdAt: -1 });
    
    // Look up real registered provider photos from Provider or User
    const providerEmails = [...new Set(list.map(b => (b.providerEmail || '').toLowerCase()).filter(Boolean))];
    const providers = await Provider.find({ email: { $in: providerEmails } }).lean();
    const users = await User.find({ email: { $in: providerEmails } }).lean();

    const photoMap = {};
    providers.forEach(p => {
      if (p.email && p.photo) photoMap[p.email.toLowerCase()] = p.photo;
    });
    users.forEach(u => {
      if (u.email && u.profileImage && !photoMap[u.email.toLowerCase()]) {
        photoMap[u.email.toLowerCase()] = u.profileImage;
      }
    });

    const formatted = list.map(b => {
      const bObj = b.toObject();
      const provEmail = (b.providerEmail || '').toLowerCase();
      bObj.providerPhoto = photoMap[provEmail] || b.providerPhoto || '';
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

// Real-time SSE Notification Stream for Customer
router.get('/notifications/stream/:email', (req, res) => {
  const email = (req.params.email || '').toLowerCase().trim();
  if (!email) {
    return res.status(400).json({ success: false, message: 'Customer email is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Initial connection handshake
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

// Get Notifications by Recipient Email or Admin
router.get('/notifications/:email', async (req, res, next) => {
  try {
    const list = await Notification.find({
      $or: [
        { recipientEmail: req.params.email.toLowerCase() },
        { recipientRole: 'All' },
        { recipientRole: 'Customer' }
      ]
    }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, notifications: list });
  } catch (error) {
    next(error);
  }
});

// Get Reviews by Provider ID or All
router.get('/reviews/:providerId', async (req, res, next) => {
  try {
    const query = req.params.providerId === 'all' ? {} : { providerId: req.params.providerId };
    const list = await Review.find(query);
    res.status(200).json({ success: true, reviews: list });
  } catch (error) {
    next(error);
  }
});

// Get Reviews Submitted by Customer
router.get('/reviews/customer/:email', async (req, res, next) => {
  try {
    const email = (req.params.email || '').toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Customer email is required' });
    }
    const list = await Review.find({ customerEmail: email }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, reviews: list });
  } catch (error) {
    next(error);
  }
});

// Create or Update Review for Completed Booking
router.post('/reviews', async (req, res, next) => {
  try {
    const { bookingId, providerId, customerName, customerEmail, rating, comment, serviceTaken } = req.body;

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be a number between 1 and 5 stars.' });
    }

    if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide a non-empty review comment.' });
    }

    if (!bookingId) {
      return res.status(400).json({ success: false, message: 'Booking ID is required to review a service.' });
    }

    // Find the booking
    const cleanBookingId = (typeof bookingId === 'string') ? bookingId.trim() : bookingId;
    const cleanNoHash = (typeof cleanBookingId === 'string' && cleanBookingId.startsWith('#')) ? cleanBookingId.slice(1) : cleanBookingId;

    const bookingQuery = {
      $or: [
        { bookingId: cleanBookingId },
        { bookingId: `#${cleanNoHash}` },
        { bookingId: cleanNoHash },
        ...(mongoose.Types.ObjectId.isValid(cleanBookingId) ? [{ _id: cleanBookingId }] : [])
      ]
    };
    if (customerEmail) {
      bookingQuery.customerEmail = customerEmail.toLowerCase().trim();
    }
    let booking = await Booking.findOne(bookingQuery);
    if (!booking) {
      booking = await Booking.findOne({
        $or: [
          { bookingId: cleanBookingId },
          { bookingId: `#${cleanNoHash}` },
          { bookingId: cleanNoHash },
          ...(mongoose.Types.ObjectId.isValid(cleanBookingId) ? [{ _id: cleanBookingId }] : [])
        ]
      });
    }

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // Customer email verification if provided
    if (customerEmail && booking.customerEmail && booking.customerEmail.toLowerCase().trim() !== customerEmail.toLowerCase().trim()) {
      return res.status(403).json({ success: false, message: 'You are only authorized to review your own bookings.' });
    }

    // Must be completed
    if (booking.status !== 'Completed') {
      return res.status(400).json({ success: false, message: 'Only completed bookings can be reviewed.' });
    }

    // Determine Provider document
    let provider = null;
    if (providerId && mongoose.Types.ObjectId.isValid(providerId)) {
      provider = await Provider.findById(providerId);
      if (!provider) {
        provider = await Provider.findOne({ user: providerId });
      }
    }
    if (!provider && booking.providerEmail) {
      provider = await Provider.findOne({ email: booking.providerEmail.toLowerCase().trim() });
      if (!provider) {
        const provUser = await User.findOne({ email: booking.providerEmail.toLowerCase().trim() });
        if (provUser) {
          provider = await Provider.findOne({ user: provUser._id });
        }
      }
    }

    const resolvedProviderId = provider ? provider._id.toString() : (providerId || '');
    const resolvedCustomerEmail = (customerEmail || booking.customerEmail || '').toLowerCase().trim();
    const resolvedCustomerName = customerName || booking.customerName || 'Customer';
    const resolvedService = serviceTaken || booking.serviceName || booking.serviceType || 'Service';

    // Prevent duplicate: check if review for this bookingId already exists
    let review = await Review.findOne({
      $or: [
        { bookingId: booking.bookingId },
        { bookingId: booking._id.toString() }
      ]
    });

    if (review) {
      // Update existing review
      review.rating = numRating;
      review.comment = comment.trim();
      review.serviceTaken = resolvedService;
      if (resolvedCustomerEmail) review.customerEmail = resolvedCustomerEmail;
      if (resolvedProviderId) review.providerId = resolvedProviderId;
      await review.save();
    } else {
      // Create new review
      review = await Review.create({
        bookingId: booking.bookingId,
        providerId: resolvedProviderId,
        customerEmail: resolvedCustomerEmail,
        customerName: resolvedCustomerName,
        rating: numRating,
        comment: comment.trim(),
        serviceTaken: resolvedService
      });
    }

    // Recalculate provider rating and reviewsCount in MongoDB
    if (provider) {
      const provReviews = await Review.find({
        $or: [
          { providerId: provider._id.toString() },
          ...(provider.user ? [{ providerId: provider.user.toString() }] : [])
        ]
      });
      const count = provReviews.length;
      const sum = provReviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
      const avg = count > 0 ? Number((sum / count).toFixed(1)) : 5.0;
      provider.rating = avg;
      provider.reviewsCount = count;
      await provider.save();
    }

    // Deduplicated Notification to Provider
    if (provider) {
      const notifKey = `provider_review_${review._id.toString()}`;
      const existingNotif = await Notification.findOne({ dedupKey: notifKey });
      if (!existingNotif) {
        const provNotif = await Notification.create({
          dedupKey: notifKey,
          title: 'New Customer Review',
          message: `${resolvedCustomerName} rated you ${numRating} stars for ${resolvedService}: "${comment.trim().substring(0, 50)}${comment.trim().length > 50 ? '...' : ''}"`,
          type: 'review',
          recipientRole: 'Provider',
          recipientEmail: provider.email || booking.providerEmail,
          read: false
        });
        broadcastNotification(provNotif);
      }
    }

    // Deduplicated Notification to Customer
    const custReviewKey = `cust_review_${review._id.toString()}`;
    const existingCustReview = await Notification.findOne({ dedupKey: custReviewKey });
    if (!existingCustReview) {
      const custNotif = await Notification.create({
        dedupKey: custReviewKey,
        title: 'Review Published',
        message: `Thank you for reviewing ${booking.providerName || 'your provider'} for ${resolvedService}! Your ${numRating}-star rating has been published.`,
        type: 'review',
        recipientRole: 'Customer',
        recipientEmail: resolvedCustomerEmail,
        bookingId: booking._id.toString(),
        targetRoute: '/customer/bookings-and-saved?tab=bookings',
        read: false
      });
      broadcastNotification(custNotif);
    }

    // Deduplicated Notification to Admin
    const adminNotifKey = `admin_review_${review._id.toString()}`;
    const existingAdminNotif = await Notification.findOne({ dedupKey: adminNotifKey });
    if (!existingAdminNotif) {
      const adminNotif = await Notification.create({
        dedupKey: adminNotifKey,
        title: 'New Review Submitted',
        message: `${resolvedCustomerName} left a ${numRating}-star review for ${booking.providerName || 'Provider'}.`,
        type: 'review',
        recipientRole: 'Admin',
        read: false
      });
      broadcastNotification(adminNotif);
    }

    res.status(201).json({
      success: true,
      review,
      providerRating: provider ? provider.rating : null,
      reviewsCount: provider ? provider.reviewsCount : null
    });
  } catch (error) {
    next(error);
  }
});

// ─── Customer Profile Routes ───────────────────────────────────────────────

// Get Customer Profile by Email (loads actual MongoDB User and Customer documents)
router.get('/profile/:email', async (req, res, next) => {
  try {
    const authHeaderEmail = req.headers['x-authenticated-email'] || req.headers['x-auth-email'];
    if (authHeaderEmail && authHeaderEmail.toLowerCase().trim() !== req.params.email.toLowerCase().trim()) {
      return res.status(403).json({ success: false, message: 'Forbidden: Access to another customer\'s private profile is not permitted.' });
    }

    const user = await User.findOne({ email: req.params.email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Customer user not found in database.' });
    }

    let customer = await Customer.findOne({ $or: [{ user: user._id }, { email: user.email.toLowerCase() }] });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer profile not found in database.' });
    }

    const completedBookings = await Booking.countDocuments({
      customerEmail: user.email.toLowerCase(),
      status: 'Completed'
    });

    const profile = {
      id: customer._id,
      userId: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      photo: customer.photo || user.profileImage || '',
      profileImage: customer.photo || user.profileImage || '',
      city: customer.city || 'Coimbatore',
      address: customer.address || '',
      state: customer.state || 'Tamil Nadu',
      pincode: customer.pincode || '641002',
      savedAddresses: customer.savedAddresses || [],
      savedProviders: customer.savedProviders || [],
      stats: {
        totalBookings: customer.bookingsCount || 0,
        completedServices: completedBookings,
        savedProviders: customer.savedProviders?.length || 0,
        totalSpent: customer.totalSpent || 0
      }
    };

    res.status(200).json({
      success: true,
      customer: profile,
      profile: profile
    });
  } catch (error) {
    next(error);
  }
});

// ─── Customer Saved Providers Routes (persisted in MongoDB) ─────────────────

// Get Saved Provider IDs for a customer (Sanitized against MongoDB Single Source of Truth)
router.get('/saved/:email', async (req, res, next) => {
  try {
    const authHeaderEmail = req.headers['x-authenticated-email'] || req.headers['x-auth-email'];
    if (authHeaderEmail && authHeaderEmail.toLowerCase().trim() !== req.params.email.toLowerCase().trim()) {
      return res.status(403).json({ success: false, message: 'Forbidden: Access to another customer\'s private saved list is not permitted.' });
    }

    const user = await User.findOne({ email: req.params.email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const customer = await Customer.findOne({ user: user._id });
    const saved = customer?.savedProviders || [];
    // Single Source of Truth: Only return IDs of currently existing, approved providers in MongoDB
    const validProviders = await Provider.find({ _id: { $in: saved }, status: 'Approved' }).select('_id').lean();
    const validSavedIds = validProviders.map(p => p._id.toString());
    res.status(200).json({ success: true, savedProviders: validSavedIds });
  } catch (error) {
    next(error);
  }
});

// Toggle Saved Provider ID for a customer
router.post('/saved/toggle', async (req, res, next) => {
  try {
    const { email, providerId } = req.body;
    if (!email || !providerId) {
      return res.status(400).json({ success: false, message: 'Email and providerId are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let customer = await Customer.findOne({ user: user._id });
    if (!customer) {
      customer = await Customer.create({
        user: user._id,
        name: user.fullName || '',
        email: user.email.toLowerCase(),
        phone: user.phone || '',
        city: 'Coimbatore',
        address: '',
        state: 'Tamil Nadu',
        pincode: '641002',
        savedAddresses: [],
        savedProviders: []
      });
    }

    const provIdStr = String(providerId);
    let updated;
    if (customer.savedProviders.includes(provIdStr)) {
      customer.savedProviders = customer.savedProviders.filter(id => id !== provIdStr);
      updated = customer.savedProviders;
    } else {
      customer.savedProviders.push(provIdStr);
      updated = customer.savedProviders;
    }
    await customer.save();

    res.status(200).json({ success: true, savedProviders: updated });
  } catch (error) {
    next(error);
  }
});

// ─── Customer Notifications Routes ──────────────────────────────────────────

// Mark all notifications read for customer
router.post('/notifications/read', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    const normalized = email.toLowerCase();
    await Notification.updateMany(
      {
        $or: [
          { recipientEmail: normalized },
          { recipientRole: 'All' },
          { recipientRole: 'Customer' }
        ]
      },
      { read: true }
    );
    const list = await Notification.find({
      $or: [
        { recipientEmail: normalized },
        { recipientRole: 'All' },
        { recipientRole: 'Customer' }
      ]
    }).sort({ createdAt: -1 });

    res.status(200).json({ success: true, notifications: list });
  } catch (error) {
    next(error);
  }
});

// Mark single notification read
router.post('/notifications/read/:id', async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    res.status(200).json({ success: true, notification });
  } catch (error) {
    next(error);
  }
});

export default router;
