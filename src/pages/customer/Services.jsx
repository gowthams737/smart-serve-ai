import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Star, 
  ArrowRight, 
  Zap, 
  Sparkles, 
  Mic, 
  Bot, 
  Filter, 
  RotateCcw, 
  Clock, 
  MapPin, 
  SlidersHorizontal, 
  CheckCircle, 
  AlertCircle,
  Grid3X3,
  Layers,
  ChevronDown
} from 'lucide-react';
import { CustomerService } from '../../services/customerService';

const CustomerServices = () => {
  const { darkMode } = useOutletContext();
  const navigate = useNavigate();

  // Data states
  const [categories, setCategories] = useState([]);
  const [servicesCatalog, setServicesCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search & Suggestion states
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isListening, setIsListening] = useState(false);

  // Filter states
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'services'
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [maxPrice, setMaxPrice] = useState(5000);
  const [minRating, setMinRating] = useState(0);
  const [availability, setAvailability] = useState('All'); // 'All' | 'Available Today' | 'Online Now'
  const [selectedCity, setSelectedCity] = useState('Coimbatore');
  const [sortBy, setSortBy] = useState('recommended'); // 'recommended' | 'price_asc' | 'price_desc' | 'rating_desc'

  // Pagination / Load more
  const [visibleCount, setVisibleCount] = useState(9);

  const cities = ['Coimbatore'];

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, catalog] = await Promise.all([
        CustomerService.getServiceCategories(),
        CustomerService.getServicesCatalog()
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setServicesCatalog(Array.isArray(catalog) ? catalog : []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load services data:', err);
      setError(err.message || 'Unable to connect to service registry. Please retry.');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Voice Search simulation
  const handleVoiceSearch = () => {
    setIsListening(true);
    setTimeout(() => {
      setIsListening(false);
      const recognized = 'Electrician';
      setSearchQuery(recognized);
      setSelectedCategory('Electrician');
      setActiveTab('services');
    }, 1800);
  };

  // Search input change & autocomplete suggestions
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (val.trim().length > 1) {
      const q = val.toLowerCase().trim();
      const matchedCats = categories
        .filter(c => c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q))
        .map(c => ({
          type: 'category',
          id: c.id || c._id,
          name: c.name,
          category: c.name,
          icon: c.icon || '⚡',
          startingPrice: c.startingPrice
        }));

      const matchedServices = servicesCatalog
        .filter(s => s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q))
        .map(s => ({
          type: 'service',
          id: s.id || s._id,
          name: s.name,
          category: s.category,
          icon: '🛠️',
          startingPrice: s.price
        }));

      setSuggestions([...matchedCats, ...matchedServices].slice(0, 6));
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (item) => {
    setSearchQuery(item.name);
    setSuggestions([]);
    if (item.type === 'category') {
      setSelectedCategory(item.name);
      navigate(`/customer/providers?category=${encodeURIComponent(item.name)}`);
    } else {
      setSelectedCategory(item.category || 'All');
      navigate(`/customer/providers?category=${encodeURIComponent(item.category || '')}&service=${encodeURIComponent(item.name)}&serviceId=${encodeURIComponent(item.id)}`);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSuggestions([]);
    if (searchQuery.trim()) {
      navigate(`/customer/providers?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleTrendingClick = (term) => {
    setSearchQuery(term);
    setSelectedCategory(term);
    setSuggestions([]);
    navigate(`/customer/providers?search=${encodeURIComponent(term)}`);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setMaxPrice(5000);
    setMinRating(0);
    setAvailability('All');
    setSelectedCity('Coimbatore');
    setSortBy('recommended');
    setVisibleCount(9);
    setSuggestions([]);
  };

  const hasActiveFilters = 
    searchQuery.trim() !== '' || 
    selectedCategory !== 'All' || 
    maxPrice < 5000 || 
    minRating > 0 || 
    availability !== 'All' || 
    sortBy !== 'recommended';

  // Filter & sort Categories
  const filteredCategories = categories.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
    const matchesCat = selectedCategory === 'All' || c.name.toLowerCase() === selectedCategory.toLowerCase();
    const matchesPrice = !maxPrice || (c.startingPrice || 0) <= maxPrice;
    const matchesRating = !minRating || (c.rating || 0) >= minRating;
    return matchesSearch && matchesCat && matchesPrice && matchesRating;
  }).sort((a, b) => {
    if (sortBy === 'price_asc') return (a.startingPrice || 0) - (b.startingPrice || 0);
    if (sortBy === 'price_desc') return (b.startingPrice || 0) - (a.startingPrice || 0);
    if (sortBy === 'rating_desc') return (b.rating || 0) - (a.rating || 0);
    return 0;
  });

  // Filter & sort Services
  const filteredServices = servicesCatalog.filter(s => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      s.name.toLowerCase().includes(q) || 
      (s.description || '').toLowerCase().includes(q) || 
      (s.category || '').toLowerCase().includes(q) ||
      (s.provider?.name || '').toLowerCase().includes(q);
    
    const matchesCat = selectedCategory === 'All' || 
      (s.category || '').toLowerCase() === selectedCategory.toLowerCase() ||
      (s.provider?.category || '').toLowerCase() === selectedCategory.toLowerCase();
    
    const matchesPrice = !maxPrice || s.price <= maxPrice;
    const matchesRating = !minRating || (s.rating || s.provider?.rating || 0) >= minRating;
    const matchesCity = !selectedCity || selectedCity === 'All' || selectedCity === 'Coimbatore' || (s.provider?.city || 'Coimbatore').toLowerCase() === selectedCity.toLowerCase();
    
    let matchesAvail = true;
    if (availability === 'Online Now') {
      matchesAvail = s.provider?.isOnline === true;
    }

    return matchesSearch && matchesCat && matchesPrice && matchesRating && matchesCity && matchesAvail;
  }).sort((a, b) => {
    if (sortBy === 'price_asc') return a.price - b.price;
    if (sortBy === 'price_desc') return b.price - a.price;
    if (sortBy === 'rating_desc') return (b.rating || 0) - (a.rating || 0);
    return 0;
  });

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      
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
              <p className="text-xs text-slate-400">Say what you are looking for, e.g. "Electrician" or "Deep Cleaning"</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <div className={`p-8 lg:p-12 rounded-[32px] text-center relative overflow-hidden border ${
        darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-blue-600/5 blur-[100px] rounded-full -z-10" />
        
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-500 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Marketplace</span>
          </div>
          <h2 className={`text-4xl font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Explore Professional Services
          </h2>
          <p className={`${darkMode ? 'text-slate-400' : 'text-slate-600'} text-sm leading-relaxed`}>
            Instantly connect with certified, background-checked service experts in Coimbatore. Transparent pricing with zero platform fees.
          </p>

          {/* Search Form with explicit Submit Button */}
          <form onSubmit={handleSearchSubmit} className="relative max-w-xl mx-auto space-y-3">
            <div className="relative flex items-center">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search services..."
                className={`w-full pl-12 pr-28 py-3.5 rounded-2xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all ${
                  darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleVoiceSearch}
                  className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors"
                  title="Voice Search"
                >
                  <Mic className="w-4 h-4" />
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-500/25 transition-all"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Trending / Popular search tags */}
            <div className="flex flex-wrap gap-2 justify-center text-xs font-semibold pt-1">
              <span className="text-slate-500">Trending:</span>
              {['Electrician', 'Plumber', 'AC Repair', 'Deep Cleaning', 'Painter', 'Pest Control'].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleTrendingClick(item)}
                  className={`px-2.5 py-0.5 rounded-full border transition-colors ${
                    darkMode ? 'bg-slate-900 border-white/5 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            {/* Autocomplete suggestions dropdown */}
            {suggestions.length > 0 && (
              <div className={`absolute top-full left-0 w-full mt-2 border rounded-2xl p-2 shadow-2xl z-50 text-left ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                {suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSuggestionClick(item)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-blue-500 hover:text-white transition-colors ${
                      darkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span>{item.icon}</span>
                      <span className="text-left font-semibold">{item.name}</span>
                      <span className="text-[10px] opacity-50 uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-800">
                        {item.type}
                      </span>
                    </div>
                    <span className="text-[11px] opacity-75">From ₹{item.startingPrice}</span>
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>
      </div>

      {/* FILTER & VIEW CONTROLS BAR */}
      <div className={`p-6 rounded-3xl border space-y-4 ${
        darkMode ? 'bg-slate-900/40 border-white/10' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        {/* Top bar: View Switcher and Active Filter Summary */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Mode Switcher */}
          <div className="flex p-1 rounded-2xl border bg-slate-950/20 border-white/5">
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'categories'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>Categories ({filteredCategories.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'services'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Services Catalog ({filteredServices.length})</span>
            </button>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs font-bold text-rose-500 hover:text-rose-400 flex items-center gap-1.5 transition-colors self-end sm:self-center"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear All Filters</span>
            </button>
          )}
        </div>

        <hr className={darkMode ? 'border-slate-800' : 'border-slate-100'} />

        {/* Filter controls row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* Category Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`w-full p-2.5 rounded-xl border font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <option value="All">All Categories</option>
              {categories.map((c) => (
                <option key={c.id || c._id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Location / City */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Location</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className={`w-full p-2.5 rounded-xl border font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              {cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          {/* Availability */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Availability</label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              className={`w-full p-2.5 rounded-xl border font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <option value="All">All Providers</option>
              <option value="Available Today">Available Today</option>
              <option value="Online Now">Online Now</option>
            </select>
          </div>

          {/* Min Rating */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Min Rating</label>
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className={`w-full p-2.5 rounded-xl border font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <option value="0">Any Rating</option>
              <option value="3">3★ & Above</option>
              <option value="4">4★ & Above</option>
              <option value="4.5">4.5★ & Above</option>
            </select>
          </div>

          {/* Max Price */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-500">
              <span>Max Price</span>
              <span className="text-blue-500 font-extrabold">₹{maxPrice}</span>
            </div>
            <input
              type="range"
              min="100"
              max="5000"
              step="50"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer mt-2"
            />
          </div>

          {/* Sorting */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`w-full p-2.5 rounded-xl border font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            >
              <option value="recommended">Recommended</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="rating_desc">Highest Rated</option>
            </select>
          </div>
        </div>
      </div>

      {/* ERROR STATE & RETRY */}
      {error && (
        <div className="p-6 rounded-3xl bg-red-500/10 border border-red-500/20 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-base text-red-400">Failed to Load Service Data</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">{error}</p>
          <button
            onClick={loadData}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* LOADING SKELETON */}
      {loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={`h-80 rounded-3xl border ${darkMode ? 'bg-slate-900/40 border-white/5' : 'bg-slate-100 border-slate-200'}`} />
          ))}
        </div>
      )}

      {/* ─── TAB 1: POPULAR CATEGORIES ─── */}
      {!loading && !error && activeTab === 'categories' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Popular Categories</h3>
            <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Found {filteredCategories.length} categories
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.slice(0, visibleCount).map((c) => (
              <motion.div
                key={c.id || c._id}
                whileHover={{ y: -6 }}
                className={`rounded-3xl border overflow-hidden flex flex-col justify-between ${
                  darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                {/* Category banner image */}
                <div className="h-44 relative bg-slate-800">
                  <img src={c.image} alt={c.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                  <div className="absolute bottom-4 left-4 flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-lg bg-white/15 backdrop-blur-md border border-white/20">
                      {c.icon || '⚡'}
                    </div>
                    <div>
                      <h4 className="text-white font-extrabold text-lg">{c.name}</h4>
                      <span className="text-[10px] text-blue-300 font-bold block">
                        {c.providersCount > 0 ? `${c.providersCount} Provider${c.providersCount > 1 ? 's' : ''} Available` : 'Registration Open'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* content */}
                <div className="p-6 space-y-4">
                  <p className={`text-xs leading-relaxed line-clamp-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {c.description || `Professional ${c.name} services by verified Coimbatore experts.`}
                  </p>

                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Avg. Duration</span>
                    <span className={darkMode ? 'text-white' : 'text-slate-900'}>{c.duration || 'Per Visit'}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Category Rating</span>
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      <span>{c.rating || 5.0}</span>
                    </div>
                  </div>

                  <hr className={darkMode ? 'border-slate-800' : 'border-slate-100'} />

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Starting Price</span>
                      <span className="text-xl font-black text-blue-500">₹{c.startingPrice}</span>
                      <p className="text-[9px] text-slate-400 mt-0.5">Additional charges may apply for locations more than 10 km away.</p>
                    </div>
                    <button
                      onClick={() => navigate(`/customer/providers?category=${encodeURIComponent(c.name)}`)}
                      className="flex items-center gap-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-500/20 transition-all flex-shrink-0"
                    >
                      <span>Find Providers</span> <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            {filteredCategories.length === 0 && (
              <div className="col-span-full py-16 text-center rounded-3xl border border-dashed border-slate-700/50 p-8 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 mx-auto flex items-center justify-center text-blue-400">
                  <Search className="w-6 h-6" />
                </div>
                {selectedCategory !== 'All' ? (
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h4 className={`text-lg font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      No Providers Available for This Service
                    </h4>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} leading-relaxed`}>
                      There are currently no eligible providers registered for this service. Please check back later or browse other services.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h4 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      No Categories Found
                    </h4>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} leading-relaxed`}>
                      No service categories matched your search and filter criteria. Try clearing filters.
                    </p>
                  </div>
                )}
                <div className="flex justify-center gap-3 pt-2">
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

          {/* Load More Categories */}
          {filteredCategories.length > visibleCount && (
            <div className="text-center pt-4">
              <button
                onClick={() => setVisibleCount(prev => prev + 6)}
                className={`px-6 py-3 rounded-2xl border font-bold text-xs uppercase tracking-wider transition-all ${
                  darkMode ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Load More Categories ({filteredCategories.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: SERVICES CATALOG ─── */}
      {!loading && !error && activeTab === 'services' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Available Services</h3>
            <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Found {filteredServices.length} services
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.slice(0, visibleCount).map((s) => (
              <motion.div
                key={s.id || s._id}
                whileHover={{ y: -6 }}
                className={`rounded-3xl border overflow-hidden flex flex-col justify-between ${
                  darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="h-44 relative bg-slate-800">
                  <img src={s.image} alt={s.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                  <div className="absolute top-4 left-4">
                    <span className="px-2.5 py-1 rounded-xl bg-blue-600/90 backdrop-blur-md text-white font-extrabold text-[10px] uppercase tracking-wider">
                      {s.category}
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4">
                    <h4 className="text-white font-extrabold text-base leading-tight truncate">{s.name}</h4>
                    <p className="text-xs text-slate-300 font-semibold mt-0.5">{s.provider?.name} • {s.provider?.city || 'Coimbatore'}</p>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <p className={`text-xs leading-relaxed line-clamp-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {s.description || `Professional ${s.name} service provided by certified technicians.`}
                  </p>

                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Estimated Time</span>
                    <span className={darkMode ? 'text-white' : 'text-slate-900'}>{s.duration || s.estimatedDuration || 'Duration not available'}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Provider Rating</span>
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      <span>{s.rating || 5.0}</span>
                      <span className="text-[10px] text-slate-500">({s.reviewsCount || 0})</span>
                    </div>
                  </div>

                  <hr className={darkMode ? 'border-slate-800' : 'border-slate-100'} />

                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">Registered Price</span>
                      <span className="text-xl font-black text-blue-500">
                        ₹{s.price} <span className="text-xs font-normal text-slate-400">/{s.pricingUnit || 'visit'}</span>
                      </span>
                      <p className="text-[9px] text-slate-400 mt-0.5">Additional charges may apply for locations more than 10 km away.</p>
                    </div>
                    <button
                      onClick={() => navigate(`/customer/providers?category=${encodeURIComponent(s.category)}&service=${encodeURIComponent(s.name)}&serviceId=${encodeURIComponent(s.id)}`)}
                      className="flex items-center gap-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-md shadow-blue-500/20 transition-all flex-shrink-0"
                    >
                      <span>Book Service</span> <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            {filteredServices.length === 0 && (
              <div className="col-span-full py-16 text-center rounded-3xl border border-dashed border-slate-700/50 p-8 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 mx-auto flex items-center justify-center text-blue-400">
                  <Search className="w-6 h-6" />
                </div>
                {selectedCategory !== 'All' ? (
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h4 className={`text-lg font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      No Providers Available for This Service
                    </h4>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} leading-relaxed`}>
                      There are currently no eligible providers registered for this service. Please check back later or browse other services.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h4 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      No Services Found
                    </h4>
                    <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} leading-relaxed`}>
                      No services match your search and filter criteria. Try adjusting filters or clearing them.
                    </p>
                  </div>
                )}
                <div className="flex justify-center gap-3 pt-2">
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

          {/* Load More Services */}
          {filteredServices.length > visibleCount && (
            <div className="text-center pt-4">
              <button
                onClick={() => setVisibleCount(prev => prev + 6)}
                className={`px-6 py-3 rounded-2xl border font-bold text-xs uppercase tracking-wider transition-all ${
                  darkMode ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Load More Services ({filteredServices.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default CustomerServices;
