import React, { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  AlertCircle, 
  FileText,
  X,
  Heart,
  Star,
  Search,
  CheckCircle,
  User
} from 'lucide-react';
import { CustomerService, serviceCategories } from '../../services/customerService';
import { formatDateDDMMYYYY } from '../../utils/dateFormat';
import { cleanImageUrl } from '../../utils/imageUrl';

const BookingsAndSaved = () => {
  const { darkMode } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlTab = searchParams.get('tab');
  const urlFilter = searchParams.get('filter') || searchParams.get('status');
  const shouldOpenRate = searchParams.get('rate') === 'true';

  const [activeTab, setActiveTab] = useState(urlTab === 'saved' ? 'saved' : 'bookings');
  const [filterStatus, setFilterStatus] = useState(urlFilter || 'All');

  // Booking History state
  const [bookings, setBookings] = useState([]);
  const [customerReviews, setCustomerReviews] = useState([]);
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(null);

  // Review Modal state
  const [reviewingBooking, setReviewingBooking] = useState(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingHover, setRatingHover] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');

  // Saved Providers state
  const [savedProviders, setSavedProviders] = useState([]);

  useEffect(() => {
    fetchBookings();
    loadSaved();
    fetchCustomerReviews();

    const handleUpdate = () => {
      fetchBookings();
      fetchCustomerReviews();
    };

    window.addEventListener('customerNotificationsUpdated', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    return () => {
      window.removeEventListener('customerNotificationsUpdated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, []);

  useEffect(() => {
    const f = searchParams.get('filter') || searchParams.get('status');
    if (f) setFilterStatus(f);
    const t = searchParams.get('tab');
    if (t === 'saved') setActiveTab('saved');
    else if (t === 'bookings') setActiveTab('bookings');
  }, [searchParams]);

  const fetchBookings = async () => {
    const books = await CustomerService.getBookings();
    setBookings(books);
  };

  const fetchCustomerReviews = async () => {
    const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
    if (user.email) {
      const revs = await CustomerService.getCustomerReviews(user.email);
      setCustomerReviews(revs);
      return revs;
    }
    return [];
  };

  const loadSaved = async () => {
    const savedIds = await CustomerService.getSavedProviders();
    const allProviders = await CustomerService.getProviders();
    const filtered = allProviders.filter(p => savedIds.includes(p.id));
    setSavedProviders(filtered);
  };

  // Auto-open review modal when rate=true is present in query
  useEffect(() => {
    if (shouldOpenRate && bookings.length > 0) {
      const completed = bookings.filter(b => b.status === 'Completed');
      if (completed.length > 0) {
        const unrated = completed.find(b => {
          const bId = b.bookingId || b.id || (b._id ? b._id.toString() : '');
          return !customerReviews.some(r => r.bookingId === bId || r.bookingId === b.bookingId);
        });
        openReviewModal(unrated || completed[0]);
      }
    }
  }, [shouldOpenRate, bookings, customerReviews]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'saved') {
      setSearchParams({ tab: 'saved' });
    } else {
      if (filterStatus !== 'All') {
        setSearchParams({ filter: filterStatus });
      } else {
        setSearchParams({});
      }
    }
  };

  const handleStatusFilterChange = (status) => {
    setFilterStatus(status);
    if (status === 'All') {
      const newParams = {};
      if (activeTab === 'saved') newParams.tab = 'saved';
      setSearchParams(newParams);
    } else {
      const newParams = { filter: status };
      if (activeTab === 'saved') newParams.tab = 'saved';
      setSearchParams(newParams);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancellingBooking) return;
    await CustomerService.cancelBooking(cancellingBooking.id);
    await fetchBookings();
    setCancellingBooking(null);
  };

  const handleRemoveSaved = async (providerId) => {
    await CustomerService.toggleSaveProvider(providerId);
    await loadSaved();
  };

  const openReviewModal = (booking) => {
    const bId = booking.bookingId || booking.id || (booking._id ? booking._id.toString() : '');
    const existing = customerReviews.find(r => r.bookingId === bId || r.bookingId === booking.bookingId);
    setReviewingBooking(booking);
    setRatingValue(existing ? existing.rating : 5);
    setReviewComment(existing ? existing.comment : '');
    setReviewError('');
    setReviewSuccess('');
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!reviewingBooking) return;
    if (!reviewComment.trim()) {
      setReviewError('Please write a short review before submitting.');
      return;
    }
    setReviewLoading(true);
    setReviewError('');
    try {
      const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
      const bId = reviewingBooking.bookingId || reviewingBooking.id || (reviewingBooking._id ? reviewingBooking._id.toString() : '');
      await CustomerService.createReview({
        bookingId: bId,
        providerId: reviewingBooking.providerId || reviewingBooking.provider?._id || '',
        customerName: user.fullName || reviewingBooking.customerName || 'Customer',
        customerEmail: user.email || reviewingBooking.customerEmail || '',
        rating: ratingValue,
        comment: reviewComment.trim(),
        serviceTaken: reviewingBooking.service || reviewingBooking.serviceName || 'Service'
      });
      setReviewLoading(false);
      setReviewSuccess('Review submitted successfully!');
      await fetchCustomerReviews();
      setTimeout(() => {
        setReviewingBooking(null);
        setReviewSuccess('');
      }, 1200);
    } catch (err) {
      setReviewLoading(false);
      setReviewError(err.message || 'Failed to submit review. Please try again.');
    }
  };

  const filteredBookings = filterStatus === 'All'
    ? bookings
    : bookings.filter(b => b.status === filterStatus);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Confirmed':
        return 'bg-green-500/10 text-green-400 border border-green-500/20';
      case 'Pending':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'Completed':
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
      case 'Cancelled':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default:
        return 'bg-slate-900/50 text-slate-400';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={`text-3xl font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Bookings & Saved
          </h2>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
            Manage your service appointments, view receipts, and access saved service experts.
          </p>
        </div>

        {/* Section Tabs */}
        <div className="flex p-1 rounded-2xl border bg-slate-950/20 border-white/5">
          <button
            onClick={() => handleTabChange('bookings')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'bookings'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10'
                : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Booking History</span>
          </button>
          <button
            onClick={() => handleTabChange('saved')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'saved'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10'
                : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>Saved Providers ({savedProviders.length})</span>
          </button>
        </div>
      </div>

      {/* BOOKING HISTORY SECTION */}
      {activeTab === 'bookings' && (
        <div className="space-y-6">
          {/* Status Filter buttons */}
          <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl border bg-slate-950/20 border-white/5 w-fit">
            {['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => handleStatusFilterChange(status)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  filterStatus === status
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10'
                    : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Booking List */}
          <div className="space-y-4">
            {filteredBookings.map((b) => {
              const bId = b.bookingId || b.id || (b._id ? b._id.toString() : '');
              const existingReview = customerReviews.find(r => r.bookingId === bId || r.bookingId === b.bookingId);
              return (
                <div
                  key={b.id || b._id}
                  className={`p-6 rounded-3xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
                    darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  {/* Left */}
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden border border-blue-500/20 bg-slate-800 flex-shrink-0 flex items-center justify-center relative">
                      {cleanImageUrl(b.providerPhoto) ? (
                        <img
                          src={cleanImageUrl(b.providerPhoto)}
                          alt={b.providerName || 'Provider'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const fallback = e.target.nextElementSibling;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        style={{ display: cleanImageUrl(b.providerPhoto) ? 'none' : 'flex' }}
                        className="w-full h-full items-center justify-center bg-slate-800 text-slate-400 font-bold text-sm"
                      >
                        <User className="w-6 h-6 text-slate-400" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full ${getStatusStyle(b.status)}`}>
                          {b.status}
                        </span>
                        {(b.bookingId || b.id) && (
                          <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                            {(b.bookingId || b.id).startsWith('#') ? (b.bookingId || b.id) : `#${b.bookingId || b.id}`}
                          </span>
                        )}
                      </div>
                      <h4 className={`font-bold text-base leading-snug mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{b.service || b.serviceName}</h4>
                      <p className="text-xs text-slate-500 font-semibold">{b.providerName} • {b.category || b.serviceType}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1 font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-blue-500" /> {formatDateDDMMYYYY(b.date) || b.date}
                        </span>
                        <span className="flex items-center gap-1 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-blue-500" /> {b.time}
                        </span>
                        <span className="flex items-center gap-1 font-semibold truncate max-w-xs">
                          <MapPin className="w-3.5 h-3.5 text-blue-500" /> {(b.location || b.address || '').split(',')[0]}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right */}
                  <div className="flex md:flex-col items-end justify-between w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-slate-800">
                    <div className="text-left md:text-right space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Total Charge</span>
                      <span className="text-2xl font-black text-blue-500">₹{(b.amount || b.price || b.total || 0).toLocaleString('en-IN')}</span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <button
                        onClick={() => setViewInvoice(b)}
                        className={`p-2.5 rounded-xl border flex items-center justify-center text-xs font-bold transition-all ${
                          darkMode ? 'bg-slate-950 border-white/5 text-slate-300 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                        title="View Receipt Summary"
                      >
                        <FileText className="w-4 h-4 mr-1.5" /> Details
                      </button>

                      {b.status === 'Completed' && (
                        <button
                          onClick={() => openReviewModal(b)}
                          className={`px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                            existingReview
                              ? 'bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500/20'
                              : 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20'
                          }`}
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>{existingReview ? `Edit Review (${existingReview.rating}★)` : 'Rate Provider'}</span>
                        </button>
                      )}

                      {(b.status === 'Confirmed' || b.status === 'Pending') && (
                        <button
                          onClick={() => setCancellingBooking(b)}
                          className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors"
                        >
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredBookings.length === 0 && (
              <div className="py-20 text-center">
                <p className="text-slate-500 font-medium">No bookings found for the selected status.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SAVED PROVIDERS SECTION */}
      {activeTab === 'saved' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedProviders.map((p) => (
            <div
              key={p.id}
              className={`p-6 rounded-3xl border flex flex-col justify-between gap-6 relative group ${
                darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              {/* Unsave button */}
              <button
                onClick={() => handleRemoveSaved(p.id)}
                className="absolute top-4 right-4 p-2.5 rounded-xl border flex items-center justify-center bg-rose-500/10 border-rose-500/20 text-rose-500 transition-colors"
                title="Remove from saved"
              >
                <Heart className="w-4 h-4 fill-rose-500" />
              </button>

              {/* Profile info */}
              <div className="flex items-center gap-4 pt-2">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border border-blue-500/20 bg-slate-800 flex-shrink-0 flex items-center justify-center font-bold text-white text-lg">
                  {cleanImageUrl(p.photo) ? (
                    <img src={cleanImageUrl(p.photo)} alt={p.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <span>{p.name?.charAt(0) || 'P'}</span>
                  )}
                </div>
                <div>
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-[9px] font-extrabold text-blue-500 uppercase tracking-widest block w-fit mb-1">
                    {p.category}
                  </span>
                  <h4 className={`font-bold text-base leading-snug ${darkMode ? 'text-white' : 'text-slate-900'}`}>{p.name}</h4>
                  <div className="flex items-center gap-1 mt-1 text-slate-500 text-xs">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{p.city}</span>
                  </div>
                </div>
              </div>

              <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-500'} line-clamp-2`}>
                {p.about}
              </p>

              <hr className={darkMode ? 'border-slate-800' : 'border-slate-100'} />

              {/* Price / Star stats */}
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black block">Rates from</span>
                  <span className="text-lg font-black text-blue-500">
                    ₹{p.price.toLocaleString('en-IN')}
                    <span className="text-xs text-slate-500 font-medium">
                      /{serviceCategories.find(c => c.name === p.category)?.unit || 'visit'}
                    </span>
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Additional charges may apply for locations more than 10 km away.</p>
                </div>

                <div className="flex items-center gap-3">
                  {p.rating > 0 ? (
                    <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                      <Star className="w-3.5 h-3.5 fill-amber-500" />
                      <span>{p.rating}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold text-blue-400">New Provider</span>
                  )}
                  
                  <Link to={`/customer/providers?search=${encodeURIComponent(p.name)}`}>
                    <button className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20">
                      Book
                    </button>
                  </Link>
                </div>
              </div>

            </div>
          ))}

          {savedProviders.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4">
              <p className="text-slate-500 font-medium">You haven't saved any providers yet.</p>
              <Link to="/customer/providers" className="text-xs text-blue-500 hover:underline font-bold flex items-center justify-center gap-1">
                Find providers now <Search className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* RATE PROVIDER MODAL */}
      <AnimatePresence>
        {reviewingBooking && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-md rounded-[32px] border p-6 space-y-5 shadow-2xl ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className={`font-extrabold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    Rate & Review Provider
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {reviewingBooking.providerName} • {reviewingBooking.service || reviewingBooking.serviceName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewingBooking(null)}
                  className="p-1.5 rounded-full bg-slate-900/60 text-white hover:bg-slate-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <hr className={darkMode ? 'border-slate-800' : 'border-slate-100'} />

              {reviewSuccess ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mx-auto text-xl">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                  <h4 className={`font-bold text-base ${darkMode ? 'text-white' : 'text-slate-900'}`}>{reviewSuccess}</h4>
                  <p className="text-xs text-slate-500">Your feedback helps improve service quality across Coimbatore.</p>
                </div>
              ) : (
                <form onSubmit={submitReview} className="space-y-4">
                  {/* Star Rating Picker */}
                  <div className="text-center space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                      Overall Experience
                    </label>
                    <div className="flex justify-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const active = (ratingHover || ratingValue) >= star;
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRatingValue(star)}
                            onMouseEnter={() => setRatingHover(star)}
                            onMouseLeave={() => setRatingHover(0)}
                            className="p-1 transition-transform hover:scale-125 focus:outline-none"
                          >
                            <Star
                              className={`w-7 h-7 transition-colors ${
                                active ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-700'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-xs font-bold text-amber-500 block">
                      {ratingValue === 5 && 'Excellent (5.0)'}
                      {ratingValue === 4 && 'Very Good (4.0)'}
                      {ratingValue === 3 && 'Good (3.0)'}
                      {ratingValue === 2 && 'Fair (2.0)'}
                      {ratingValue === 1 && 'Poor (1.0)'}
                    </span>
                  </div>

                  {/* Quick Feedback Chips */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Quick Tags</label>
                    <div className="flex flex-wrap gap-1.5">
                      {['Punctual & On Time', 'Professional Work', 'Clean & Courteous', 'Fair Pricing', 'Expert Craftsmanship'].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (!reviewComment.includes(tag)) {
                              setReviewComment(prev => prev ? `${prev}, ${tag}` : tag);
                            }
                          }}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                            darkMode ? 'bg-slate-950/60 border-white/5 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          + {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Review Text */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 block">Your Review</label>
                    <textarea
                      required
                      rows={3}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder="Write your feedback about the completed service..."
                      className={`w-full p-3 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                        darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>

                  {reviewError && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-semibold">
                      {reviewError}
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setReviewingBooking(null)}
                      className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider border transition-colors ${
                        darkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={reviewLoading}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 transition-all flex items-center gap-1.5"
                    >
                      {reviewLoading ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CANCEL BOOKING DIALOG */}
      <AnimatePresence>
        {cancellingBooking && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-sm rounded-[32px] border p-6 space-y-6 ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xl'
              }`}
            >
              <div className="flex items-center gap-3 text-red-400">
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <h3 className={`font-bold text-base ${darkMode ? 'text-white' : 'text-slate-900'}`}>Cancel Appointment?</h3>
              </div>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} leading-relaxed`}>
                Are you sure you want to cancel your service for <span className="font-bold text-blue-500">{cancellingBooking.service || cancellingBooking.serviceName}</span> with <span className="font-bold">{cancellingBooking.providerName}</span>?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setCancellingBooking(null)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider border ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  Keep Booking
                </button>
                <button
                  onClick={handleCancelBooking}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-500/20"
                >
                  Confirm Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VIEW RECEIPT/INVOICE DIALOG MODAL */}
      <AnimatePresence>
        {viewInvoice && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-sm rounded-[32px] border p-6 space-y-6 ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-2xl'
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <h3 className={`font-extrabold text-base ${darkMode ? 'text-white' : 'text-slate-900'}`}>Booking Receipt</h3>
                </div>
                <button
                  onClick={() => setViewInvoice(null)}
                  className="p-1 rounded-full bg-slate-900/60 text-white hover:bg-slate-900"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {(viewInvoice.bookingId || viewInvoice.id) && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Booking ID</span>
                    <span className="font-mono font-bold text-blue-500">
                      {(viewInvoice.bookingId || viewInvoice.id).startsWith('#') ? (viewInvoice.bookingId || viewInvoice.id) : `#${viewInvoice.bookingId || viewInvoice.id}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Service</span>
                  <span className={darkMode ? 'text-white' : 'text-slate-900'}>{viewInvoice.service || viewInvoice.serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Provider</span>
                  <span className={darkMode ? 'text-white' : 'text-slate-900'}>{viewInvoice.providerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Service Address</span>
                  <span className={`text-right max-w-[200px] truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {viewInvoice.customerAddress || viewInvoice.address || viewInvoice.location || 'Address not provided'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date & Time</span>
                  <span className={darkMode ? 'text-white' : 'text-slate-900'}>{formatDateDDMMYYYY(viewInvoice.date) || viewInvoice.date} at {viewInvoice.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] ${getStatusStyle(viewInvoice.status)}`}>{viewInvoice.status}</span>
                </div>

                <hr className={darkMode ? 'border-slate-800' : 'border-slate-100'} />

                <div className="flex justify-between">
                  <span className="text-slate-500">Provider Service Fee</span>
                  <span className={darkMode ? 'text-white' : 'text-slate-900'}>₹{viewInvoice.amount || viewInvoice.price || viewInvoice.total}</span>
                </div>

                <hr className={darkMode ? 'border-slate-800' : 'border-slate-100'} />

                <div className="flex justify-between font-black text-blue-500 text-sm">
                  <span>Total Paid</span>
                  <span>₹{viewInvoice.amount || viewInvoice.price || viewInvoice.total}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setViewInvoice(null)}
                  className="w-full px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 text-center"
                >
                  Dismiss Receipt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default BookingsAndSaved;
