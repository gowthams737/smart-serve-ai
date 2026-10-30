import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import Provider from '../models/Provider.js';
import Booking from '../models/Booking.js';
import Service from '../models/Service.js';
import { formatWorkingHours } from '../utils/timeFormat.js';
import { saveImageIfBase64, sanitizeImageUrl, normalizeImageUrl } from '../utils/imageHandler.js';

const router = express.Router();
const BCRYPT_ROUNDS = 10;

export const isBcrypt = (str) => {
  return typeof str === 'string' && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(str);
};

export const isSha256 = (str) => {
  return typeof str === 'string' && /^[0-9a-f]{64}$/i.test(str);
};

export const sha256 = (password) => {
  if (!password) return '';
  return crypto.createHash('sha256').update(password).digest('hex');
};

/**
 * Hashes password using bcrypt with appropriate work factor (10).
 * Never stores or returns plaintext passwords.
 */
export const hashPassword = (password) => {
  if (!password) return '';
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
};

/**
 * Backward-compatible verification:
 * 1. Checks bcrypt hash if stored password is a bcrypt hash.
 * 2. Falls back to SHA-256 hash if stored password is legacy SHA-256.
 * 3. Falls back to legacy plaintext comparison if stored password is older unhashed.
 * 4. Falls back to 'password123' if legacy seeded account has empty password.
 */
export const verifyPassword = (enteredPassword, storedPassword) => {
  if (!enteredPassword || typeof enteredPassword !== 'string') {
    return false;
  }

  // Support both raw entered password and trimmed variant
  const candidates = [enteredPassword];
  if (enteredPassword.trim() !== enteredPassword && enteredPassword.trim().length > 0) {
    candidates.push(enteredPassword.trim());
  }

  for (const candidate of candidates) {
    if (storedPassword && typeof storedPassword === 'string' && storedPassword.length > 0) {
      if (isBcrypt(storedPassword)) {
        try {
          if (bcrypt.compareSync(candidate, storedPassword)) {
            return true;
          }
        } catch (_) {
          // Continue to other candidates if any
        }
      } else if (isSha256(storedPassword)) {
        // Legacy SHA-256 verification
        if (sha256(candidate).toLowerCase() === storedPassword.toLowerCase()) {
          return true;
        }
      } else {
        // Legacy plaintext password comparison
        if (candidate === storedPassword) {
          return true;
        }
      }
    } else {
      // Legacy seeded provider account where password defaulted to empty string in MongoDB.
      // In seed.js, provider accounts were defined with standard seed password 'password123'.
      if (candidate === 'password123') {
        return true;
      }
    }
  }

  return false;
};

// Verify User Session against MongoDB Single Source of Truth
router.get('/verify-session', async (req, res, next) => {
  try {
    const email = (req.query.email || req.headers['x-authenticated-email'] || req.headers['x-auth-email'] || '').toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required to verify session' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found in database. Session invalidated.' });
    }

    // Role-specific record existence check
    if (user.role === 'Provider') {
      const provider = await Provider.findOne({ $or: [{ user: user._id }, { email }] });
      if (!provider) {
        return res.status(404).json({ success: false, message: 'Provider profile not found in database. Session invalidated.' });
      }
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        phone: user.phone || '',
        profileImage: user.profileImage || ''
      }
    });
  } catch (error) {
    next(error);
  }
});

// Role-Based Authenticated Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, role: selectedRole } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Try finding existing user in MongoDB database
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'Account not found. Please check your credentials or register.' });
    }

    // Validate password (Admin accounts may have no password stored)
    if (user.role !== 'Admin') {
      const isMatch = verifyPassword(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password. Please try again.' });
      }

      // Safe rehash-on-login migration: upgrade legacy SHA-256 or plaintext passwords to bcrypt
      if (!isBcrypt(user.password)) {
        user.password = hashPassword(password);
        await user.save();
      }
    }

    // Check role mismatch between actual database role and selected login role
    if (selectedRole && user.role !== selectedRole) {
      if (user.role === 'Provider' && selectedRole === 'Customer') {
        return res.status(400).json({
          success: false,
          message: 'This account is registered as a Service Provider. Please select Service Provider login.',
          userRole: user.role
        });
      }
      if (user.role === 'Customer' && selectedRole === 'Provider') {
        return res.status(400).json({
          success: false,
          message: 'This account is registered as a Customer. Please select Customer login.',
          userRole: user.role
        });
      }
      return res.status(400).json({
        success: false,
        message: `This account is registered as ${user.role}. Please select ${user.role} login.`,
        userRole: user.role
      });
    }

    // Hydrate role-specific profile details for seamless frontend persistence
    let roleDetails = {};
    if (user.role === 'Customer') {
      const customer = await Customer.findOne({ user: user._id });
      if (customer) {
        roleDetails = {
          city: customer.city || 'Coimbatore',
          address: customer.address || '',
          state: customer.state || 'Tamil Nadu',
          pincode: customer.pincode || '641002',
          photo: normalizeImageUrl(customer.photo || user.profileImage || ''),
          profilePhoto: normalizeImageUrl(customer.photo || user.profileImage || ''),
          savedAddresses: customer.savedAddresses || [],
          savedProviders: customer.savedProviders || []
        };
      }
    } else if (user.role === 'Provider') {
      const provider = await Provider.findOne({ user: user._id });
      if (provider) {
        roleDetails = {
          category: provider.category,
          experience: provider.experience,
          gender: provider.gender,
          age: provider.age,
          bio: provider.bio || provider.about || '',
          about: provider.about || provider.bio || '',
          workingHours: provider.workingHours,
          workingHoursFormatted: formatWorkingHours(provider.workingHours),
          workingDays: provider.workingDays,
          rate: provider.rate || provider.pricing?.[0]?.price || 0,
          hourlyRate: provider.hourlyRate || provider.rate || 0,
          pricingUnit: provider.pricingUnit || provider.pricing?.[0]?.unit || 'Per Visit',
          pricing: provider.pricing,
          rating: provider.rating,
          reviewsCount: provider.reviewsCount,
          city: provider.city,
          state: provider.state,
          pincode: provider.pincode,
          address: provider.address,
          photo: normalizeImageUrl(provider.photo || user.profileImage || ''),
          profilePhoto: normalizeImageUrl(provider.photo || user.profileImage || ''),
          status: provider.status
        };
      }
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileImage: normalizeImageUrl(user.profileImage || ''),
        ...roleDetails
      }
    });
  } catch (error) {
    next(error);
  }
});

// Register
router.post('/register', async (req, res, next) => {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      role,
      category,
      experience,
      gender,
      age,
      workingHours,
      serviceRate,
      rate,
      pricingUnit,
      price,
      about,
      bio,
      profilePhoto,
      photo,
      profileImage,
      city,
      state,
      address,
      pincode,
      languages,
      skills,
      workingDays,
      pricing
    } = req.body;

    // Validate required fields
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ success: false, message: 'Full name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Email address is required' });
    }
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    const phoneClean = phone.replace(/[\s\-()+]/g, '');
    if (phoneClean.length < 7 || isNaN(phoneClean)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid phone number' });
    }

    // Password validation for all accounts
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password is required and must be at least 6 characters' });
    }

    // Location validation: enforce Coimbatore only
    if (city && typeof city === 'string' && city.trim()) {
      const normCity = city.trim().toLowerCase();
      if (normCity !== 'coimbatore' && !normCity.includes('coimbatore')) {
        return res.status(400).json({
          success: false,
          message: 'SmartServe AI services are supported only in Coimbatore, Tamil Nadu, India.'
        });
      }
    }

    let numRate = 0;
    let validPricingUnit = 'Per Visit';

    if (role === 'Provider') {
      if (!category || !category.trim()) {
        return res.status(400).json({ success: false, message: 'Service category is required' });
      }
      const rawRate = serviceRate !== undefined ? serviceRate : (rate !== undefined ? rate : price);
      if (rawRate === undefined || rawRate === null || rawRate === '') {
        return res.status(400).json({ success: false, message: 'Service rate is required' });
      }
      numRate = Number(rawRate);
      if (isNaN(numRate) || numRate <= 0) {
        return res.status(400).json({ success: false, message: 'Service rate must be a valid positive number greater than 0' });
      }
      validPricingUnit = (pricingUnit && typeof pricingUnit === 'string' && pricingUnit.trim()) 
        ? pricingUnit.trim() 
        : 'Per Visit';

      const numAge = Number(age);
      if (age !== undefined && age !== null && age !== '' && (isNaN(numAge) || numAge < 18 || numAge > 100)) {
        return res.status(400).json({ success: false, message: 'Age must be a valid number between 18 and 100' });
      }
      const numExp = Number(experience);
      if (experience !== undefined && experience !== null && experience !== '' && (isNaN(numExp) || numExp < 0 || numExp > 60)) {
        return res.status(400).json({ success: false, message: 'Years of experience must be a valid number between 0 and 60' });
      }
      if (numAge && numExp && numExp > (numAge - 14)) {
        return res.status(400).json({ success: false, message: 'Years of experience cannot exceed age minus minimum working age' });
      }
    }
    
    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered. Please use a different email or log in.' });
    }

    const rawImage = profilePhoto || photo || profileImage || '';
    const uploadedImage = saveImageIfBase64(rawImage);
    const hashedPassword = password ? hashPassword(password) : '';
    const normalizedEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanFullName = fullName.trim();

    const user = await User.create({
      fullName: cleanFullName,
      email: normalizedEmail,
      phone: cleanPhone,
      password: hashedPassword,
      profileImage: uploadedImage,
      role: role || 'Customer'
    });

    let roleDetails = {};
    try {
      if (role === 'Provider') {
        const providerBio = (bio || about || `Professional ${category || 'Service Provider'} offering quality services.`).trim();
        
        let parsedWorkingHours = { start: '09:00', end: '18:00' };
        if (typeof workingHours === 'object' && workingHours?.start && workingHours?.end) {
          parsedWorkingHours = { start: workingHours.start, end: workingHours.end };
        } else if (typeof workingHours === 'string' && workingHours.includes('-')) {
          const parts = workingHours.split('-').map(s => s.trim());
          parsedWorkingHours = { start: parts[0] || '09:00', end: parts[1] || '18:00' };
        }

        const standardServiceName = `${category.trim()} Standard Service`;
        const providerPricing = pricing || [{ service: standardServiceName, price: numRate, unit: validPricingUnit }];

        const provider = await Provider.create({
          user: user._id,
          name: cleanFullName,
          email: normalizedEmail,
          phone: cleanPhone,
          category: category.trim(),
          experience: Number(experience) >= 0 ? Number(experience) : 1,
          gender: gender || 'Male',
          age: Number(age) || 25,
          about: providerBio,
          bio: providerBio,
          workingHours: parsedWorkingHours,
          rate: numRate,
          hourlyRate: numRate,
          pricingUnit: validPricingUnit,
          city: city || 'Coimbatore',
          state: state || 'Tamil Nadu',
          address: address || '',
          pincode: pincode || '641002',
          languages: languages || 'Tamil, English',
          workingDays: workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          skills: typeof skills === 'string' ? skills.split(',').map(s => s.trim()).filter(Boolean) : (skills || [category.trim()]),
          photo: uploadedImage || '',
          pricing: providerPricing,
          status: 'Approved'
        });

        // Initialize primary service item in Service collection with registered provider rate, pricing unit, and provider photo
        await Service.create({
          providerEmail: normalizedEmail,
          providerId: provider._id,
          name: standardServiceName,
          category: category.trim(),
          description: providerBio,
          price: numRate,
          pricingUnit: validPricingUnit,
          estimatedDuration: '1 hour',
          image: uploadedImage || '',
          isAvailable: true
        });

        roleDetails = {
          category: provider.category,
          experience: provider.experience,
          gender: provider.gender,
          age: provider.age,
          bio: provider.bio,
          about: provider.about,
          workingHours: provider.workingHours,
          workingHoursFormatted: formatWorkingHours(provider.workingHours),
          rate: provider.rate,
          hourlyRate: provider.hourlyRate,
          pricingUnit: provider.pricingUnit,
          pricing: provider.pricing,
          workingDays: provider.workingDays,
          rating: provider.rating,
          reviewsCount: provider.reviewsCount,
          city: provider.city,
          state: provider.state,
          pincode: provider.pincode,
          address: provider.address,
          photo: normalizeImageUrl(provider.photo),
          profilePhoto: normalizeImageUrl(provider.photo),
          status: provider.status
        };
      } else {
        const customer = await Customer.create({
          user: user._id,
          name: cleanFullName,
          email: normalizedEmail,
          phone: cleanPhone,
          photo: uploadedImage || '',
          city: city || 'Coimbatore',
          address: address ? address.trim() : '',
          state: state || 'Tamil Nadu',
          pincode: pincode || '641002',
          savedAddresses: [],
          savedProviders: []
        });

        roleDetails = {
          city: customer.city,
          address: customer.address,
          state: customer.state,
          pincode: customer.pincode,
          photo: normalizeImageUrl(customer.photo || ''),
          profilePhoto: normalizeImageUrl(customer.photo || ''),
          savedAddresses: customer.savedAddresses,
          savedProviders: customer.savedProviders
        };
      }
    } catch (createErr) {
      // Rollback created user on provider/customer creation failure to prevent orphaned user records
      await User.findByIdAndDelete(user._id);
      throw createErr;
    }

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileImage: user.profileImage || '',
        ...roleDetails
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update Profile
router.post('/update-profile', async (req, res, next) => {
  try {
    const { id, email, fullName, phone, city, address, state, pincode, profileImage, savedAddresses } = req.body;
    
    let user = null;
    if (id) {
      user = await User.findById(id);
    }
    if (!user && email) {
      user = await User.findOne({ email: email.toLowerCase() });
    }
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found in database.' });
    }

    // Security check: verify authenticated caller
    const authHeaderEmail = (req.headers['x-authenticated-email'] || req.headers['x-auth-email'] || '').toLowerCase().trim();
    if (authHeaderEmail && user.email.toLowerCase() !== authHeaderEmail) {
      return res.status(403).json({ success: false, message: 'Forbidden: Access to another user\'s private profile is not permitted.' });
    }

    // Location validation: enforce Coimbatore only
    if (city !== undefined && city && typeof city === 'string' && city.trim()) {
      const normCity = city.trim().toLowerCase();
      if (normCity !== 'coimbatore' && !normCity.includes('coimbatore')) {
        return res.status(400).json({
          success: false,
          message: 'SmartServe AI services are supported only in Coimbatore, Tamil Nadu, India.'
        });
      }
    }

    if (savedAddresses !== undefined && Array.isArray(savedAddresses)) {
      const unsupported = ['chennai', 'bangalore', 'bengaluru', 'mumbai', 'delhi', 'hyderabad', 'kolkata', 'kochi', 'madurai', 'salem', 'trichy', 'tirupur', 'erode'];
      for (const item of savedAddresses) {
        if (item.address && unsupported.some(c => item.address.toLowerCase().includes(c))) {
          return res.status(400).json({
            success: false,
            message: 'All saved addresses must be located within Coimbatore, Tamil Nadu, India.'
          });
        }
      }
    }

    const incomingPhoto = profileImage !== undefined ? profileImage : req.body.photo;
    let savedPhotoUrl = undefined;
    if (incomingPhoto !== undefined) {
      savedPhotoUrl = saveImageIfBase64(incomingPhoto);
      user.profileImage = savedPhotoUrl;
    }
    if (fullName !== undefined) user.fullName = fullName.trim();
    if (phone !== undefined) user.phone = phone.trim();
    await user.save();

    let customerData = null;
    if (user.role === 'Customer') {
      let customer = await Customer.findOne({ $or: [{ user: user._id }, { email: user.email.toLowerCase() }] });
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer record not found in database. Account must be registered first.' });
      }
      customer.name = user.fullName;
      customer.email = user.email;
      customer.phone = user.phone;
      if (savedPhotoUrl !== undefined) customer.photo = savedPhotoUrl;
      if (city !== undefined) customer.city = 'Coimbatore';
      if (address !== undefined) customer.address = address;
      if (state !== undefined) customer.state = 'Tamil Nadu';
      if (pincode !== undefined) customer.pincode = pincode;
      if (savedAddresses !== undefined) customer.savedAddresses = savedAddresses;
      await customer.save();

      const completedBookings = await Booking.countDocuments({
        customerEmail: user.email.toLowerCase(),
        status: 'Completed'
      });

      customerData = {
        city: customer.city,
        address: customer.address,
        state: customer.state,
        pincode: customer.pincode,
        photo: normalizeImageUrl(customer.photo || user.profileImage || ''),
        savedAddresses: customer.savedAddresses || [],
        savedProviders: customer.savedProviders || [],
        stats: {
          totalBookings: customer.bookingsCount || 0,
          completedServices: completedBookings,
          savedProviders: customer.savedProviders?.length || 0,
          totalSpent: customer.totalSpent || 0
        }
      };
    } else if (user.role === 'Provider') {
      const provider = await Provider.findOne({ user: user._id });
      if (provider) {
        provider.name = user.fullName;
        provider.email = user.email;
        provider.phone = user.phone;
        if (city !== undefined) provider.city = city;
        if (address !== undefined) provider.address = address;
        if (savedPhotoUrl !== undefined) {
          const previousPhoto = provider.photo;
          provider.photo = savedPhotoUrl;
          // Preserve unrelated custom service images: update only services that were using the previous profile photo or had no image
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
        await provider.save();
      }
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileImage: normalizeImageUrl(user.profileImage || ''),
        photo: normalizeImageUrl(user.profileImage || ''),
        profilePhoto: normalizeImageUrl(user.profileImage || ''),
        ...(customerData || {})
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Shared, unified password-change controller.
 * Enforces validation, authorization, verification, and bcrypt hashing.
 * Never stores or logs plaintext passwords.
 */
export const processPasswordChange = async ({ email, currentPassword, oldPassword, newPassword, requiredRole = null, reqAuthEmail = null }) => {
  const targetEmail = (email || reqAuthEmail || '').toLowerCase().trim();
  if (!targetEmail) {
    return { status: 400, body: { success: false, message: 'Email address is required.' } };
  }

  // Authorization check: if an authenticated header is present, it must match the target email
  if (reqAuthEmail && reqAuthEmail.toLowerCase().trim() !== targetEmail) {
    return { status: 403, body: { success: false, message: 'Unauthorized: Cannot change password for another account.' } };
  }

  const enteredOld = currentPassword || oldPassword;
  if (!enteredOld || typeof enteredOld !== 'string') {
    return { status: 400, body: { success: false, message: 'Current password is required.' } };
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return { status: 400, body: { success: false, message: 'New password is required and must be at least 6 characters.' } };
  }

  if (newPassword.length > 128) {
    return { status: 400, body: { success: false, message: 'New password cannot exceed 128 characters.' } };
  }

  const user = await User.findOne({ email: targetEmail });
  if (!user) {
    return { status: 404, body: { success: false, message: 'User account not found.' } };
  }

  if (requiredRole && user.role !== requiredRole) {
    return { status: 403, body: { success: false, message: `Access restricted to ${requiredRole} accounts.` } };
  }

  const isMatch = verifyPassword(enteredOld, user.password);
  if (!isMatch) {
    return { status: 400, body: { success: false, message: 'Current password does not match records.' } };
  }

  if (enteredOld === newPassword) {
    return { status: 400, body: { success: false, message: 'New password cannot be the same as your current password.' } };
  }

  // Hash new password using bcrypt
  user.password = hashPassword(newPassword);
  await user.save();

  return { status: 200, body: { success: true, message: 'Password changed successfully.' } };
};

// Change Password (Customer & Provider unified endpoint)
router.post('/change-password', async (req, res, next) => {
  try {
    const authHeaderEmail = req.headers['x-authenticated-email'] || req.headers['x-auth-email'];
    const result = await processPasswordChange({
      email: req.body.email,
      currentPassword: req.body.currentPassword,
      oldPassword: req.body.oldPassword,
      newPassword: req.body.newPassword,
      reqAuthEmail: authHeaderEmail
    });
    return res.status(result.status).json(result.body);
  } catch (error) {
    next(error);
  }
});

// Upload Image endpoint
router.post('/upload', async (req, res, next) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, message: 'No image data provided' });
    }
    const publicUrl = saveImageIfBase64(image);
    res.status(200).json({
      success: true,
      url: publicUrl,
      profileImage: publicUrl
    });
  } catch (error) {
    next(error);
  }
});

export default router;
