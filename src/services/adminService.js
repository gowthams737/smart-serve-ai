const ADMIN_PROFILE_KEY = 'smartserve_admin_profile';
const ADMIN_SETTINGS_KEY = 'smartserve_admin_settings';
const ADMIN_COMPLAINTS_KEY = 'smartserve_admin_complaints';
const ADMIN_NOTIFICATIONS_KEY = 'smartserve_admin_notifications';
const ADMIN_CUSTOMERS_KEY = 'smartserve_admin_customers';
const ADMIN_PROVIDERS_KEY = 'smartserve_admin_providers';
const ADMIN_SERVICES_KEY = 'smartserve_admin_services';
const ADMIN_BOOKINGS_KEY = 'smartserve_admin_bookings';

const defaultAdminProfile = {
  fullName: 'Gowtham S',
  email: 'gowtham.s@smartserve.ai',
  phone: '+91 98430 12345',
  role: 'Super Administrator',
  avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
  joinedDate: '2025-01-15',
  activeSessions: 3,
  department: 'Operations & Platform Quality'
};

const defaultSettings = {
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
    { role: 'Support Representative', module: 'Complaints, Booking History', access: 'Write/Edit' },
    { role: 'Financial Analyst', module: 'Reports & Revenue', access: 'Read Only' }
  ]
};

const defaultCustomers = [
  {
    id: 'c1',
    fullName: 'Sandhya Rajesh',
    email: 'sandhya.r@gmail.com',
    phone: '+91 98431 87654',
    city: 'RS Puram',
    address: 'Block A-4, RS Puram, Coimbatore - 641002',
    status: 'Active',
    joinedDate: '2025-03-10',
    bookingsCount: 8,
    totalSpent: 12500,
    bookingHistory: [
      { id: 'b1', service: 'Full Home Deep Cleaning', date: '2026-07-02', status: 'Pending', amount: 3499 },
      { id: 'b4', service: 'AC Repair & Servicing', date: '2026-05-12', status: 'Completed', amount: 899 }
    ]
  },
  {
    id: 'c2',
    fullName: 'Manoj Kumar',
    email: 'manoj.k@yahoo.com',
    phone: '+91 97860 12399',
    city: 'Peelamedu',
    address: '102 Tidel Park Road, Peelamedu, Coimbatore - 641014',
    status: 'Active',
    joinedDate: '2025-04-18',
    bookingsCount: 12,
    totalSpent: 19800,
    bookingHistory: [
      { id: 'b2', service: 'Express Kitchen Cleaning', date: '2026-07-03', status: 'Active', amount: 1499 },
      { id: 'b5', service: 'Basic Electrical Wiring', date: '2026-06-15', status: 'Completed', amount: 450 }
    ]
  },
  {
    id: 'c3',
    fullName: 'Eshwari Srinivasan',
    email: 'eshwari.s@outlook.com',
    phone: '+91 94435 99887',
    city: 'Gandhipuram',
    address: '88 Gandhipuram Main Road, Coimbatore - 641012',
    status: 'Active',
    joinedDate: '2025-02-05',
    bookingsCount: 15,
    totalSpent: 28400,
    bookingHistory: [
      { id: 'b3', service: 'Sofa & Upholstery Shampooing', date: '2026-06-29', status: 'Completed', amount: 999 }
    ]
  },
  {
    id: 'c4',
    fullName: 'Ramachandran Venkat',
    email: 'ramachandran.v@gmail.com',
    phone: '+91 99420 54321',
    city: 'Saibaba Colony',
    address: '22 Alagesan Road, Saibaba Colony, Coimbatore - 641011',
    status: 'Inactive',
    joinedDate: '2025-06-22',
    bookingsCount: 3,
    totalSpent: 4200,
    bookingHistory: []
  },
  {
    id: 'c5',
    fullName: 'Karthik Raja',
    email: 'karthik.raja@live.com',
    phone: '+91 90035 11223',
    city: 'Saravanampatti',
    address: 'KGISL IT Park Campus, Saravanampatti, Coimbatore - 641035',
    status: 'Active',
    joinedDate: '2025-09-01',
    bookingsCount: 5,
    totalSpent: 6799,
    bookingHistory: []
  }
];

const defaultProviders = [
  {
    id: 'p1',
    name: 'Rajesh Kumar',
    category: 'Electrician',
    experience: 8,
    rating: 4.8,
    reviewsCount: 124,
    status: 'Approved',
    availability: 'Available Today',
    phone: '+91 94432 01201',
    email: 'rajesh.k@smartserve.ai',
    city: 'Peelamedu',
    about: 'Certified electrician with 8+ years of residential and commercial wiring expertise in Coimbatore. Known for prompt service and clean installations.',
    completedJobs: 342
  },
  {
    id: 'p2',
    name: 'Priya Sharma',
    category: 'Home Cleaning',
    experience: 6,
    rating: 4.9,
    reviewsCount: 89,
    status: 'Approved',
    availability: 'Available Today',
    phone: '+91 98432 01202',
    email: 'priya.s@smartserve.ai',
    city: 'RS Puram',
    about: 'Professional home cleaner certified in eco-friendly cleaning methods. Specializes in move-in/move-out deep cleaning across Coimbatore.',
    completedJobs: 256
  },
  {
    id: 'p3',
    name: 'Amit Patel',
    category: 'Plumber',
    experience: 10,
    rating: 4.7,
    reviewsCount: 156,
    status: 'Pending',
    availability: 'Available Tomorrow',
    phone: '+91 99420 01203',
    email: 'amit.p@smartserve.ai',
    city: 'Gandhipuram',
    about: 'Master plumber in Coimbatore with a decade of experience. Expert in modern plumbing systems and water-saving solutions.',
    completedJobs: 489
  },
  {
    id: 'p4',
    name: 'Ramesh Chandran',
    category: 'Carpenter',
    experience: 12,
    rating: 4.6,
    reviewsCount: 75,
    status: 'Approved',
    availability: 'Available Today',
    phone: '+91 90430 98765',
    email: 'ramesh.c@smartserve.ai',
    city: 'Vadavalli',
    about: 'Highly skilled carpenter specializing in modular furniture, custom cabinet assembly, and home repair services.',
    completedJobs: 180
  },
  {
    id: 'p5',
    name: 'Anjali Nair',
    category: 'Beautician',
    experience: 5,
    rating: 4.8,
    reviewsCount: 42,
    status: 'Pending',
    availability: 'Weekend Only',
    phone: '+91 96541 23456',
    email: 'anjali.n@smartserve.ai',
    city: 'Race Course',
    about: 'Professional beautician offering bridal makeup, home facials, hair grooming, and high-quality manicures.',
    completedJobs: 92
  }
];

const defaultServices = [
  { id: 'cat-1', name: 'Electrician', startingPrice: 350, rating: 4.6, duration: 'Per Hour', status: 'Active', bookingsCount: 120 },
  { id: 'cat-2', name: 'Plumber', startingPrice: 299, rating: 4.5, duration: 'Per Visit', status: 'Active', bookingsCount: 95 },
  { id: 'cat-3', name: 'Carpenter', startingPrice: 399, rating: 4.7, duration: 'Per Hour', status: 'Active', bookingsCount: 88 },
  { id: 'cat-4', name: 'Painter', startingPrice: 15, rating: 4.4, duration: 'Per Sq.Ft', status: 'Active', bookingsCount: 42 },
  { id: 'cat-5', name: 'AC Repair', startingPrice: 499, rating: 4.5, duration: 'Per Visit', status: 'Active', bookingsCount: 150 },
  { id: 'cat-8', name: 'Home Cleaning', startingPrice: 1899, rating: 4.8, duration: 'Per BHK', status: 'Active', bookingsCount: 220 }
];

const defaultBookings = [
  {
    id: 'b1',
    customerName: 'Sandhya Rajesh',
    customerEmail: 'sandhya.r@gmail.com',
    customerPhone: '+91 98431 87654',
    providerName: 'Priya Sharma',
    providerEmail: 'priya.s@smartserve.ai',
    providerPhone: '+91 98432 01202',
    date: '2026-07-02',
    time: '10:00 AM',
    serviceType: 'Home Cleaning',
    serviceName: 'Full Home Deep Cleaning',
    amount: 3499,
    status: 'Pending'
  },
  {
    id: 'b2',
    customerName: 'Manoj Kumar',
    customerEmail: 'manoj.k@yahoo.com',
    customerPhone: '+91 97860 12399',
    providerName: 'Priya Sharma',
    providerEmail: 'priya.s@smartserve.ai',
    providerPhone: '+91 98432 01202',
    date: '2026-07-03',
    time: '02:00 PM',
    serviceType: 'Home Cleaning',
    serviceName: 'Express Kitchen Cleaning',
    amount: 1499,
    status: 'Active'
  },
  {
    id: 'b3',
    customerName: 'Eshwari Srinivasan',
    customerEmail: 'eshwari.s@outlook.com',
    customerPhone: '+91 94435 99887',
    providerName: 'Priya Sharma',
    providerEmail: 'priya.s@smartserve.ai',
    providerPhone: '+91 98432 01202',
    date: '2026-06-29',
    time: '11:00 AM',
    serviceType: 'Home Cleaning',
    serviceName: 'Sofa & Upholstery Shampooing',
    amount: 999,
    status: 'Completed'
  },
  {
    id: 'b4',
    customerName: 'Sandhya Rajesh',
    customerEmail: 'sandhya.r@gmail.com',
    customerPhone: '+91 98431 87654',
    providerName: 'Rajesh Kumar',
    providerEmail: 'rajesh.k@smartserve.ai',
    providerPhone: '+91 94432 01201',
    date: '2026-05-12',
    time: '04:00 PM',
    serviceType: 'Electrician',
    serviceName: 'AC Repair & Servicing',
    amount: 899,
    status: 'Completed'
  }
];

const defaultComplaints = [
  {
    id: 'cmp-1',
    customerName: 'Sandhya Rajesh',
    customerEmail: 'sandhya.r@gmail.com',
    providerName: 'Rajesh Kumar',
    providerEmail: 'rajesh.k@smartserve.ai',
    comment: 'The electrician arrived 45 minutes late and didn\'t clean up the packaging materials afterward.',
    status: 'Pending',
    priority: 'Medium',
    date: '2026-07-28',
    resolutionTimeline: 'Resolution within 24 hours expected.'
  },
  {
    id: 'cmp-2',
    customerName: 'Manoj Kumar',
    customerEmail: 'manoj.k@yahoo.com',
    providerName: 'Priya Sharma',
    providerEmail: 'priya.s@smartserve.ai',
    comment: 'The kitchen sink area is still sticky post deep cleaning. Need a re-visit.',
    status: 'Investigating',
    priority: 'High',
    date: '2026-07-26',
    resolutionTimeline: 'Provider contact initiated. Response expected within 12 hours.'
  },
  {
    id: 'cmp-3',
    customerName: 'Eshwari Srinivasan',
    customerEmail: 'eshwari.s@outlook.com',
    providerName: 'Ramesh Chandran',
    providerEmail: 'ramesh.c@smartserve.ai',
    comment: 'Scratch on the wooden cabinet after the drawer fitting.',
    status: 'Resolved',
    priority: 'Low',
    date: '2026-07-15',
    resolutionTimeline: 'Resolved on 2026-07-17. Refund of ₹500 issued.'
  }
];

const defaultNotifications = [
  {
    id: 'an-1',
    title: 'New Provider Registration',
    message: 'Amit Patel registered as a Plumber in Gandhipuram, Coimbatore.',
    time: '5 minutes ago',
    type: 'registration',
    read: false
  },
  {
    id: 'an-2',
    title: 'Customer Complaint Filed',
    message: 'Sandhya Rajesh filed a complaint regarding Rajesh Kumar (Electrician).',
    time: '2 hours ago',
    type: 'complaint',
    read: false
  },
  {
    id: 'an-3',
    title: 'High-Value Booking Alert',
    message: 'Karthik Raja booked Full Home Deep Cleaning for ₹3,499.',
    time: '1 day ago',
    type: 'booking',
    read: true
  },
  {
    id: 'an-4',
    title: 'System Performance Report',
    message: 'Weekly report generated successfully. Total platform revenue is up 12%.',
    time: '2 days ago',
    type: 'system',
    read: true
  }
];

const initStorage = (key, defaultData) => {
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, JSON.stringify(defaultData));
  }
};

const API_URL = '/api/admin';

export const AdminService = {
  initialize: () => {
    // Left empty or basic fallback
  },

  getProfile: () => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    return {
      fullName: user.fullName || 'Gowtham S',
      email: user.email || 'gowtham.s@smartserve.ai',
      phone: user.phone || '+91 98430 12345',
      role: 'Super Administrator',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
      joinedDate: '2025-01-15',
      activeSessions: 3,
      department: 'Operations & Platform Quality'
    };
  },

  updateProfile: async (profile) => {
    const currentUser = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    const response = await fetch('/api/auth/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: currentUser.id, ...profile })
    });
    const data = await response.json();
    if (data.success) {
      localStorage.setItem('smartserve_user', JSON.stringify(data.user));
      return {
        ...AdminService.getProfile(),
        fullName: data.user.fullName,
        email: data.user.email,
        phone: data.user.phone
      };
    }
    return AdminService.getProfile();
  },

  getSettings: async () => {
    try {
      const res = await fetch(`${API_URL}/settings`);
      const data = await res.json();
      if (data.success && data.settings) {
        return data.settings;
      }
      return defaultSettings;
    } catch (e) {
      console.error(e);
      return defaultSettings;
    }
  },

  updateSettings: async (settings) => {
    try {
      const res = await fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success && data.settings) {
        return data.settings;
      }
      return defaultSettings;
    } catch (e) {
      console.error(e);
      return defaultSettings;
    }
  },

  getCustomers: async () => {
    try {
      const res = await fetch(`${API_URL}/customers`);
      const data = await res.json();
      return data.success ? data.customers : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  updateCustomer: async (id, updatedData) => {
    try {
      const res = await fetch(`${API_URL}/customers/update/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
      });
      const data = await res.json();
      return data.success ? data.customer : null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  deleteCustomer: async (id) => {
    try {
      const res = await fetch(`${API_URL}/customers/delete/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      return data.success;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  getProviders: async () => {
    try {
      const res = await fetch(`${API_URL}/providers`);
      const data = await res.json();
      return data.success ? data.providers : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  approveProvider: async (id) => {
    try {
      const res = await fetch(`${API_URL}/providers/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'Approved' })
      });
      const data = await res.json();
      return data.success ? data.provider : null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  rejectProvider: async (id) => {
    try {
      const res = await fetch(`${API_URL}/providers/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'Rejected' })
      });
      const data = await res.json();
      return data.success ? data.provider : null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  deleteProvider: async (id) => {
    try {
      const res = await fetch(`${API_URL}/providers/delete/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      return data.success;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  getServices: async () => {
    try {
      const res = await fetch(`${API_URL}/services`);
      const data = await res.json();
      return data.success ? data.services : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  addService: async (service) => {
    try {
      const res = await fetch(`${API_URL}/services/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(service)
      });
      const data = await res.json();
      return data.success ? data.service : null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  updateService: async (id, serviceData) => {
    try {
      const res = await fetch(`${API_URL}/services/update/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceData)
      });
      const data = await res.json();
      return data.success ? data.service : null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  deleteService: async (id) => {
    try {
      const res = await fetch(`${API_URL}/services/delete/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      return data.success;
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  getBookings: async () => {
    try {
      const res = await fetch(`${API_URL}/bookings`);
      const data = await res.json();
      return data.success ? data.bookings.map(b => ({ ...b, id: b.bookingId || b._id })) : [];
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
      return data.success ? data.booking : null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  getComplaints: async () => {
    try {
      const res = await fetch(`${API_URL}/complaints`);
      const data = await res.json();
      return data.success ? data.complaints : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  updateComplaintStatus: async (id, status) => {
    try {
      const res = await fetch(`${API_URL}/complaints/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      const data = await res.json();
      return data.success ? data.complaint : null;
    } catch (e) {
      console.error(e);
      return null;
    }
  },

  getNotifications: async () => {
    try {
      const res = await fetch(`${API_URL}/notifications`);
      const data = await res.json();
      return data.success ? data.notifications : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  addNotification: (notif) => {
    return;
  },

  markNotificationsAsRead: async () => {
    try {
      const res = await fetch(`${API_URL}/notifications/mark-read`, {
        method: 'POST'
      });
      const data = await res.json();
      return data.success ? data.notifications : [];
    } catch (e) {
      console.error(e);
      return [];
    }
  }
};
