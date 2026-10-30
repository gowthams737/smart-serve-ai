import React, { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  MapPin, 
  Star, 
  IndianRupee, 
  Heart, 
  Filter, 
  Calendar, 
  Clock, 
  X, 
  Check, 
  Phone, 
  Mail,
  Award,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Mic,
  Bot,
  Image as ImageIcon,
  AlertCircle,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { CustomerService, serviceCategories } from '../../services/customerService';
import { formatWorkingHours } from '../../utils/timeFormat';
import DateInput from '../../components/DateInput';
import {
  formatDateDDMMYYYY,
  getTodayDDMMYYYY,
  parseDDMMYYYY,
  isValidDDMMYYYY,
  areDatesEqual,
  getDayOfWeek
} from '../../utils/dateFormat';

const CustomerProviders = () => {
  const { darkMode } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Lists
  const [providers, setProviders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visibleCount, setVisibleCount] = useState(6);

  // Search & Filter state
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || 'All',
    service: searchParams.get('service') || '',
    serviceId: searchParams.get('serviceId') || '',
    city: 'Coimbatore',
    minRating: 0,
    maxPrice: 3000,
    minExperience: 0,
    availability: 'All',
    sortBy: 'recommended'
  });

  // AI Smart Search states
  const [isListening, setIsListening] = useState(false);
  const [searchHistory, setSearchHistory] = useState(() => {
    const saved = localStorage.getItem('smartserve_search_history');
    return saved ? JSON.parse(saved) : ['Electrician', 'AC Repair', 'Pest Control'];
  });
  const [suggestions, setSuggestions] = useState([]);

  // Modal states
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [activeTab, setActiveTab] = useState('about'); // 'about', 'pricing', 'reviews', 'portfolio'
  const [bookingProvider, setBookingProvider] = useState(null);
  
  // Booking Form State
  const [bookingForm, setBookingForm] = useState({
    date: '',
    time: '10:00 AM',
    address: '',
    service: ''
  });
  
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');

  const generateTimeSlots = (workingHours) => {
    const startStr = workingHours?.start || '09:00';
    const endStr = workingHours?.end || '18:00';

    const parseHour = (str) => {
      if (!str) return 9;
      const parts = str.split(':');
      return parseInt(parts[0], 10) || 9;
    };

    const startH = parseHour(startStr);
    const endH = parseHour(endStr);
    const slots = [];

    for (let h = startH; h < endH; h++) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayH = h % 12 === 0 ? 12 : h % 12;
      const formatted = `${String(displayH).padStart(2, '0')}:00 ${ampm}`;
      slots.push(formatted);
    }

    if (slots.length === 0) {
      return ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];
    }
    return slots;
  };

  // Sync filters with searchParams
  useEffect(() => {
    const q = searchParams.get('search');
    const cat = searchParams.get('category');
    const srv = searchParams.get('service');
    const srvId = searchParams.get('serviceId');

    setFilters(prev => ({
      ...prev,
      search: q !== null ? q : prev.search,
      category: cat !== null ? cat : prev.category,
      service: srv !== null ? srv : prev.service,
      serviceId: srvId !== null ? srvId : prev.serviceId
    }));
  }, [searchParams]);

  useEffect(() => {
    const loadStatic = async () => {
      try {
        const cats = await CustomerService.getServiceCategories();
        setCategories(cats);
        const saved = await CustomerService.getSavedProviders();
        setSavedIds(saved);
      } catch (e) {
        console.error('Failed to load static filters:', e);
      }
    };
    loadStatic();
    setCities(CustomerService.getCities());
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters]);

  const applyFilters = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await CustomerService.getProviders(filters);
      const seen = new Set();
      const unique = [];
      for (const p of (list || [])) {
        const idStr = String(p.id || p._id);
        if (!seen.has(idStr)) {
          seen.add(idStr);
          unique.push(p);
        }
      }
      setProviders(unique);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load providers:', err);
      setError(err.message || 'Unable to connect to service registry.');
      setLoading(false);
    }
  };

  const handleFilterChange = (key, val) => {
    setFilters(prev => ({ ...prev, [key]: val }));
    setVisibleCount(6);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      category: 'All',
      service: '',
      serviceId: '',
      city: 'Coimbatore',
      minRating: 0,
      maxPrice: 3000,
      minExperience: 0,
      availability: 'All',
      sortBy: 'recommended'
    });
    setSearchParams({});
    setVisibleCount(6);
  };

  const handleRemoveServiceFilter = () => {
    setFilters(prev => ({ ...prev, service: '', serviceId: '' }));
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('service');
    newParams.delete('serviceId');
    setSearchParams(newParams);
  };

  const hasActiveFilters = 
    filters.search !== '' ||
    filters.category !== 'All' ||
    filters.service !== '' ||
    filters.serviceId !== '' ||
    filters.minRating > 0 ||
    filters.maxPrice < 3000 ||
    filters.minExperience > 0 ||
    filters.availability !== 'All' ||
    filters.sortBy !== 'recommended';

  const handleToggleSave = async (providerId, e) => {
    e.stopPropagation();
    const updated = await CustomerService.toggleSaveProvider(providerId);
    setSavedIds(updated);
  };

  const openDetails = (provider) => {
    setSelectedProvider(provider);
    setActiveTab('about');
  };

  const startBooking = (provider) => {
    setBookingProvider(provider);
    const slots = generateTimeSlots(provider.workingHours);
    setBookingError('');

    // Pre-select target service if filter is active and matches provider's pricing
    const targetService = filters.service && provider.pricing.some(p => p.service === filters.service)
      ? filters.service
      : (provider.pricing[0]?.service || provider.category);

    const currentUser = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    const roomsParam = searchParams.get('rooms');
    setBookingForm({
      date: getTodayDDMMYYYY(),
      time: slots[0] || '10:00 AM',
      address: currentUser.address || '',
      service: targetService,
      rooms: roomsParam ? parseInt(roomsParam, 10) : undefined
    });
    setSelectedProvider(null);
  };

  const submitBooking = async (e) => {
    e.preventDefault();
    if (!bookingForm.date) return;
    setBookingError('');

    if (!bookingForm.address || !bookingForm.address.trim()) {
      setBookingError('Please enter your service address in Coimbatore.');
      return;
    }

    if (bookingProvider.isOnline === false) {
      setBookingError('This service provider is currently offline and not accepting new bookings.');
      return;
    }

    const parsed = parseDDMMYYYY(bookingForm.date);
    if (!parsed.valid) {
      setBookingError(parsed.error || 'Please enter a valid appointment date in DD/MM/YYYY format.');
      return;
    }

    const holidays = bookingProvider.holidays || bookingProvider.blockedDates || [];
    if (holidays.some(h => areDatesEqual(h, parsed.formatted))) {
      setBookingError(`The provider has marked ${parsed.formatted} as a holiday and is unavailable.`);
      return;
    }

    const workingDays = bookingProvider.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const dayOfWeek = getDayOfWeek(parsed.formatted);
    if (!workingDays.includes(dayOfWeek)) {
      setBookingError(`The provider does not work on ${dayOfWeek}s. Active working days are: ${workingDays.join(', ')}.`);
      return;
    }

    const unsupportedCities = ['chennai', 'bangalore', 'bengaluru', 'mumbai', 'delhi', 'hyderabad', 'kolkata', 'kochi', 'madurai', 'salem', 'trichy', 'tirupur', 'erode'];
    if (unsupportedCities.some(c => (bookingForm.address || '').toLowerCase().includes(c))) {
      setBookingError('Service delivery is supported only within Coimbatore, Tamil Nadu, India.');
      return;
    }

    setBookingLoading(true);
    const serviceDetails = bookingProvider.pricing.find(p => p.service === bookingForm.service) || { price: bookingProvider.price };
    const price = serviceDetails.price;
    const currentUser = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    
    const newBooking = {
      providerId: bookingProvider.id,
      providerName: bookingProvider.name,
      providerEmail: bookingProvider.email,
      providerPhone: bookingProvider.phone,
      providerPhoto: bookingProvider.photo,
      service: bookingForm.service,
      category: bookingProvider.category,
      date: parsed.formatted, // DD/MM/YYYY
      time: bookingForm.time,
      address: bookingForm.address,
      customerAddress: bookingForm.address,
      customerPhone: currentUser.phone,
      customerName: currentUser.fullName,
      customerEmail: currentUser.email,
      city: 'Coimbatore',
      price: price,
      total: price,
      rooms: bookingForm.rooms
    };

    try {
      await CustomerService.createBooking(newBooking);
      setBookingLoading(false);
      setBookingSuccess(true);
    } catch (err) {
      setBookingLoading(false);
      setBookingError(err.message || 'Failed to complete booking. Please try another slot or date.');
    }
  };

  const handleVoiceSearch = () => {
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      handleFilterChange('search', 'Electrician');
      saveSearchToHistory('Electrician');
    }, 1800);
  };

  const saveSearchToHistory = (query) => {
    if (!query) return;
    setSearchHistory(prev => {
      const filtered = prev.filter(h => h.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, 5);
      localStorage.setItem('smartserve_search_history', JSON.stringify(updated));
      return updated;
    });
  };

  const closeBookingFlow = () => {
    setBookingProvider(null);
    setBookingSuccess(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Voice Search active overlay */}
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center"
          >
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-red-600/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
                <Mic className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-extrabold text-white">Listening...</h3>
              <p className="text-xs text-slate-400">Try saying "Electrician" or "Deep Cleaning"</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className={`p-6 rounded-[32px] border relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
        darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-2xl rounded-full" />
        <div>
          <h2 className={`text-3xl font-extrabold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            <Bot className="w-7 h-7 text-blue-500" />
            Service Providers
          </h2>
          <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
            Verified Coimbatore experts, genuine registered rates with zero platform fees.
          </p>
        </div>

        {/* AI search control with explicit Search button */}
        <div className="w-full md:w-auto flex-1 max-w-md space-y-2 relative">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              saveSearchToHistory(filters.search);
              applyFilters();
            }}
            className="relative flex items-center"
          >
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => {
                handleFilterChange('search', e.target.value);
                saveSearchToHistory(e.target.value);
              }}
              placeholder="Search providers..."
              className={`w-full pl-10 pr-24 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}
            />
            <div className="absolute right-1.5 flex items-center gap-1">
              <button
                type="button"
                onClick={handleVoiceSearch}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                title="Voice Search"
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] uppercase tracking-wider shadow-sm transition-all"
              >
                Find
              </button>
            </div>
          </form>

          {/* Trending & History */}
          <div className="flex flex-wrap gap-2 text-[10px] font-bold">
            <span className="text-slate-500 self-center">Trending:</span>
            {['Electrician', 'Plumber', 'AC Repair', 'Deep Cleaning'].map((t) => (
              <button
                key={t}
                onClick={() => {
                  handleFilterChange('search', t);
                  saveSearchToHistory(t);
                }}
                className={`px-2 py-0.5 rounded border transition-colors ${
                  darkMode ? 'bg-slate-900 border-white/5 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active Service Badge indicator if navigated from a specific service */}
      {filters.service && (
        <div className={`p-4 rounded-2xl border flex justify-between items-center text-xs font-semibold ${
          darkMode ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span>Showing registered providers offering: <strong className="font-extrabold">{filters.service}</strong></span>
          </div>
          <button
            onClick={handleRemoveServiceFilter}
            className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider hover:underline"
          >
            <span>Remove filter</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar Filters */}
        <div className={`p-6 rounded-3xl border h-fit space-y-6 ${
          darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between font-bold text-sm">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-500" />
              <span>Search Filters</span>
            </div>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-xs text-rose-500 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
          
          <hr className={darkMode ? 'border-slate-800' : 'border-slate-100'} />

          {/* Text Search */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Keyword Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search providers..."
                className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Category</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className={`w-full p-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <option value="All">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id || cat._id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* City Filter */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Location</label>
            <select
              value={filters.city}
              onChange={(e) => handleFilterChange('city', e.target.value)}
              className={`w-full p-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              {cities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Availability Filter */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Availability</label>
            <select
              value={filters.availability}
              onChange={(e) => handleFilterChange('availability', e.target.value)}
              className={`w-full p-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <option value="All">All Providers</option>
              <option value="Available Today">Available Today</option>
              <option value="Online Now">Online Now</option>
            </select>
          </div>

          {/* Minimum Rating */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Min Rating</label>
            <div className="flex gap-2">
              {[0, 3, 4, 4.5].map((stars) => (
                <button
                  key={stars}
                  type="button"
                  onClick={() => handleFilterChange('minRating', stars)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${
                    filters.minRating === stars
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : darkMode ? 'bg-slate-950 border-white/5 text-slate-400 hover:bg-slate-900' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {stars === 0 ? 'Any' : `${stars} ★`}
                </button>
              ))}
            </div>
          </div>

          {/* Experience Filter */}
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <span>Experience</span>
              <span className="text-blue-500">{filters.minExperience}+ Years</span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              value={filters.minExperience}
              onChange={(e) => handleFilterChange('minExperience', parseInt(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <span>Max Price</span>
              <span className="text-blue-500">₹{filters.maxPrice.toLocaleString('en-IN')}</span>
            </div>
            <input
              type="range"
              min="100"
              max="3000"
              step="50"
              value={filters.maxPrice}
              onChange={(e) => handleFilterChange('maxPrice', parseInt(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Clear Filters button */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="w-full py-2.5 px-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-500 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-rose-500 hover:text-white transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
        </div>

        {/* Providers Listing column */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* Header controls: Results Count & Sort Dropdown */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <span className={`text-xs font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Showing {Math.min(providers.length, visibleCount)} of {providers.length} verified experts
            </span>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 text-[11px] font-bold uppercase">Sort:</span>
              <select
                value={filters.sortBy || 'recommended'}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className={`p-2 rounded-xl border text-xs font-bold focus:outline-none ${
                  darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              >
                <option value="recommended">Recommended</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating_desc">Highest Rated</option>
                <option value="experience_desc">Most Experienced</option>
              </select>
            </div>
          </div>

          {/* API ERROR STATE & RETRY */}
          {error && (
            <div className="col-span-full p-8 rounded-3xl bg-red-500/10 border border-red-500/20 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 mx-auto flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-red-400">Failed to Load Service Providers</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">{error}</p>
              <button
                onClick={applyFilters}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all"
              >
                Retry
              </button>
            </div>
          )}

          {/* LOADING SKELETON */}
          {loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={`h-72 rounded-3xl border ${darkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-100 border-slate-200'}`} />
              ))}
            </div>
          )}

          {/* PROVIDERS GRID */}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {providers.slice(0, visibleCount).map((p) => {
                const isSaved = savedIds.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => openDetails(p)}
                    className={`p-6 rounded-3xl border flex flex-col justify-between gap-6 cursor-pointer group hover:y-[-4px] transition-all duration-300 ${
                      darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    {/* Top card segment */}
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl overflow-hidden border border-blue-500/20 bg-slate-800 flex-shrink-0 flex items-center justify-center font-bold text-white text-xl">
                          {p.photo ? (
                            <img src={p.photo} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { e.target.style.display = 'none'; }} />
                          ) : (
                            <span>{p.name?.charAt(0) || 'P'}</span>
                          )}
                        </div>
                        <div>
                          <div className="flex flex-wrap gap-1 mb-1">
                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-[9px] font-extrabold text-blue-500 uppercase tracking-widest block w-fit">
                              {p.category}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-green-500/10 text-[9px] font-extrabold text-green-500 uppercase tracking-widest flex items-center gap-0.5 w-fit">
                              <Sparkles className="w-2.5 h-2.5" />
                              {p.rating >= 4.8 && p.reviewsCount > 0 ? 'Highest Rating' : p.price <= 350 ? 'Lowest Price' : p.experience >= 8 ? 'Most Experienced' : 'Verified Professional'}
                            </span>
                          </div>
                          <h4 className={`font-bold text-base leading-snug group-hover:text-blue-500 transition-colors ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {p.name}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5 text-slate-500 text-xs font-semibold">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>{p.city || 'Coimbatore'}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleToggleSave(p.id, e)}
                        className={`p-2.5 rounded-xl border flex items-center justify-center transition-colors ${
                          isSaved
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                            : darkMode ? 'bg-slate-950 border-white/5 text-slate-400 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isSaved ? 'fill-rose-500' : ''}`} />
                      </button>
                    </div>

                    {/* Professional Bio / Description */}
                    {(p.bio || p.about) && (
                      <p className={`text-xs line-clamp-2 leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {p.bio || p.about}
                      </p>
                    )}

                    {/* Key Provider Highlights: Experience & Working Hours */}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                        <Award className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <span>{p.experience} Yrs Experience</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                        <Clock className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <span>
                          {formatWorkingHours(p.workingHours)}
                        </span>
                      </span>
                    </div>

                    {/* Skills/Tags */}
                    <div className="flex flex-wrap gap-1.5">
                      {(p.skills || []).slice(0, 3).map((s, i) => (
                        <span key={i} className={`text-[10px] px-2 py-1 rounded-lg ${
                          darkMode ? 'bg-slate-950 text-slate-400 border border-white/5' : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {s}
                        </span>
                      ))}
                      {(p.skills || []).length > 3 && (
                        <span className="text-[10px] text-slate-500 font-bold px-1.5 py-1">+{(p.skills || []).length - 3} more</span>
                      )}
                    </div>

                    {/* Services Offered */}
                    {p.pricing && p.pricing.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Offered Services ({p.pricing.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {p.pricing.map((svc, idx) => (
                            <span
                              key={svc.id || idx}
                              className={`text-[10px] px-2.5 py-1 rounded-lg font-semibold border ${
                                darkMode ? 'bg-slate-950 border-white/5 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            >
                              {svc.service || svc.name} — ₹{svc.price}
                              {svc.duration && svc.duration !== 'Duration not available' ? ` • ${svc.duration}` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <hr className={darkMode ? 'border-slate-800' : 'border-slate-100'} />

                    {/* Pricing and Details */}
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black block">Rates from</span>
                        <span className="text-lg font-black text-blue-500">
                          ₹{(p.rate || p.price).toLocaleString('en-IN')}{' '}
                          <span className="text-xs text-slate-500 font-medium">
                            /{p.pricingUnit || p.pricing?.[0]?.unit || serviceCategories.find(c => c.name === p.category)?.unit || 'visit'}
                          </span>
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-right text-xs">
                        {p.reviewsCount > 0 && p.rating > 0 ? (
                          <div>
                            <div className="flex items-center gap-1 text-amber-500 font-bold justify-end">
                              <Star className="w-3.5 h-3.5 fill-amber-500" />
                              <span>{p.rating}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 font-semibold block">{p.reviewsCount} review{p.reviewsCount > 1 ? 's' : ''}</span>
                          </div>
                        ) : (
                          <div className="text-right">
                            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-[10px] font-bold text-blue-400 block">
                              New Provider
                            </span>
                            <span className="text-[9px] text-slate-500 block mt-0.5">No reviews yet</span>
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startBooking(p);
                          }}
                          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* EXACT EMPTY STATE REQUIREMENT */}
              {providers.length === 0 && (
                <div className="col-span-full py-16 text-center rounded-3xl border border-dashed border-slate-700/50 p-8 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 mx-auto flex items-center justify-center text-blue-500">
                    <AlertCircle className="w-7 h-7" />
                  </div>
                  {(filters.category !== 'All' || filters.service || filters.serviceId) ? (
                    <div className="space-y-1.5 max-w-md mx-auto">
                      <h4 className={`text-lg font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        No Providers Available for This Service
                      </h4>
                      <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} leading-relaxed`}>
                        There are currently no eligible providers registered for this service. Please check back later or browse other services.
                      </p>
                      <div className="flex justify-center gap-3 pt-3">
                        <Link
                          to="/customer/services"
                          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all"
                        >
                          Browse Other Services
                        </Link>
                        <button
                          onClick={handleClearFilters}
                          className={`px-4 py-2.5 rounded-xl border font-bold text-xs uppercase tracking-wider transition-all ${
                            darkMode ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Clear Filters
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-w-md mx-auto">
                      <h4 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        No Service Providers Found
                      </h4>
                      <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} leading-relaxed`}>
                        No service providers match your current search and filter criteria. Try clearing filters or searching for another keyword.
                      </p>
                      <div className="pt-2">
                        <button
                          onClick={handleClearFilters}
                          className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs uppercase tracking-wider"
                        >
                          Clear Filters
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Load More Providers */}
          {!loading && !error && providers.length > visibleCount && (
            <div className="text-center pt-4">
              <button
                onClick={() => setVisibleCount(prev => prev + 6)}
                className={`px-6 py-3 rounded-2xl border font-bold text-xs uppercase tracking-wider transition-all ${
                  darkMode ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Load More Providers ({providers.length - visibleCount} remaining)
              </button>
            </div>
          )}

        </div>
      </div>

      {/* PROVIDER DETAILS DIALOG MODAL */}
      <AnimatePresence>
        {selectedProvider && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-3xl rounded-[32px] border overflow-hidden shadow-2xl max-h-[85vh] flex flex-col justify-between ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              {/* Header profile */}
              <div className="relative h-44 bg-slate-800 flex-shrink-0">
                <img src={selectedProvider.coverImage} alt="Cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                <button
                  onClick={() => setSelectedProvider(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-slate-950/60 text-white hover:bg-slate-900 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-4 left-6 flex items-end gap-4">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-slate-900 bg-slate-800 flex items-center justify-center font-bold text-white text-2xl flex-shrink-0">
                    {selectedProvider.photo ? (
                      <img src={selectedProvider.photo} alt={selectedProvider.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                    ) : (
                      <span>{selectedProvider.name?.charAt(0) || 'P'}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-extrabold text-xl leading-tight">{selectedProvider.name}</h3>
                    <p className="text-xs text-slate-300 font-semibold mt-0.5">
                      {selectedProvider.category} • {selectedProvider.experience} Yrs Exp • ₹{(selectedProvider.rate || selectedProvider.price).toLocaleString('en-IN')} / {selectedProvider.pricingUnit || 'visit'}
                      {selectedProvider.reviewsCount > 0 ? ` • ${selectedProvider.rating}★ (${selectedProvider.reviewsCount})` : ' • New Provider'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className={`flex border-b px-6 flex-shrink-0 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                {['about', 'pricing', 'reviews', 'portfolio'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-4 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                      activeTab === tab
                        ? 'border-blue-500 text-blue-500'
                        : darkMode ? 'border-transparent text-slate-500 hover:text-white' : 'border-transparent text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tabs Content */}
              <div className="p-6 overflow-y-auto space-y-6 flex-grow">
                {activeTab === 'about' && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>About the Expert</h4>
                      <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {selectedProvider.bio || selectedProvider.about}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                        <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Working Hours</span>
                        <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-900'} mt-1 block`}>
                          {formatWorkingHours(selectedProvider.workingHours)}
                        </span>
                      </div>
                      <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                        <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Experience</span>
                        <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-900'} mt-1 block`}>
                          {selectedProvider.experience} Years
                        </span>
                      </div>
                      <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                        <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Gender</span>
                        <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-900'} mt-1 block`}>
                          {selectedProvider.gender || 'Not specified'}
                        </span>
                      </div>
                      <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                        <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Age</span>
                        <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-900'} mt-1 block`}>
                          {selectedProvider.age ? `${selectedProvider.age} yrs` : 'Not specified'}
                        </span>
                      </div>
                    </div>

                    {/* Provider Contact Section */}
                    {(selectedProvider.phone || selectedProvider.email) && (
                      <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2">Provider Contact Information</span>
                        <div className="flex flex-wrap gap-4 text-xs font-semibold">
                          {selectedProvider.phone && (
                            <span className="flex items-center gap-1.5 text-slate-300">
                              <Phone className="w-3.5 h-3.5 text-blue-500" /> {selectedProvider.phone}
                            </span>
                          )}
                          {selectedProvider.email && (
                            <span className="flex items-center gap-1.5 text-slate-300">
                              <Mail className="w-3.5 h-3.5 text-blue-500" /> {selectedProvider.email}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>Service Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {(selectedProvider.skills || []).map((skill, i) => (
                          <span key={i} className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                            darkMode ? 'bg-slate-950 text-slate-300 border border-white/5' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'pricing' && (
                  <div className="space-y-4">
                    <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>Service Pricing List</h4>
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-500 font-medium">
                      Additional charges may apply for locations more than 10 km away.
                    </div>
                    <div className="space-y-2">
                      {selectedProvider.pricing?.map((p_item, i) => {
                        const serviceImg = p_item.image || selectedProvider.photo;
                        return (
                          <div key={i} className={`p-4 rounded-2xl border flex justify-between items-center ${
                            darkMode ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-100'
                          }`}>
                            <div className="flex items-center gap-3">
                              {serviceImg && (
                                <img
                                  src={serviceImg}
                                  alt={p_item.service}
                                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-blue-500/20 bg-slate-800"
                                />
                              )}
                              <div>
                                <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-900'} block`}>
                                  {p_item.service}
                                </span>
                                {p_item.description && (
                                  <p className={`text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-500'} line-clamp-1 mt-0.5`}>
                                    {p_item.description}
                                  </p>
                                )}
                                {p_item.duration && (
                                  <span className="text-[10px] text-blue-400 font-semibold block mt-0.5">
                                    Est. {p_item.duration}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-sm font-black text-blue-500 whitespace-nowrap ml-4">
                              ₹{p_item.price}{p_item.unit || selectedProvider.pricingUnit ? ` / ${p_item.unit || selectedProvider.pricingUnit}` : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div className="space-y-4">
                    <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>Customer Reviews</h4>
                    <div className="space-y-4">
                      {((selectedProvider.reviews && selectedProvider.reviews.length > 0)
                        ? selectedProvider.reviews
                        : CustomerService.getProviderReviews(selectedProvider.id)
                      ).map((r) => (
                        <div key={r._id || r.id} className={`p-4 rounded-2xl border ${
                          darkMode ? 'bg-slate-950/30 border-white/5' : 'bg-slate-50 border-slate-100'
                        }`}>
                          <div className="flex justify-between items-center text-xs mb-2">
                            <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{r.customerName}</span>
                            <div className="flex items-center gap-1 text-amber-500 font-bold">
                              <Star className="w-3.5 h-3.5 fill-amber-500" />
                              <span>{r.rating}.0</span>
                            </div>
                          </div>
                          <p className={`text-[11px] leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{r.comment}</p>
                          <span className="text-[9px] text-slate-500 mt-2 block">{formatDateDDMMYYYY(r.date) || r.date} • for {r.serviceTaken || r.service || selectedProvider.category}</span>
                        </div>
                      ))}
                      {(!selectedProvider.reviews || selectedProvider.reviews.length === 0) &&
                        CustomerService.getProviderReviews(selectedProvider.id).length === 0 && (
                        <p className="text-xs text-slate-500 text-center py-4">No reviews yet for this provider.</p>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'portfolio' && (
                  <div className="space-y-4">
                    <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>Previous Project Photos</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {selectedProvider.portfolio?.map((img, i) => (
                        <div key={i} className="h-28 rounded-xl overflow-hidden bg-slate-800">
                          <img src={img} alt="Portfolio Work" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                        </div>
                      ))}
                      {(!selectedProvider.portfolio || selectedProvider.portfolio.length === 0) && (
                        <div className="col-span-full py-8 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                          <ImageIcon className="w-8 h-8 text-slate-600" />
                          <span>No portfolio photos uploaded.</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons footer */}
              <div className={`p-6 border-t flex justify-end gap-3 flex-shrink-0 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <button
                  onClick={() => setSelectedProvider(null)}
                  className={`px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider border transition-colors ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => startBooking(selectedProvider)}
                  className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25"
                >
                  Book Service
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BOOKING DIALOG MODAL FLOW */}
      <AnimatePresence>
        {bookingProvider && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-md rounded-[32px] border p-6 overflow-hidden shadow-2xl ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              {!bookingSuccess ? (
                <form onSubmit={submitBooking} className="space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className={`font-extrabold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        Book Appointment
                      </h3>
                      <p className="text-xs text-slate-500">with {bookingProvider.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={closeBookingFlow}
                      className="p-1.5 rounded-full bg-slate-900/60 text-white hover:bg-slate-900"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <hr className={darkMode ? 'border-slate-800' : 'border-slate-100'} />

                  {/* Select Service */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500">Select Service Variant</label>
                    <select
                      value={bookingForm.service}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, service: e.target.value }))}
                      className={`w-full p-3 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      {bookingProvider.pricing?.map((p_item, i) => (
                        <option key={i} value={p_item.service}>
                          {p_item.service} (₹{p_item.price})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Date */}
                  <div className="space-y-1">
                    <DateInput
                      value={bookingForm.date}
                      onChange={(val) => {
                        setBookingForm(prev => ({ ...prev, date: val }));
                        if (bookingError) setBookingError('');
                      }}
                      label="Choose Appointment Date"
                      disabledDates={bookingProvider.holidays || bookingProvider.blockedDates || []}
                      disabledDaysOfWeek={['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].filter(
                        d => !(bookingProvider.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']).includes(d)
                      )}
                      darkMode={darkMode}
                    />
                  </div>

                  {/* Choose Time */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase text-slate-500">Preferred Time Slot</label>
                      <span className="text-[10px] text-blue-500 font-semibold">
                        Hours: {formatWorkingHours(bookingProvider.workingHours)}
                      </span>
                    </div>
                    <select
                      value={bookingForm.time}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, time: e.target.value }))}
                      className={`w-full p-3 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      {generateTimeSlots(bookingProvider.workingHours).map((slot, i) => (
                        <option key={i} value={slot}>{slot}</option>
                      ))}
                    </select>
                  </div>

                  {/* Delivery Address */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500">Service Delivery Address</label>
                    <textarea
                      required
                      rows={2}
                      value={bookingForm.address}
                      onChange={(e) => setBookingForm(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Enter street/locality in Coimbatore..."
                      className={`w-full p-3 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  <hr className={darkMode ? 'border-slate-800' : 'border-slate-100'} />

                  {/* Price checkout breakdown details */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>Service Package</span>
                      <span className={darkMode ? 'text-white' : 'text-slate-900'}>{bookingForm.service}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Estimated Duration</span>
                      <span className={darkMode ? 'text-white' : 'text-slate-900'}>
                        {bookingProvider.pricing.find(p => p.service === bookingForm.service)?.duration || 'Duration not available'}
                      </span>
                    </div>
                    {bookingForm.rooms && (
                      <div className="flex justify-between text-slate-400">
                        <span>Room Count</span>
                        <span className={darkMode ? 'text-white' : 'text-slate-900'}>{bookingForm.rooms} Room(s)</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-400">
                      <span>Provider Service Fee</span>
                      <span>₹{bookingProvider.pricing.find(p => p.service === bookingForm.service)?.price || bookingProvider.price}</span>
                    </div>
                    <div className="flex justify-between font-black text-blue-500 text-sm pt-2">
                      <span>Total</span>
                      <span>₹{bookingProvider.pricing.find(p => p.service === bookingForm.service)?.price || bookingProvider.price}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={closeBookingFlow}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider border transition-colors ${
                        darkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        bookingLoading ||
                        bookingProvider.isOnline === false ||
                        (bookingForm.date && (bookingProvider.holidays || bookingProvider.blockedDates || []).some(h => areDatesEqual(h, bookingForm.date))) ||
                        (bookingForm.date && isValidDDMMYYYY(bookingForm.date) && !(bookingProvider.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']).includes(getDayOfWeek(bookingForm.date)))
                      }
                      className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5 transition-all ${
                        bookingProvider.isOnline === false ||
                        (bookingForm.date && (bookingProvider.holidays || bookingProvider.blockedDates || []).some(h => areDatesEqual(h, bookingForm.date))) ||
                        (bookingForm.date && isValidDDMMYYYY(bookingForm.date) && !(bookingProvider.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']).includes(getDayOfWeek(bookingForm.date)))
                          ? 'bg-slate-700 cursor-not-allowed opacity-50'
                          : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'
                      }`}
                    >
                      {bookingLoading ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          <span>Reserving...</span>
                        </>
                      ) : (
                        <span>Confirm Appointment</span>
                      )}
                    </button>
                  </div>

                  {bookingError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{bookingError}</span>
                    </div>
                  )}
                </form>
              ) : (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mx-auto text-3xl">
                    <Check className="w-8 h-8" />
                  </div>
                  <h3 className={`text-xl font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Booking Confirmed!</h3>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Your appointment has been registered with {bookingProvider.name} for {bookingForm.date} at {bookingForm.time}.
                  </p>
                  <div className="pt-4">
                    <button
                      onClick={closeBookingFlow}
                      className="w-full py-3 rounded-2xl bg-blue-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default CustomerProviders;
