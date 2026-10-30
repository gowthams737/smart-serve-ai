import { cleanImageUrl } from '../utils/imageUrl';

const PROVIDER_KEY = 'smartserve_provider';
const SERVICES_KEY = 'smartserve_provider_services';
const BOOKINGS_KEY = 'smartserve_provider_bookings';
const NOTIFICATIONS_KEY = 'smartserve_provider_notifications';
const EARNINGS_KEY = 'smartserve_provider_earnings';
const REVIEWS_KEY = 'smartserve_provider_reviews';

const API_URL = '/api/provider';

export const ProviderService = {
  initialize: () => {
    // Genuine data only: Never initialize fake storage or mock records
  },

  getProviderInfo: async () => {
    let user = {};
    try {
      user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    } catch (e) {
      user = {};
    }
    if (!user.email) {
      return null;
    }
    const createFallback = () => ({
      id: user.id || user._id || 'prov-self',
      name: user.fullName || user.name || user.email.split('@')[0],
      fullName: user.fullName || user.name || user.email.split('@')[0],
      email: user.email,
      phone: user.phone || '',
      category: user.category || '',
      experience: user.experience || 0,
      rating: user.rating || 0,
      reviewsCount: user.reviewsCount || 0,
      city: user.city || 'Coimbatore',
      state: user.state || 'Tamil Nadu',
      pincode: user.pincode || '641002',
      address: user.address || '',
      isOnline: user.isOnline !== undefined ? user.isOnline : true,
      photo: cleanImageUrl(user.profileImage || ''),
      profilePhoto: cleanImageUrl(user.profileImage || ''),
      pricingUnit: user.pricingUnit || 'Per Visit',
      rate: user.rate || 0,
      workingHours: user.workingHours || { start: '09:00', end: '18:00' },
      workingHoursFormatted: user.workingHoursFormatted || '09:00 AM - 06:00 PM',
      workingDays: user.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      holidays: user.holidays || [],
      blockedDates: user.blockedDates || [],
      profileCompletion: user.profileCompletion || 100
    });

    try {
      const res = await fetch(`${API_URL}/profile/${encodeURIComponent(user.email)}`, {
        headers: { 'x-authenticated-email': user.email }
      });
      if (res.status === 404 || res.status === 401) {
        // Provider was deleted from MongoDB Single Source of Truth! Invalidate session immediately.
        localStorage.removeItem('smartserve_user');
        window.dispatchEvent(new Event('auth-invalidated'));
        return null;
      }
      const data = await res.json();
      if (data.success && data.profile) {
        if (data.profile.photo) data.profile.photo = cleanImageUrl(data.profile.photo);
        if (data.profile.profilePhoto) data.profile.profilePhoto = cleanImageUrl(data.profile.profilePhoto);
        return data.profile;
      }
      if (data && data.success === false && data.message?.includes('not found')) {
        localStorage.removeItem('smartserve_user');
        window.dispatchEvent(new Event('auth-invalidated'));
        return null;
      }
      return null;
    } catch (e) {
      console.warn('getProviderInfo fetch error:', e.message);
      return null;
    }
  },

  getDashboardStats: async () => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    if (!user.email) {
      return null;
    }
    try {
      const res = await fetch(`${API_URL}/stats/${encodeURIComponent(user.email)}`);
      const data = await res.json();
      if (data.success && data.stats) {
        return data.stats;
      }
      return null;
    } catch (e) {
      console.error('getDashboardStats error:', e);
      return null;
    }
  },

  updateProviderInfo: async (info) => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    const email = info.email || user.email;
    if (!email) {
      throw new Error('No provider email found. Please ensure you are logged in.');
    }
    try {
      const res = await fetch(`${API_URL}/profile/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ...info })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update provider profile.');
      }
      const updatedProfile = data.profile || data.provider;
      if (updatedProfile) {
        if (updatedProfile.photo) updatedProfile.photo = cleanImageUrl(updatedProfile.photo);
        if (updatedProfile.profilePhoto) updatedProfile.profilePhoto = cleanImageUrl(updatedProfile.profilePhoto);
        // Also sync local storage user info
        const updatedUser = {
          ...user,
          fullName: updatedProfile.fullName || updatedProfile.name || user.fullName,
          phone: updatedProfile.phone || user.phone,
          profileImage: cleanImageUrl(updatedProfile.profilePhoto || updatedProfile.photo || user.profileImage),
          rate: updatedProfile.rate,
          pricingUnit: updatedProfile.pricingUnit,
          workingHours: updatedProfile.workingHours,
          workingDays: updatedProfile.workingDays
        };
        localStorage.setItem('smartserve_user', JSON.stringify(updatedUser));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('providerProfileUpdated', { detail: updatedProfile }));
          window.dispatchEvent(new Event('profile-updated'));
        }
        return updatedProfile;
      }
      return null;
    } catch (e) {
      console.error('updateProviderInfo error:', e);
      throw e;
    }
  },

  registerProvider: async (formData) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'Provider', ...formData })
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Registration failed');
    }
    localStorage.setItem('smartserve_user', JSON.stringify(data.user));
    return data.user;
  },

  getServices: async () => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    const email = user.email;
    if (!email) return [];
    try {
      const res = await fetch(`${API_URL}/services/${email}`);
      const data = await res.json();
      if (data.success) {
        return data.services.map(s => ({
          id: s._id,
          name: s.name,
          category: s.category || 'Home Cleaning',
          description: s.description || '',
          price: s.price,
          time: s.estimatedDuration || '',
          isAvailable: s.isAvailable !== undefined ? s.isAvailable : true,
          image: s.image || ''
        }));
      }
      return [];
    } catch (e) {
      console.error('getServices error:', e);
      return [];
    }
  },

  addService: async (service) => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    const email = user.email;
    if (!email) throw new Error('Not logged in');
    const res = await fetch(`${API_URL}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        name: service.name,
        category: service.category,
        description: service.description,
        price: service.price,
        estimatedDuration: service.time,
        image: service.image,
        isAvailable: service.isAvailable !== undefined ? service.isAvailable : true
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Failed to add service');
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('providerServicesUpdated'));
    return data.service;
  },

  updateService: async (id, updatedData) => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    const email = user.email;
    if (!email) throw new Error('Not logged in');
    const body = { email };
    if (updatedData.name !== undefined) body.name = updatedData.name;
    if (updatedData.category !== undefined) body.category = updatedData.category;
    if (updatedData.description !== undefined) body.description = updatedData.description;
    if (updatedData.price !== undefined) body.price = updatedData.price;
    if (updatedData.time !== undefined) body.estimatedDuration = updatedData.time;
    if (updatedData.image !== undefined) body.image = updatedData.image;
    if (updatedData.isAvailable !== undefined) body.isAvailable = updatedData.isAvailable;
    const res = await fetch(`${API_URL}/services/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Failed to update service');
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('providerServicesUpdated'));
    return data.service;
  },

  deleteService: async (id) => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    const email = user.email;
    if (!email) throw new Error('Not logged in');
    const res = await fetch(`${API_URL}/services/${id}?email=${encodeURIComponent(email)}`, {
      method: 'DELETE'
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Failed to delete service');
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('providerServicesUpdated'));
    return true;
  },

  duplicateService: async (id) => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    const email = user.email;
    if (!email) throw new Error('Not logged in');
    // Fetch the original service then create a copy
    const listRes = await fetch(`${API_URL}/services/${email}`);
    const listData = await listRes.json();
    if (!listData.success) return null;
    const original = listData.services.find(s => s._id === id);
    if (!original) return null;
    const res = await fetch(`${API_URL}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        name: `${original.name} (Copy)`,
        category: original.category,
        description: original.description,
        price: original.price,
        estimatedDuration: original.estimatedDuration,
        image: original.image,
        isAvailable: original.isAvailable
      })
    });
    const data = await res.json();
    if (data.success && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('providerServicesUpdated'));
    }
    return data.success ? data.service : null;
  },

  getBookings: async () => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    const email = user.email;
    if (!email) return [];
    try {
      const res = await fetch(`${API_URL}/bookings/${encodeURIComponent(email)}`);
      const data = await res.json();
      return data.success ? data.bookings.map(b => ({ ...b, id: b.bookingId || b._id, price: b.amount })) : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  updateBookingStatus: async (id, status) => {
    try {
      const res = await fetch(`${API_URL}/bookings/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      const data = await res.json();
      if (data.success && typeof window !== 'undefined') {
        window.dispatchEvent(new Event('providerBookingsUpdated'));
      }
      return data.success ? data.booking : null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  getNotifications: async () => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    const email = user.email;
    if (!email) return [];
    try {
      const res = await fetch(`${API_URL}/notifications/${encodeURIComponent(email)}`);
      const data = await res.json();
      return data.success ? data.notifications : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  addNotification: async (notif) => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    const email = user.email;
    if (!email) return null;
    try {
      const res = await fetch(`${API_URL}/notifications/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: email, ...notif })
      });
      const data = await res.json();
      if (data.success && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('providerNotificationsUpdated'));
      }
      return data.success ? data.notification : null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  markNotificationsAsRead: async () => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    const email = user.email;
    if (!email) return [];
    try {
      const res = await fetch(`${API_URL}/notifications/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('providerNotificationsUpdated'));
      }
      return data.success ? data.notifications : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  markNotificationAsRead: async (id) => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    const email = user.email;
    if (!id) return null;
    try {
      const res = await fetch(`${API_URL}/notifications/read/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('providerNotificationsUpdated', { detail: data.notification }));
      }
      return data.success ? data.notification : null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  getReviews: async () => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    const email = user.email;
    if (!email) return [];
    try {
      const res = await fetch(`${API_URL}/reviews/${encodeURIComponent(email)}`);
      const data = await res.json();
      return data.success ? data.reviews : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  addReviewReply: async (reviewId, replyText) => {
    try {
      const res = await fetch(`${API_URL}/reviews/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, replyText })
      });
      const data = await res.json();
      return data.success ? data.review : null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  getEarnings: async () => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    const email = user.email;
    const emptyEarnings = {
      today: 0,
      weekly: 0,
      monthly: 0,
      total: 0,
      completedJobsCount: 0,
      transactions: []
    };
    if (!email) {
      return emptyEarnings;
    }
    try {
      const res = await fetch(`${API_URL}/earnings/${encodeURIComponent(email)}`);
      const data = await res.json();
      return (data.success && data.earnings) ? data.earnings : emptyEarnings;
    } catch (e) {
      console.error(e);
      return emptyEarnings;
    }
  },

  deleteAccount: async (password, emailOverride = null) => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    const email = emailOverride || user.email;
    if (!email) {
      throw new Error('Not authenticated. Please log in first.');
    }

    const res = await fetch(`${API_URL}/account/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Authenticated-Email': email
      },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to delete account');
    }

    // Clear authentication session and provider-specific storage
    localStorage.removeItem('smartserve_user');
    localStorage.removeItem(PROVIDER_KEY);
    localStorage.removeItem(SERVICES_KEY);
    localStorage.removeItem(BOOKINGS_KEY);
    localStorage.removeItem(NOTIFICATIONS_KEY);
    localStorage.removeItem(EARNINGS_KEY);
    localStorage.removeItem(REVIEWS_KEY);

    window.dispatchEvent(new Event('providerAccountDeleted'));
    return data;
  }
};
