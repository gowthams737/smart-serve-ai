const CUSTOMER_KEY = 'smartserve_customer';
const CUSTOMER_BOOKINGS_KEY = 'smartserve_customer_bookings';
const CUSTOMER_SAVED_KEY = 'smartserve_customer_saved';
const CUSTOMER_NOTIFICATIONS_KEY = 'smartserve_customer_notifications';

// ─── SERVICE CATEGORIES ────────────────────────────────
export const serviceCategories = [
  {
    id: 'cat-1', name: 'Electrician', icon: '⚡',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500',
    startingPrice: 350, rating: 4.6, duration: 'Per Hour',
    description: 'Wiring, switches, fan installation, short circuit repair and more.',
    color: '#f59e0b'
  },
  {
    id: 'cat-2', name: 'Plumber', icon: '🔧',
    image: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=500',
    startingPrice: 299, rating: 4.5, duration: 'Per Visit',
    description: 'Pipe fitting, leak repair, tap installation, drainage solutions.',
    color: '#3b82f6'
  },
  {
    id: 'cat-3', name: 'Carpenter', icon: '🪚',
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=500',
    startingPrice: 399, rating: 4.7, duration: 'Per Hour',
    description: 'Furniture repair, cabinet making, door fitting, woodwork.',
    color: '#a16207'
  },
  {
    id: 'cat-4', name: 'Painter', icon: '🎨',
    image: 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=500',
    startingPrice: 15, rating: 4.4, duration: 'Per Sq.Ft',
    description: 'Interior & exterior painting, texture, waterproofing.',
    color: '#8b5cf6'
  },
  {
    id: 'cat-5', name: 'AC Repair', icon: '❄️',
    image: 'https://images.unsplash.com/photo-1631545806609-eef17de69bfa?w=500',
    startingPrice: 499, rating: 4.5, duration: 'Per Visit',
    description: 'AC servicing, gas refill, installation, deep cleaning.',
    color: '#06b6d4'
  },
  {
    id: 'cat-6', name: 'Refrigerator Repair', icon: '🧊',
    image: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=500',
    startingPrice: 349, rating: 4.3, duration: 'Per Visit',
    description: 'Compressor repair, thermostat fix, gas refill, general service.',
    color: '#0ea5e9'
  },
  {
    id: 'cat-7', name: 'Washing Machine Repair', icon: '🫧',
    image: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=500',
    startingPrice: 349, rating: 4.4, duration: 'Per Visit',
    description: 'Drum repair, motor replacement, drainage fix, cleaning.',
    color: '#14b8a6'
  },
  {
    id: 'cat-8', name: 'Home Cleaning', icon: '🏠',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500',
    startingPrice: 1899, rating: 4.8, duration: 'Per BHK',
    description: 'Full home deep cleaning, kitchen, bathroom, dusting.',
    color: '#22c55e'
  },
  {
    id: 'cat-9', name: 'Deep Cleaning', icon: '✨',
    image: 'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=500',
    startingPrice: 3499, rating: 4.7, duration: 'Per BHK',
    description: 'Move-in/move-out cleaning, sofa, carpet, window cleaning.',
    color: '#10b981'
  },
  {
    id: 'cat-10', name: 'Pest Control', icon: '🐜',
    image: 'https://images.unsplash.com/photo-1632935190508-2e0f28e6e1f4?w=500',
    startingPrice: 1199, rating: 4.6, duration: 'Per BHK',
    description: 'Cockroach, termite, mosquito, bed bug treatment.',
    color: '#ef4444'
  },
  {
    id: 'cat-11', name: 'CCTV Installation', icon: '📹',
    image: 'https://images.unsplash.com/photo-1557862921-37829c790f19?w=500',
    startingPrice: 6500, rating: 4.5, duration: 'Per Project',
    description: 'CCTV setup, wiring, DVR configuration, cloud integration.',
    color: '#6366f1'
  },
  {
    id: 'cat-12', name: 'RO Water Purifier', icon: '💧',
    image: 'https://images.unsplash.com/photo-1564419320461-6eb9c3073f31?w=500',
    startingPrice: 499, rating: 4.4, duration: 'Per Service',
    description: 'RO service, filter replacement, installation, AMC.',
    color: '#0284c7'
  },
  {
    id: 'cat-13', name: 'Laptop Repair', icon: '💻',
    image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500',
    startingPrice: 599, rating: 4.5, duration: 'Per Visit',
    description: 'Screen repair, keyboard fix, OS install, data recovery.',
    color: '#64748b'
  },
  {
    id: 'cat-14', name: 'Mobile Repair', icon: '📱',
    image: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=500',
    startingPrice: 399, rating: 4.6, duration: 'Per Visit',
    description: 'Screen replacement, battery swap, charging port, software.',
    color: '#a855f7'
  },
  {
    id: 'cat-15', name: 'Gardening', icon: '🌿',
    image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=500',
    startingPrice: 499, rating: 4.7, duration: 'Per Visit',
    description: 'Lawn care, plant setup, trimming, landscaping, maintenance.',
    color: '#16a34a'
  },
  {
    id: 'cat-16', name: 'Beautician', icon: '💅',
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500',
    startingPrice: 999, rating: 4.8, duration: 'Per Session',
    description: 'Facial, waxing, hair styling, manicure, pedicure at home.',
    color: '#ec4899'
  },
  {
    id: 'cat-17', name: 'Interior Designer', icon: '🛋️',
    image: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=500',
    startingPrice: 80, rating: 4.9, duration: 'Per Sq.Ft',
    description: 'Space planning, modular kitchen, false ceiling, decor.',
    color: '#d946ef'
  },
  {
    id: 'cat-18', name: 'Home Tutor', icon: '📚',
    image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=500',
    startingPrice: 450, rating: 4.6, duration: 'Per Hour',
    description: 'Maths, science, coding, music, language tutoring at home.',
    color: '#f97316'
  }
];

// ─── CITIES ────────────────────────────────────────────
export const cities = ['Coimbatore'];

// ─── DUMMY PROVIDERS & REVIEWS (DEPRECATED: Production data loaded directly from MongoDB) ───
export const allProviders = [];
export const allReviews = [];

// ─── DEFAULT BOOKINGS & NOTIFICATIONS (Strictly empty, loaded via API from MongoDB) ───
const defaultBookings = [];
const defaultNotifications = [];
const defaultSaved = [];

// ─── DEFAULT CUSTOMER PROFILE ──────────────────────────
const defaultCustomer = {
  fullName: 'Customer',
  email: '',
  phone: '',
  photo: '',
  address: '',
  city: 'Coimbatore',
  state: 'Tamil Nadu',
  pincode: '641002',
  savedAddresses: [],
  stats: {
    totalBookings: 0,
    completedServices: 0,
    savedProviders: 0,
    totalSpent: 0
  }
};

// ─── HELPERS ───────────────────────────────────────────
const initStorage = (key, defaultData) => {
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, JSON.stringify(defaultData));
  }
};

// ─── SERVICE EXPORT ────────────────────────────────────
let cachedReviews = [];

export const CustomerService = {
  initialize: () => {
    // Genuine data only: Never initialize fake storage or mock records
  },

  // ── Customer Profile ──
  getCustomerInfo: () => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    if (!user.email) return null;
    return {
      fullName: user.fullName || user.name || (user.email ? user.email.split('@')[0] : 'Customer'),
      email: user.email,
      phone: user.phone || '',
      photo: user.profileImage || user.photo || '',
      address: user.address || '',
      city: user.city || 'Coimbatore',
      state: user.state || 'Tamil Nadu',
      pincode: user.pincode || '641002',
      savedAddresses: user.savedAddresses || [],
      savedProviders: user.savedProviders || [],
      stats: user.stats || {
        totalBookings: 0,
        completedServices: 0,
        savedProviders: 0,
        totalSpent: 0
      }
    };
  },

  fetchCustomerProfile: async () => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    if (!user.email) return CustomerService.getCustomerInfo();
    try {
      const res = await fetch(`http://localhost:5000/api/customer/profile/${encodeURIComponent(user.email)}`, {
        headers: { 'x-authenticated-email': user.email }
      });
      const data = await res.json();
      if (res.status === 404 || res.status === 401 || (data && data.success === false && data.message?.includes('not found'))) {
        // User was deleted from MongoDB Single Source of Truth! Invalidate session immediately.
        localStorage.removeItem('smartserve_user');
        window.dispatchEvent(new Event('auth-invalidated'));
        return null;
      }
      if (data.success && data.profile) {
        const merged = { ...user, ...data.profile };
        localStorage.setItem('smartserve_user', JSON.stringify(merged));
        window.dispatchEvent(new Event('profile-updated'));
        return merged;
      }
    } catch (e) {
      console.error('Failed to fetch customer profile:', e);
    }
    return CustomerService.getCustomerInfo();
  },

  updateCustomerInfo: async (info) => {
    const currentUser = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    const res = await fetch('http://localhost:5000/api/auth/update-profile', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-authenticated-email': currentUser.email || ''
      },
      body: JSON.stringify({ id: currentUser.id, email: currentUser.email, ...info })
    });
    const data = await res.json();
    if (res.status === 404 || res.status === 401) {
      localStorage.removeItem('smartserve_user');
      window.dispatchEvent(new Event('auth-invalidated'));
      throw new Error(data.message || 'Account not found in database. Session invalidated.');
    }
    if (!data.success) {
      throw new Error(data.message || 'Failed to update profile');
    }
    if (data.success && data.user) {
      const merged = { ...currentUser, ...data.user };
      localStorage.setItem('smartserve_user', JSON.stringify(merged));
      window.dispatchEvent(new Event('profile-updated'));
      return merged;
    }
    return currentUser;
  },

  // ── Bookings ──
  getBookings: async () => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    const email = user.email;
    if (!email) return [];
    try {
      const res = await fetch(`http://localhost:5000/api/customer/bookings/${encodeURIComponent(email)}`);
      const data = await res.json();
      return data.success ? data.bookings.map(b => ({ ...b, id: b.bookingId || b._id })) : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  createBooking: async (booking) => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    const bookingPayload = {
      customerName: booking.customerName || user.fullName || 'Customer',
      customerEmail: booking.customerEmail || user.email || '',
      customerPhone: booking.customerPhone || user.phone || '',
      customerAddress: booking.customerAddress || booking.address || user.address || '',
      providerId: booking.providerId || booking.provider?._id || booking.provider?.id,
      providerName: booking.providerName || booking.provider?.name,
      providerEmail: booking.providerEmail || booking.provider?.email || '',
      providerPhone: booking.providerPhone || booking.provider?.phone || '',
      date: booking.date,
      time: booking.time,
      serviceType: booking.category || booking.serviceType,
      serviceName: booking.service || booking.serviceName,
      serviceId: booking.serviceId || booking.service?._id,
      rooms: booking.rooms !== undefined && booking.rooms !== null ? booking.rooms : undefined,
      amount: booking.price || booking.amount || booking.total,
      location: booking.customerAddress || booking.address || user.address || 'Coimbatore',
      city: 'Coimbatore'
    };

    const res = await fetch('http://localhost:5000/api/customer/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-authenticated-email': user.email || ''
      },
      body: JSON.stringify(bookingPayload)
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to create booking.');
    }
    return data.booking;
  },

  cancelBooking: async (id) => {
    try {
      const res = await fetch('http://localhost:5000/api/provider/bookings/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'Cancelled' })
      });
      const data = await res.json();
      return data.success ? data.booking : null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  // ── Saved Providers ──
  getSavedProviders: async () => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    const email = user.email;
    if (!email) return [];
    try {
      const res = await fetch(`http://localhost:5000/api/customer/saved/${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.savedProviders)) {
        localStorage.setItem(CUSTOMER_SAVED_KEY, JSON.stringify(data.savedProviders));
        return data.savedProviders;
      }
    } catch (e) {
      console.error('Failed to fetch saved providers:', e);
    }
    return JSON.parse(localStorage.getItem(CUSTOMER_SAVED_KEY)) || [];
  },

  getSavedProvidersSync: () => {
    return JSON.parse(localStorage.getItem(CUSTOMER_SAVED_KEY)) || [];
  },

  toggleSaveProvider: async (providerId) => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    const email = user.email;
    if (!email) return [];
    try {
      const res = await fetch('http://localhost:5000/api/customer/saved/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, providerId })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.savedProviders)) {
        localStorage.setItem(CUSTOMER_SAVED_KEY, JSON.stringify(data.savedProviders));
        return data.savedProviders;
      }
    } catch (e) {
      console.error('Failed to toggle save provider:', e);
    }
    const saved = JSON.parse(localStorage.getItem(CUSTOMER_SAVED_KEY)) || [];
    const updated = saved.includes(providerId) ? saved.filter(id => id !== providerId) : [...saved, providerId];
    localStorage.setItem(CUSTOMER_SAVED_KEY, JSON.stringify(updated));
    return updated;
  },

  isProviderSaved: (providerId) => {
    const saved = JSON.parse(localStorage.getItem(CUSTOMER_SAVED_KEY)) || [];
    return saved.includes(providerId);
  },

  // ── Notifications ──
  getNotifications: async () => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    const email = user.email;
    if (!email) return [];
    try {
      const res = await fetch(`http://localhost:5000/api/customer/notifications/${encodeURIComponent(email)}`);
      const data = await res.json();
      return data.success ? data.notifications : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  markNotificationsAsRead: async () => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    const email = user.email;
    if (!email) return [];
    try {
      const res = await fetch('http://localhost:5000/api/customer/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      return data.success ? data.notifications : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  markNotificationAsRead: async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/customer/notifications/read/${id}`, {
        method: 'POST'
      });
      const data = await res.json();
      return data.success ? data.notifications : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  // ── Providers ──
  getProviders: async (filters = {}) => {
    try {
      // Pre-fetch reviews to cache
      try {
        const revRes = await fetch('http://localhost:5000/api/customer/reviews/all');
        const revData = await revRes.json();
        if (revData.success) {
          cachedReviews = revData.reviews;
        }
      } catch (err) {
        console.error('Error pre-fetching reviews:', err);
      }

      const params = new URLSearchParams();
      if (filters.category && filters.category !== 'All') params.set('category', filters.category);
      if (filters.service) params.set('service', filters.service);
      if (filters.serviceId) params.set('serviceId', filters.serviceId);
      if (filters.city && filters.city !== 'All') params.set('city', filters.city);
      if (filters.minRating) params.set('minRating', filters.minRating);
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
      if (filters.minExperience) params.set('minExperience', filters.minExperience);
      if (filters.availability && filters.availability !== 'All') params.set('availability', filters.availability);
      if (filters.search) params.set('search', filters.search);
      if (filters.sortBy) params.set('sortBy', filters.sortBy);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`http://localhost:5000/api/customer/providers${qs}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch providers');
      }
      const rawProviders = data.providers || [];
      const seenProviderIds = new Set();
      const uniqueProviders = [];
      for (const p of rawProviders) {
        const idStr = String(p.id || p._id);
        if (!seenProviderIds.has(idStr)) {
          seenProviderIds.add(idStr);
          uniqueProviders.push(p);
        }
      }
      return uniqueProviders;
    } catch (e) {
      console.error('getProviders error:', e);
      throw e;
    }
  },

  getProviderById: async (id) => {
    try {
      const res = await fetch('http://localhost:5000/api/customer/providers');
      const data = await res.json();
      if (data.success) {
        return data.providers.find(p => p.id === id) || null;
      }
      return null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  getProviderReviews: (providerId) => {
    return cachedReviews.filter(r => String(r.providerId) === String(providerId));
  },

  fetchProviderReviews: async (providerId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/customer/reviews/${providerId}`);
      const data = await res.json();
      return data.success ? data.reviews : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  createReview: async ({ bookingId, providerId, rating, comment, serviceTaken, customerName, customerEmail }) => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    const payload = {
      bookingId,
      providerId,
      customerName: customerName || user.fullName || 'Customer',
      customerEmail: customerEmail || user.email || '',
      rating: Number(rating),
      comment: (comment || '').trim(),
      serviceTaken: serviceTaken || 'Service'
    };
    const res = await fetch('http://localhost:5000/api/customer/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to submit review.');
    }
    if (data.review) {
      cachedReviews = [data.review, ...cachedReviews.filter(r => r.bookingId !== bookingId)];
    }
    return data.review;
  },

  getCustomerReviews: async (email) => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    const userEmail = email || user.email;
    if (!userEmail) return [];
    try {
      const res = await fetch(`http://localhost:5000/api/customer/reviews/customer/${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      return data.success ? data.reviews : [];
    } catch (e) {
      console.error('Failed to get customer reviews:', e);
      return [];
    }
  },

  // ── Services / Categories ──
  getServiceCategories: async () => {
    try {
      const res = await fetch('http://localhost:5000/api/customer/services');
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch service categories');
      }
      return data.services || data.categories || [];
    } catch (e) {
      console.error('getServiceCategories error:', e);
      throw e;
    }
  },

  getServicesCatalog: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.category && filters.category !== 'All') params.set('category', filters.category);
      if (filters.search) params.set('search', filters.search);
      if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
      if (filters.minRating) params.set('minRating', filters.minRating);
      if (filters.city && filters.city !== 'All') params.set('city', filters.city);
      if (filters.availability && filters.availability !== 'All') params.set('availability', filters.availability);
      if (filters.sortBy) params.set('sortBy', filters.sortBy);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`http://localhost:5000/api/customer/services-catalog${qs}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to fetch services catalog');
      }
      return data.services || [];
    } catch (e) {
      console.error('getServicesCatalog error:', e);
      throw e;
    }
  },

  getTopProviders: async () => {
    try {
      const res = await fetch('http://localhost:5000/api/customer/top-providers');
      const data = await res.json();
      const raw = data.success ? data.providers : [];
      const seen = new Set();
      const unique = [];
      for (const p of raw) {
        const idStr = String(p.id || p._id);
        if (!seen.has(idStr)) {
          seen.add(idStr);
          unique.push(p);
        }
      }
      return unique;
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  getCities: () => cities,

  // ── AI Smart Functions ──
  getAIRecommendations: async () => {
    try {
      const res = await fetch('http://localhost:5000/api/customer/recommendations');
      const data = await res.json();
      const raw = data.success && Array.isArray(data.recommendations) ? data.recommendations : [];
      const seen = new Set();
      const unique = [];
      for (const r of raw) {
        const pIdStr = String(r.providerId || r.id);
        if (!seen.has(pIdStr)) {
          seen.add(pIdStr);
          unique.push(r);
        }
      }
      return unique;
    } catch (e) {
      console.error('Failed to fetch recommendations:', e);
      return [];
    }
  },

  getAICostEstimate: async (
    serviceCategory,
    houseSize = '2 BHK',
    rooms = 2,
    liveProviders = [],
    serviceId = null,
    providerId = null,
    hours = null,
    areaSqFt = null,
    quantity = 1
  ) => {
    try {
      const res = await fetch('http://localhost:5000/api/customer/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: serviceCategory,
          houseSize,
          rooms,
          serviceId: serviceId && serviceId !== 'all' ? serviceId : undefined,
          providerId: providerId && providerId !== 'all' ? providerId : undefined,
          hours,
          areaSqFt,
          quantity
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return data;
        }
      }
    } catch (err) {
      console.warn('API estimate request failed, calculating from loaded authentic records:', err.message);
    }

    // Client-side fallback using genuine loaded records:
    const categoryProviders = (liveProviders || []).filter(
      p => (p.category || '').toLowerCase() === (serviceCategory || '').toLowerCase()
    );

    if (categoryProviders.length === 0) {
      return {
        success: true,
        available: false,
        category: serviceCategory,
        message: `Cost estimate is currently unavailable for ${serviceCategory} because there are no verified providers registered in Coimbatore.`,
        providerFee: null,
        total: null,
        breakdown: null,
        recommendedProviders: []
      };
    }

    const targetProvider = (providerId && providerId !== 'all')
      ? (categoryProviders.find(p => p.id === providerId || p._id === providerId) || categoryProviders[0])
      : categoryProviders[0];

    let unitRate = targetProvider.hourlyRate || (targetProvider.pricing && targetProvider.pricing[0]?.price) || targetProvider.rate || 350;
    let unit = targetProvider.hourlyRate ? 'Per Hour' : (targetProvider.pricing && targetProvider.pricing[0]?.unit) || targetProvider.pricingUnit || 'Per Visit';

    let calculatedFee = unitRate;
    let explanation = '';
    const normUnit = unit.toLowerCase();

    if (normUnit.includes('hour')) {
      const h = hours || (rooms ? Math.max(1, Math.min(8, Math.round(rooms * 0.75))) : 2);
      calculatedFee = Math.round(unitRate * h);
      explanation = `Calculated as ₹${unitRate}/hr × ${h} hour(s) based on verified provider rate configured by ${targetProvider.name}.`;
    } else if (normUnit.includes('sq.ft') || normUnit.includes('sqft')) {
      const areaMap = { '1 BHK': 500, '2 BHK': 850, '3 BHK': 1200, '4 BHK': 1600, 'Villa/Independent': 2500 };
      const a = areaSqFt || areaMap[houseSize] || 850;
      calculatedFee = Math.round(unitRate * a);
      explanation = `Calculated as ₹${unitRate}/sq.ft × ${a} sq.ft (${houseSize}) based on verified provider rate configured by ${targetProvider.name}.`;
    } else if (normUnit.includes('bhk')) {
      const bhkMultiplierMap = { '1 BHK': 1.0, '2 BHK': 1.4, '3 BHK': 1.9, '4 BHK': 2.4, 'Villa/Independent': 3.2 };
      const multiplier = bhkMultiplierMap[houseSize] || 1.0;
      calculatedFee = Math.round(unitRate * multiplier);
      explanation = `Calculated as ₹${unitRate} base rate × ${multiplier} multiplier for ${houseSize} based on verified provider rate configured by ${targetProvider.name}.`;
    } else {
      const qty = quantity || 1;
      calculatedFee = Math.round(unitRate * qty);
      explanation = `Fixed provider service fee of ₹${unitRate} ${unit}${qty > 1 ? ` × ${qty}` : ''} configured by ${targetProvider.name}.`;
    }

    const matchedItem = (targetProvider.pricing || []).find(p => (serviceId && p.id === serviceId) || (p.service && p.service.toLowerCase().includes((serviceCategory || '').toLowerCase())));
    const configuredDuration = matchedItem?.duration || (targetProvider.pricing && targetProvider.pricing[0]?.duration) || 'Duration not available';

    const seenRecIds = new Set();
    const uniqueRecs = [];
    for (const p of categoryProviders) {
      const pId = String(p.id || p._id);
      if (!seenRecIds.has(pId)) {
        seenRecIds.add(pId);
        uniqueRecs.push(p);
      }
    }

    return {
      success: true,
      available: true,
      category: serviceCategory,
      service: `${serviceCategory} Service`,
      provider: targetProvider,
      duration: configuredDuration,
      estimatedDuration: configuredDuration,
      providerFee: calculatedFee,
      total: calculatedFee,
      unit,
      explanation,
      breakdown: {
        providerServiceFee: calculatedFee,
        total: calculatedFee
      },
      recommendedProviders: uniqueRecs.slice(0, 4)
    };
  },

  getAIServicePlan: async (options) => {
    const payload = Array.isArray(options) ? { services: options } : (typeof options === 'string' ? { message: options } : (options || {}));
    try {
      const res = await fetch('http://localhost:5000/api/ai/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.noMatches) {
        return {
          ...(data.plan || {}),
          noMatches: true,
          message: data.message || 'No matching services or providers found for your request in Coimbatore.',
          searchQuery: data.searchQuery,
          availableCategories: data.availableCategories || [],
          steps: [],
          matchingProviders: [],
          totalDuration: '0 Days',
          totalBudget: 0,
          understanding: data.plan?.understanding || `No active services or approved providers match your search.`,
          recommendedService: data.plan?.recommendedService || 'None available',
          requiredDetails: data.plan?.requiredDetails || '',
          suggestedWorkPlan: [],
          estimatedCost: 0,
          estimatedDuration: 'Duration unavailable',
          nextStep: 'Try searching for a supported service (e.g. Electrician, Plumber, Painter, AC Repair, Cleaning).'
        };
      }
      if (data.success && data.plan) {
        return {
          ...data.plan,
          noMatches: Boolean(data.noMatches),
          searchQuery: data.searchQuery || data.plan.searchQuery,
          message: data.message || data.plan.message
        };
      }
      if (data.clarificationNeeded) {
        return {
          clarificationNeeded: true,
          message: data.reply || data.message,
          suggestedCategories: data.suggestedCategories || [],
          steps: [],
          matchingProviders: [],
          totalDuration: '0 Days',
          totalBudget: 0
        };
      }
      if (data.message) {
        return {
          error: data.message,
          steps: [],
          matchingProviders: [],
          totalDuration: '0 Days',
          totalBudget: 0
        };
      }
      return null;
    } catch (e) {
      console.error('getAIServicePlan backend error:', e);
      return null;
    }
  },

  getAISimulatedResponse: (message) => {
    const msg = message.toLowerCase();
    
    // Help FAQs mapping
    if (msg.includes('electrician') || msg.includes('electric') || msg.includes('wiring') || msg.includes('power')) {
      return {
        reply: "I found verified Electricians active today in Coimbatore (RS Puram & Peelamedu). Here is our top recommended expert:",
        suggestedQuestions: ["Book Rajesh Kumar tomorrow", "What is the hourly rate for Electricians?", "Do you have emergency electricians?"],
        card: {
          title: "Rajesh Kumar",
          category: "Electrician",
          rating: 4.8,
          price: "₹350 / visit",
          location: "Peelamedu, Coimbatore",
          photo: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=300",
          matchReason: "Best Rated Near You",
          providerId: "p1"
        }
      };
    }
    
    if (msg.includes('ac') || msg.includes('cooling') || msg.includes('air conditioner') || msg.includes('fan')) {
      return {
        reply: "If your AC is not cooling properly, it usually needs a general chemical wash or a gas refill (R32/R410). Here is our top AC specialist:",
        suggestedQuestions: ["Book Mohammed Ali today", "Calculate AC service cost", "Show other AC specialists"],
        card: {
          title: "Mohammed Ali",
          category: "AC Repair",
          rating: 4.6,
          price: "₹499 / visit",
          location: "Singanallur, Coimbatore",
          photo: "https://images.unsplash.com/photo-1618018352910-d58ff02737a1?w=300",
          matchReason: "Fastest Response (15 mins)",
          providerId: "p7"
        }
      };
    }

    if (msg.includes('painter') || msg.includes('paint') || msg.includes('wall')) {
      return {
        reply: "For painting jobs, I recommend Arjun Mehta. He specializes in interior texture painting and waterproofing with 10+ years experience in Coimbatore.",
        suggestedQuestions: ["Estimate cost for 2 BHK Painting", "Book Arjun Mehta for consultation", "Show paint texture samples"],
        card: {
          title: "Arjun Mehta",
          category: "Painter",
          rating: 4.6,
          price: "₹15 / sq.ft",
          location: "Vadavalli, Coimbatore",
          photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300",
          matchReason: "Most Experienced",
          providerId: "p10"
        }
      };
    }

    if (msg.includes('plumber') || msg.includes('leak') || msg.includes('tap') || msg.includes('clog')) {
      return {
        reply: "For plumbing issues, Amit Patel is highly recommended. He specializes in leak repair and bathroom fixture installation.",
        suggestedQuestions: ["Book Amit Patel tomorrow", "How much does tap repair cost?", "Suggest Plumbers near RS Puram"],
        card: {
          title: "Amit Patel",
          category: "Plumber",
          rating: 4.7,
          price: "₹299 / visit",
          location: "Gandhipuram, Coimbatore",
          photo: "https://images.unsplash.com/photo-1624561172888-ac93c696e10c?w=300",
          matchReason: "Lowest Price Guaranteed",
          providerId: "p3"
        }
      };
    }

    if (msg.includes('cleaning') || msg.includes('clean') || msg.includes('housemaid')) {
      return {
        reply: "We offer both Basic Home Cleaning (₹1899) and Deep Cleaning (₹3499). Pooja Iyer is our top-rated deep cleaning expert.",
        suggestedQuestions: ["Compare Basic vs Deep Cleaning", "Book Deep Cleaning for 2 BHK", "Pest control + Cleaning package"],
        card: {
          title: "Pooja Iyer",
          category: "Deep Cleaning",
          rating: 4.7,
          price: "₹3,499 / BHK",
          location: "RS Puram, Coimbatore",
          photo: "https://images.unsplash.com/photo-1594744803329-e58b31de215f?w=300",
          matchReason: "Highest Completion Rate",
          providerId: "p17"
        }
      };
    }

    if (msg.includes('designer') || msg.includes('interior') || msg.includes('decor')) {
      return {
        reply: "For premium interiors, Ananya Gupta is based in RS Puram and creates modular kitchen and 3D false ceiling designs.",
        suggestedQuestions: ["Book Ananya Gupta consultation", "Average cost of modular kitchen", "Show design portfolio"],
        card: {
          title: "Ananya Gupta",
          category: "Interior Designer",
          rating: 4.9,
          price: "₹80 / sq.ft",
          location: "Peelamedu, Coimbatore",
          photo: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300",
          matchReason: "Top Rated Professional",
          providerId: "p6"
        }
      };
    }

    if (msg.includes('cost') || msg.includes('estimate') || msg.includes('price') || msg.includes('pricing')) {
      return {
        reply: "I can help you estimate service costs instantly. Use our AI Cost Estimator to view genuine provider service fees and matching verified professionals in Coimbatore.",
        suggestedQuestions: ["Go to AI Cost Estimator", "How does pricing work?", "Browse Services"]
      };
    }

    return {
      reply: "Hello! I am your SmartServe AI Assistant. I can help you find verified professionals, estimate budgets, plan multiple home renovation services, and answer questions. \n\nTry asking me:\n* 'My AC is not cooling'\n* 'I need an electrician'\n* 'Book a plumber tomorrow'\n* 'Suggest a painter near RS Puram'",
      suggestedQuestions: ["I need an electrician", "My AC is not cooling", "Suggest a painter", "Book a plumber tomorrow"]
    };
  },

  sendAIMessage: async (message, history = [], customer = null, image = null, docAttachment = null) => {
    const response = await fetch('http://localhost:5000/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, customer, image, document: docAttachment })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'AI request could not be processed.');
    }
    return {
      success: true,
      reply: data.reply,
      card: data.card || null,
      suggestedQuestions: data.suggestedQuestions || []
    };
  },

  getAIChatHistory: async (customerEmail) => {
    if (!customerEmail) return [];
    try {
      const res = await fetch(`http://localhost:5000/api/ai/history/${encodeURIComponent(customerEmail)}`);
      const data = await res.json();
      return data.success && Array.isArray(data.messages) ? data.messages : [];
    } catch (err) {
      console.warn('Could not load AI chat history:', err);
      return [];
    }
  },

  clearAIChatHistory: async (customerEmail) => {
    if (!customerEmail) return true;
    try {
      const res = await fetch(`http://localhost:5000/api/ai/history/${encodeURIComponent(customerEmail)}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      return !!data.success;
    } catch (err) {
      console.warn('Could not clear AI chat history:', err);
      return false;
    }
  },

  getAIInsightsData: () => {
    return {
      trendingServices: [
        { name: 'AC Repair', bookings: 124, growth: '+28%', color: '#06b6d4' },
        { name: 'Deep Cleaning', bookings: 98, growth: '+20%', color: '#10b981' },
        { name: 'Electrician Services', bookings: 85, growth: '+15%', color: '#f59e0b' },
        { name: 'Pest Control', bookings: 62, growth: '+12%', color: '#ef4444' },
        { name: 'Painting Consultations', bookings: 45, growth: '+8%', color: '#8b5cf6' }
      ],
      averagePricing: [
        { category: 'AC Service', price: 499, stateAvg: 550 },
        { category: 'Deep Clean (2BHK)', price: 3499, stateAvg: 4000 },
        { category: 'Electrical Check', price: 350, stateAvg: 400 },
        { category: 'Plumbing Visit', price: 299, stateAvg: 350 },
        { category: 'Pest Control', price: 1199, stateAvg: 1400 }
      ],
      customerSatisfaction: 4.8,
      providerPerformance: {
        activeProviders: 20,
        completionRate: 98.4,
        averageRating: 4.75,
        averageResponseTime: '18 mins'
      },
      bookingTrends: [
        { month: 'Jan', bookings: 45 },
        { month: 'Feb', bookings: 52 },
        { month: 'Mar', bookings: 68 },
        { month: 'Apr', bookings: 89 },
        { month: 'May', bookings: 112 },
        { month: 'Jun', bookings: 124 }
      ]
    };
  },

  getAIFaqs: () => {
    return [
      {
        question: "How does the AI matching logic select providers?",
        answer: "Our system analyzes live factors: proximity within Coimbatore (RS Puram, Peelamedu, etc.), service reviews, response times, historical job completion rates, and pricing competitiveness to suggest the absolute best match for your specific task."
      },
      {
        question: "Is there an emergency surcharge for instant bookings?",
        answer: "Yes, bookings marked with 'Immediate' urgency in the Cost Estimator include a ₹250 emergency surcharge, which goes 100% directly to the service partner to cover expedited travel and priority dispatch."
      },
      {
        question: "How accurate is the AI Cost Estimator?",
        answer: "The AI Cost Estimator operates with an accuracy level of 90-95% compared to actual invoices, using current market rates in Tamil Nadu and real-time labor pricing indices."
      },
      {
        question: "Can I coordinate multiple sequential services?",
        answer: "Absolutely! Use the AI Service Planner to coordinate services. For example, if you schedule both painting and cleaning, the planner places cleaning after painting is complete so dust is properly cleared."
      }
    ];
  }
};

