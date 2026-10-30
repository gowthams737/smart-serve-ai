import React, { useState, useEffect } from 'react';
import { useOutletContext, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  IndianRupee, 
  Heart, 
  Clock, 
  ArrowRight, 
  Bell, 
  Sparkles, 
  CheckCircle,
  MapPin,
  Star,
  Zap,
  Bot,
  TrendingUp,
  Award
} from 'lucide-react';
import { CustomerService } from '../../services/customerService';
import { formatDateDDMMYYYY } from '../../utils/dateFormat';

const CustomerDashboard = () => {
  const { darkMode } = useOutletContext();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [customerReviews, setCustomerReviews] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [savedCount, setSavedCount] = useState(0);
  const [aiRecommendations, setAiRecommendations] = useState([]);
  const [topRatedProfessionals, setTopRatedProfessionals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  const loadData = async (userEmail) => {
    try {
      const email = userEmail || customer?.email;
      const [books, alerts, saved, topPros, recs, catsRes] = await Promise.all([
        CustomerService.getBookings(),
        CustomerService.getNotifications(),
        CustomerService.getSavedProviders(),
        CustomerService.getTopProviders(),
        CustomerService.getAIRecommendations(),
        CustomerService.getServiceCategories()
      ]);

      setBookings(Array.isArray(books) ? books : []);
      setNotifications(Array.isArray(alerts) ? alerts : []);
      setSavedCount(Array.isArray(saved) ? saved.length : 0);
      setTopRatedProfessionals(Array.isArray(topPros) ? topPros : []);
      setAiRecommendations(Array.isArray(recs) ? recs : []);
      setCategories(Array.isArray(catsRes) ? catsRes : []);

      try {
        const storedViews = JSON.parse(localStorage.getItem('smartserve_recently_viewed')) || [];
        setRecentlyViewed(Array.isArray(storedViews) ? storedViews : []);
      } catch (_) {
        setRecentlyViewed([]);
      }

      if (email) {
        const revs = await CustomerService.getCustomerReviews(email);
        setCustomerReviews(Array.isArray(revs) ? revs : []);
      }
    } catch (err) {
      console.error('Customer dashboard loadData error:', err);
    }
  };

  useEffect(() => {
    const info = CustomerService.getCustomerInfo();
    setCustomer(info);
    loadData(info?.email);

    const handleNotifUpdate = () => {
      loadData(info?.email);
    };

    window.addEventListener('customerNotificationsUpdated', handleNotifUpdate);
    window.addEventListener('focus', handleNotifUpdate);
    return () => {
      window.removeEventListener('customerNotificationsUpdated', handleNotifUpdate);
      window.removeEventListener('focus', handleNotifUpdate);
    };
  }, []);

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm font-medium">Loading your dashboard...</p>
      </div>
    );
  }

  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const safeReviews = Array.isArray(customerReviews) ? customerReviews : [];
  const allCompletedBookings = safeBookings.filter(b => b && b.status === 'Completed');
  const unratedCompleted = allCompletedBookings.filter(b => !safeReviews.some(r => r && r.bookingId === (b.bookingId || b.id)));
  const upcomingBookings = safeBookings.filter(b => b && (b.status === 'Confirmed' || b.status === 'Pending')).slice(0, 3);
  const recentCompleted = allCompletedBookings.slice(0, 3);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  // Derive dynamic bundles and regional demand from genuine catalog categories
  const frequentlyBookedTogether = categories.length >= 2 ? [
    {
      id: 'fbt-1',
      title: `${categories[0]?.name} & ${categories[1]?.name} Combo`,
      services: [categories[0]?.name, categories[1]?.name],
      originalPrice: (categories[0]?.startingPrice || 350) + (categories[1]?.startingPrice || 299),
      packagePrice: Math.round(((categories[0]?.startingPrice || 350) + (categories[1]?.startingPrice || 299)) * 0.85),
      discount: '15% OFF'
    },
    ...(categories.length >= 4 ? [{
      id: 'fbt-2',
      title: `${categories[2]?.name} & ${categories[3]?.name} Combo`,
      services: [categories[2]?.name, categories[3]?.name],
      originalPrice: (categories[2]?.startingPrice || 399) + (categories[3]?.startingPrice || 499),
      packagePrice: Math.round(((categories[2]?.startingPrice || 399) + (categories[3]?.startingPrice || 499)) * 0.85),
      discount: '15% OFF'
    }] : [])
  ] : [];

  const coimbatoreAreas = ['RS Puram', 'Peelamedu', 'Gandhipuram', 'Saibaba Colony', 'Race Course'];
  const popularInCoimbatore = categories.slice(0, 3).map((cat, idx) => ({
    category: cat.name,
    location: coimbatoreAreas[idx % coimbatoreAreas.length],
    demand: idx === 0 ? 'Very High' : idx === 1 ? 'High' : 'Trending'
  }));

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Welcome Hero Banner */}
      <motion.div 
        variants={itemVariants}
        className={`flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 p-8 rounded-[32px] border relative overflow-hidden ${
          darkMode 
            ? 'bg-gradient-to-br from-slate-900 to-slate-950 border-white/10' 
            : 'bg-gradient-to-br from-white to-slate-50 border-slate-200 shadow-sm'
        }`}
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/5 blur-3xl rounded-full" />
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-500 uppercase tracking-widest">
            <Sparkles className="w-4 h-4 animate-pulse" />
            <span>Welcome Back</span>
          </div>
          <h2 className={`text-3xl font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Hello, {customer.fullName}!
          </h2>
          <p className={`${darkMode ? 'text-slate-400' : 'text-slate-600'} text-sm max-w-xl`}>
            Need assistance with home repairs, cleaning, or styling? Find trusted, certified service professionals near you in Coimbatore.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/customer/services">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-5 py-3 rounded-2xl bg-blue-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-colors"
            >
              Book Service
            </motion.button>
          </Link>
          <Link to="/customer/ai-assistant">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider border transition-colors flex items-center gap-1.5 ${
                darkMode 
                  ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white' 
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Bot className="w-4 h-4 text-blue-500 animate-bounce" />
              <span>Ask AI Assistant</span>
            </motion.button>
          </Link>
        </div>
      </motion.div>

      {/* Metrics Section */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: 'Booked Services',
            value: bookings.length,
            icon: Calendar,
            color: 'text-blue-500 bg-blue-500/10',
            link: '/customer/bookings-and-saved?filter=All'
          },
          {
            title: 'Completed Services',
            value: allCompletedBookings.length,
            icon: CheckCircle,
            color: 'text-green-500 bg-green-500/10',
            link: '/customer/bookings-and-saved?filter=Completed'
          },
          {
            title: 'Saved Providers',
            value: savedCount,
            icon: Heart,
            color: 'text-rose-500 bg-rose-500/10',
            link: '/customer/bookings-and-saved?tab=saved'
          },
          {
            title: 'Rate the Provider',
            value: unratedCompleted.length > 0
              ? `${unratedCompleted.length} To Rate`
              : (allCompletedBookings.length > 0 ? 'All Rated' : 'Rate Provider'),
            icon: Star,
            color: 'text-amber-500 bg-amber-500/10',
            link: '/customer/bookings-and-saved?filter=Completed&rate=true'
          }
        ].map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div 
              key={idx}
              onClick={() => navigate(stat.link)}
              className={`p-6 rounded-3xl border cursor-pointer transition-all hover:scale-[1.01] hover:border-blue-500/40 group ${
                darkMode ? 'bg-slate-900/50 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-400 group-hover:text-slate-200' : 'text-slate-500 group-hover:text-slate-700'} uppercase tracking-wider`}>
                  {stat.title}
                </span>
                <div className={`p-2.5 rounded-xl ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <h4 className="text-3xl font-extrabold tracking-tight group-hover:text-blue-500 transition-colors">{stat.value}</h4>
            </div>
          );
        })}
      </motion.div>

      {/* ─── NEW: AI POWERED RECOMMENDATIONS SYSTEM ─── */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-500" />
            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              AI Smart Recommendations
            </h3>
          </div>
          <span className="text-[10px] uppercase bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded font-black tracking-widest">
            Coimbatore Live
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {aiRecommendations.map((rec) => (
            <div
              key={rec.id}
              className={`p-6 rounded-3xl border flex flex-col justify-between gap-4 relative overflow-hidden group hover:border-blue-500 transition-all duration-300 ${
                darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="absolute -top-6 -right-6 w-16 h-16 bg-blue-600/5 blur-xl rounded-full" />
              
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-[9px] font-extrabold text-blue-500 uppercase tracking-widest block w-fit mb-1">
                    {rec.category}
                  </span>
                  <h4 className={`font-extrabold text-base leading-snug ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {rec.serviceName}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 block">Match Confidence</span>
                  <span className="text-sm font-black text-green-500 flex items-center justify-end gap-0.5">
                    <Zap className="w-3.5 h-3.5 fill-green-500" /> {rec.confidence}%
                  </span>
                </div>
              </div>

              <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {rec.reason}
              </p>

              <div className="grid grid-cols-2 gap-3 py-3 border-y border-dashed border-white/5 text-[10px] font-semibold text-slate-500">
                <div>Est. Price: <strong className={darkMode ? 'text-white' : 'text-slate-800'}>₹{rec.estimatedPrice}</strong></div>
                <div>Est. Duration: <strong className={darkMode ? 'text-white' : 'text-slate-800'}>{rec.estimatedDuration || 'Duration not available'}</strong></div>
                <div>Specialist: <strong className={darkMode ? 'text-white' : 'text-slate-800'}>{rec.providerName}</strong></div>
                <div className="flex items-center gap-0.5">
                  Rating: {rec.rating > 0 ? (
                    <>
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <strong className={darkMode ? 'text-white' : 'text-slate-800'}>{rec.rating}</strong>
                    </>
                  ) : (
                    <strong className="text-blue-400">New</strong>
                  )}
                </div>
              </div>

              <button
                onClick={() => navigate(`/customer/providers?search=${encodeURIComponent(rec.providerName)}`)}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-1.5"
              >
                <span>Book Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {aiRecommendations.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-500 font-semibold text-xs">
              No recommendations available at this time.
            </div>
          )}
        </div>
      </motion.div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2/3 size): Bookings & Personalized Layout */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-8">
          
          {/* Upcoming bookings */}
          <div className={`p-6 rounded-3xl border ${darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`font-bold text-base ${darkMode ? 'text-white' : 'text-slate-900'}`}>Upcoming Appointments</h3>
              <Link to="/customer/bookings-and-saved" className="text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            
            <div className="space-y-4">
              {upcomingBookings.map((b, idx) => (
                <div 
                  key={b.bookingId || b.id || b._id || idx} 
                  className={`p-4 rounded-2xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                    darkMode ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <img src={b.providerPhoto} alt={b.providerName} className="w-12 h-12 rounded-full object-cover border-2 border-blue-500/20" />
                    <div>
                      <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>{b.service}</h4>
                      <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{b.providerName} • {b.category}</p>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
                        <MapPin className="w-3 h-3 text-blue-500" />
                        <span className="truncate max-w-xs">{(b.location || b.address || '').split(',')[0]}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex md:flex-col items-end justify-between w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 border-white/5">
                    <span className="text-[10px] uppercase font-black text-blue-500">{formatDateDDMMYYYY(b.date) || b.date} • {b.time}</span>
                    <span className={`px-2.5 py-0.5 mt-1 rounded-full text-[10px] font-bold ${
                      b.status === 'Confirmed' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
              {upcomingBookings.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-slate-500 text-sm">No upcoming appointments scheduled.</p>
                  <Link to="/customer/services" className="text-xs text-blue-500 hover:underline font-bold mt-1 inline-block">
                    Book your first service now
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Frequently Booked Together */}
          <div className="space-y-4">
            <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Frequently Booked Together</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {frequentlyBookedTogether.map((bundle) => (
                <div
                  key={bundle.id}
                  className={`p-6 rounded-3xl border flex flex-col justify-between gap-4 ${
                    darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h4 className={`font-extrabold text-sm ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      {bundle.title}
                    </h4>
                    <span className="px-2 py-0.5 rounded bg-green-500/10 text-[9px] font-black text-green-500">
                      {bundle.discount}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {bundle.services.map((s, idx) => (
                      <span key={idx} className="px-2 py-1 rounded bg-white/5 border border-white/5 text-[9px] font-semibold text-slate-400">
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="flex justify-between items-center mt-2 border-t border-dashed border-white/5 pt-3">
                    <div>
                      <span className="text-[10px] text-slate-500 line-through">₹{bundle.originalPrice}</span>
                      <span className="text-sm font-black text-blue-500 block">₹{bundle.packagePrice}</span>
                    </div>
                    <button
                      onClick={() => navigate('/customer/ai-planner')}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider"
                    >
                      Book Bundle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Popular in Coimbatore & Recently Viewed */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Coimbatore live regional demand */}
            <div className={`p-6 rounded-3xl border ${darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'} mb-4`}>Popular in Coimbatore</h4>
              <div className="space-y-2">
                {popularInCoimbatore.map((pop, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => navigate(`/customer/providers?category=${encodeURIComponent(pop.category)}`)}
                    className={`flex justify-between items-center text-xs font-semibold p-2 -mx-2 rounded-xl cursor-pointer transition-colors ${
                      darkMode ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className={`${darkMode ? 'text-slate-300' : 'text-slate-700'} hover:text-blue-500 transition-colors`}>{pop.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 text-[10px]">{pop.location}</span>
                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-[9px] text-blue-500 font-extrabold">
                        {pop.demand}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recently Viewed */}
            <div className={`p-6 rounded-3xl border ${darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
              <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'} mb-4`}>Recently Viewed</h4>
              <div className="space-y-3">
                {recentlyViewed.length > 0 ? (
                  recentlyViewed.map((view) => (
                    <div key={view.id} className="flex justify-between items-center text-xs font-semibold">
                      <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>{view.icon || '⚡'} {view.name}</span>
                      <button
                        onClick={() => navigate(`/customer/providers?category=${encodeURIComponent(view.name)}`)}
                        className="text-[10px] text-blue-500 hover:underline font-bold"
                      >
                        View again
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-2">No recently viewed services yet. Browse our catalog to explore.</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Column (1/3 size): Notifications and Top Rated Professionals */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Notifications */}
          <div className={`p-6 rounded-3xl border ${darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`font-bold text-base ${darkMode ? 'text-white' : 'text-slate-900'}`}>Recent Notifications</h3>
              <Link to="/customer/notifications" className="text-xs font-bold text-blue-500 hover:text-blue-400">
                Inbox
              </Link>
            </div>
            
            <div className="space-y-4">
              {notifications.slice(0, 4).map((n, idx) => (
                <div 
                  key={n._id || n.id || idx} 
                  className={`p-3.5 rounded-2xl border flex gap-3 ${
                    darkMode ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="p-2 h-fit bg-blue-500/10 text-blue-500 rounded-xl">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h5 className={`font-bold text-xs ${darkMode ? 'text-white' : 'text-slate-900'}`}>{n.title}</h5>
                    <p className={`text-[11px] ${darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1 leading-normal`}>
                      {n.message}
                    </p>
                    <span className="text-[9px] text-slate-500 mt-1.5 block">{n.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Rated Professionals */}
          <div className={`p-6 rounded-3xl border ${darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className={`font-bold text-base ${darkMode ? 'text-white' : 'text-slate-900'} mb-6`}>Top Rated Professionals</h3>
            
            <div className="space-y-4">
              {topRatedProfessionals.map((p, idx) => (
                <div
                  key={p.id || idx}
                  onClick={() => navigate(`/customer/providers?search=${encodeURIComponent(p.name)}`)}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer hover:border-blue-500 transition-colors ${
                    darkMode ? 'bg-slate-950/45 border-white/5' : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center font-bold text-white text-xs flex-shrink-0">
                      {p.photo ? (
                        <img src={p.photo} alt={p.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : (
                        <span>{p.name?.charAt(0) || 'P'}</span>
                      )}
                    </div>
                    <div>
                      <h5 className={`font-bold text-xs ${darkMode ? 'text-white' : 'text-slate-900'}`}>{p.name}</h5>
                      <span className="text-[9px] text-slate-500">{p.category}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    {p.rating > 0 ? (
                      <div className="flex items-center gap-0.5 text-amber-500 font-bold text-[10px] justify-end">
                        <Star className="w-3 h-3 fill-amber-500" />
                        <span>{p.rating}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-blue-400">New</span>
                    )}
                    <span className="text-[9px] text-slate-500">{p.jobs || 0} jobs completed</span>
                  </div>
                </div>
              ))}
              {topRatedProfessionals.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">No approved providers available.</p>
              )}
            </div>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
};

export default CustomerDashboard;
