import mongoose from 'mongoose';
import Counter from '../models/Counter.js';
import Booking from '../models/Booking.js';
import Provider from '../models/Provider.js';
import User from '../models/User.js';

/**
 * Returns a canonical, consistent service identifier key for counter tracking.
 * Examples:
 * - Electrical Work / Electrician -> 'electrical'
 * - Plumbing / Plumber -> 'plumbing'
 * - Home Cleaning / Deep Cleaning -> 'cleaning'
 */
export function getServiceKey(serviceName, serviceType, category, serviceId) {
  if (serviceId && typeof serviceId === 'string' && serviceId.trim()) {
    return serviceId.trim();
  }
  const text = `${serviceName || ''} ${serviceType || ''} ${category || ''}`.trim().toLowerCase();

  if (text.includes('electr')) return 'electrical';
  if (text.includes('plumb')) return 'plumbing';
  if (text.includes('clean')) return 'cleaning';
  if (text.includes('paint')) return 'painting';
  if (text.includes('pest')) return 'pest_control';
  if (text.includes('carpent')) return 'carpentry';
  if (text.includes('ac ') || text.includes('air cond') || text.startsWith('ac') || text.includes('appliance')) return 'ac_repair';
  if (text.includes('refriger')) return 'refrigerator';
  if (text.includes('wash')) return 'washing_machine';
  if (text.includes('water') || text.includes('ro ')) return 'ro_purifier';
  if (text.includes('garden')) return 'gardening';
  if (text.includes('beaut')) return 'beautician';
  if (text.includes('interior')) return 'interior_designer';

  // Fallback: sanitized alphanumeric key
  const fallback = (serviceName || serviceType || category || 'service')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return fallback || 'general_service';
}

/**
 * Resolves a canonical, persistent string identifier for a provider.
 */
export async function getCanonicalProviderKey(providerRef, providerEmail) {
  if (providerRef && typeof providerRef === 'object') {
    if (providerRef._id) return providerRef._id.toString();
    if (providerRef.id) return String(providerRef.id);
  }

  const rawKey = (typeof providerRef === 'string' && providerRef.trim())
    ? providerRef.trim()
    : (providerEmail ? providerEmail.toLowerCase().trim() : '');

  if (!rawKey) return 'default_provider';

  // If it's already an ObjectId format
  if (mongoose.Types.ObjectId.isValid(rawKey) && rawKey.length === 24) {
    return rawKey;
  }

  // If it's an email, look up corresponding Provider document
  if (rawKey.includes('@')) {
    try {
      const p = await Provider.findOne({ email: rawKey.toLowerCase() });
      if (p && p._id) return p._id.toString();

      const u = await User.findOne({ email: rawKey.toLowerCase() });
      if (u) {
        const pu = await Provider.findOne({ user: u._id });
        if (pu && pu._id) return pu._id.toString();
      }
    } catch (_) {}
    return rawKey.toLowerCase();
  }

  return rawKey;
}

/**
 * Generates an atomic, concurrency-safe, persistent provider-specific and service-specific numeric-only booking ID.
 * Format: '#' + two-digit sequential number (e.g. #01, #02, #03, #10)
 *
 * Strictly numeric: does NOT contain service letters like E, P, or C.
 * Sequence is independently maintained for each provider and each service.
 * Supports beyond 99 without truncating or reusing numbers (e.g. #100, #101).
 */
export async function generateServiceBookingId(providerOrOptions, maybeServiceName, maybeServiceType, maybeCategory) {
  let providerRef = null;
  let providerEmail = null;
  let serviceName = null;
  let serviceType = null;
  let category = null;
  let serviceId = null;

  if (
    providerOrOptions &&
    typeof providerOrOptions === 'object' &&
    !providerOrOptions._id &&
    (providerOrOptions.provider || providerOrOptions.providerId || providerOrOptions.providerEmail || providerOrOptions.serviceName)
  ) {
    // Options object format
    providerRef = providerOrOptions.provider || providerOrOptions.providerId || providerOrOptions.providerEmail;
    providerEmail = providerOrOptions.providerEmail || (providerOrOptions.provider ? providerOrOptions.provider.email : null);
    serviceName = providerOrOptions.serviceName;
    serviceType = providerOrOptions.serviceType;
    category = providerOrOptions.category;
    serviceId = providerOrOptions.serviceId;
  } else {
    // Positional format
    if (
      arguments.length >= 2 &&
      (typeof providerOrOptions === 'object' || (typeof providerOrOptions === 'string' && (providerOrOptions.includes('@') || providerOrOptions.startsWith('prov'))))
    ) {
      providerRef = providerOrOptions;
      if (typeof providerOrOptions === 'string' && providerOrOptions.includes('@')) {
        providerEmail = providerOrOptions;
      } else if (providerOrOptions && typeof providerOrOptions === 'object') {
        providerEmail = providerOrOptions.email;
      }
      serviceName = maybeServiceName;
      serviceType = maybeServiceType;
      category = maybeCategory;
    } else {
      // Legacy signature where first arg was serviceName
      serviceName = providerOrOptions;
      serviceType = maybeServiceName;
      category = maybeServiceType;
    }
  }

  const providerKey = await getCanonicalProviderKey(providerRef, providerEmail);
  const serviceKey = getServiceKey(serviceName, serviceType, category, serviceId);

  // Counter document ID keyed by BOTH provider ID and service ID
  const counterKey = `${providerKey}_${serviceKey}`;

  while (true) {
    // Atomic increment in MongoDB
    const counterDoc = await Counter.findByIdAndUpdate(
      counterKey,
      {
        $inc: { seq: 1 },
        $setOnInsert: { providerId: String(providerKey), serviceId: String(serviceKey) }
      },
      { new: true, upsert: true }
    );

    const numStr = String(counterDoc.seq).padStart(2, '0');
    const candidateId = `#${numStr}`;

    // Verify candidate ID doesn't already exist for THIS provider and THIS service
    const providerFilter = [];
    if (providerEmail) {
      providerFilter.push({ providerEmail: providerEmail.toLowerCase().trim() });
    }
    if (mongoose.Types.ObjectId.isValid(providerKey)) {
      providerFilter.push({ providerId: providerKey });
    }

    if (providerFilter.length > 0) {
      const serviceConditions = [];
      if (serviceType) {
        serviceConditions.push({ serviceType: new RegExp(`^${serviceType.trim()}$`, 'i') });
      }
      if (serviceName) {
        serviceConditions.push({ serviceName: new RegExp(`^${serviceName.trim()}$`, 'i') });
      }

      const exists = await Booking.findOne({
        bookingId: candidateId,
        $or: providerFilter,
        ...(serviceConditions.length > 0 ? { $and: [{ $or: serviceConditions }] } : {})
      });

      if (exists) {
        continue;
      }
    }

    return candidateId;
  }
}
