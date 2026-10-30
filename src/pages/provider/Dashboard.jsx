import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  Briefcase,
  Star,
  CheckCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Settings,
  Sparkles,
  Plus
} from 'lucide-react';
import StatsCard from '../../components/provider/StatsCard';
import BookingCard from '../../components/provider/BookingCard';
import ProfileCard from '../../components/provider/ProfileCard';
import { ProviderService } from '../../services/providerService';
import { getNotificationDestination } from '../../utils/notificationNavigation';

const ProviderDashboard = () => {
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [servicesCount, setServicesCount] = useState(0);
  const [stats, setStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const user = JSON.parse(localStorage.getItem('smartserve_user')) || {};
      if (!user.email) {
        setError('No authenticated provider session found. Please log in.');
        setLoading(false);
        return;
      }

      const [info, books, services, alerts, dashboardStats] = await Promise.all([
        ProviderService.getProviderInfo(),
        ProviderService.getBookings(),
        ProviderService.getServices(),
        ProviderService.getNotifications(),
        ProviderService.getDashboardStats()
      ]);

      if (!info) {
        setError('Provider details could not be retrieved.');
        setLoading(false);
        return;
      }

      setProvider(info);
      setBookings(Array.isArray(books) ? books : []);
      setServicesCount(Array.isArray(services) ? services.filter(s => s.isAvailable !== false).length : 0);
      setNotifications(Array.isArray(alerts) ? alerts : []);
      setStats(dashboardStats);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleProfileUpdate = (e) => {
      if (e.detail) {
        setProvider(e.detail);
      } else {
        loadData();
      }
    };

    const handleNotificationsUpdate = async () => {
      const alerts = await ProviderService.getNotifications();
      setNotifications(Array.isArray(alerts) ? alerts : []);
    };

    window.addEventListener('providerProfileUpdated', handleProfileUpdate);
    window.addEventListener('providerServicesUpdated', loadData);
    window.addEventListener('providerBookingsUpdated', loadData);
    window.addEventListener('providerNotificationsUpdated', handleNotificationsUpdate);
    window.addEventListener('focus', loadData);

    return () => {
      window.removeEventListener('providerProfileUpdated', handleProfileUpdate);
      window.removeEventListener('providerServicesUpdated', loadData);
      window.removeEventListener('providerBookingsUpdated', loadData);
      window.removeEventListener('providerNotificationsUpdated', handleNotificationsUpdate);
      window.removeEventListener('focus', loadData);
    };
  }, []);

  const handleAlertClick = async (notif) => {
    if (!notif) return;
    if (!notif.read && (notif.id || notif._id)) {
      await ProviderService.markNotificationAsRead(notif.id || notif._id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id || n._id === notif._id ? { ...n, read: true } : n))
      );
    }
    const destination = getNotificationDestination(notif);
    navigate(destination);
  };

  const handleAcceptBooking = async (id) => {
    try {
      await ProviderService.updateBookingStatus(id, 'Active');
      await loadData();
    } catch (err) {
      console.error('Failed to accept booking:', err);
    }
  };

  const handleRejectBooking = async (id) => {
    try {
      await ProviderService.updateBookingStatus(id, 'Rejected');
      await loadData();
    } catch (err) {
      console.error('Failed to reject booking:', err);
    }
  };

  const handleCompleteBooking = async (id) => {
    try {
      await ProviderService.updateBookingStatus(id, 'Completed');
      await loadData();
    } catch (err) {
      console.error('Failed to complete booking:', err);
    }
  };

  if (loading && !provider) {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <div className="h-44 rounded-3xl bg-slate-900/60 border border-white/5 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 rounded-2xl bg-slate-900/60 border border-white/5 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 rounded-3xl bg-slate-900/60 border border-white/5 animate-pulse" />
          <div className="h-96 rounded-3xl bg-slate-900/60 border border-white/5 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error && !provider) {
    return (
      <div className="p-8 rounded-3xl bg-slate-900/50 border border-red-500/20 text-center space-y-4 my-8">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
        <h3 className="text-xl font-bold text-white">Failed to Load Dashboard Data</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto">{error}</p>
        <button
          onClick={loadData}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!provider) return null;

  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const pendingRequests = safeBookings.filter((b) => b && b.status === 'Pending');
  const ongoingBookings = safeBookings.filter((b) => b && (b.status === 'Active' || b.status === 'In Progress' || b.status === 'Confirmed'));
  const activeBookings = ongoingBookings; // Canonical alias for ongoing services
  const completedBookings = safeBookings.filter((b) => b && b.status === 'Completed');
  const totalBookings = safeBookings.length;
  const totalBookingsCount = totalBookings;

  const hasReviews = (stats?.averageRating?.reviewsCount ?? provider.reviewsCount ?? 0) > 0;
  const ratingDisplay = hasReviews
    ? `${stats?.averageRating?.value ?? provider.rating ?? 5.0} / 5`
    : 'No ratings yet';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-gradient-to-br from-slate-900 to-slate-950 p-8 rounded-3xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/5 blur-3xl rounded-full" />
        
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-widest">
            <Sparkles className="w-4 h-4 animate-spin-slow" />
            <span>SmartServe AI Partner</span>
          </div>
          <h2 className="text-3xl font-extrabold text-white">
            Welcome back, {provider.fullName}!
          </h2>
          <p className="text-slate-400 text-sm max-w-xl">
            Here's an overview of your bookings, ratings, and service offerings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/provider/services">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-5 py-3 rounded-2xl bg-blue-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Service
            </motion.button>
          </Link>
          <Link
            to="/provider/availability"
            className="focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-2xl"
            tabIndex={0}
            role="button"
            aria-label="Manage Provider Availability"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-5 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm transition-colors"
            >
              <Clock className="w-4 h-4 text-blue-400" /> Availability
            </motion.button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <StatsCard
          title="Total Bookings"
          value={stats?.totalBookings?.value ?? totalBookingsCount}
          icon={Calendar}
          trend={stats?.totalBookings?.trend}
          color="blue"
          to="/provider/bookings"
        />
        <StatsCard
          title="Ongoing Bookings"
          value={stats?.ongoingBookings?.value ?? stats?.activeBookings?.value ?? ongoingBookings.length}
          icon={Clock}
          trend={stats?.ongoingBookings?.trend ?? stats?.activeBookings?.trend}
          color="blue"
          to="/provider/bookings?status=Active"
        />
        <StatsCard
          title="Completed Bookings"
          value={stats?.completedBookings?.value ?? stats?.completedJobs?.value ?? completedBookings.length}
          icon={CheckCircle}
          trend={stats?.completedBookings?.trend ?? stats?.completedJobs?.trend}
          color="purple"
          to="/provider/bookings?status=Completed"
        />
        <StatsCard
          title="Total Services"
          value={stats?.totalServices?.value ?? servicesCount}
          icon={Briefcase}
          trend={stats?.totalServices?.trend}
          color="green"
          to="/provider/services"
        />
        <StatsCard
          title="Average Rating"
          value={ratingDisplay}
          icon={Star}
          trend={stats?.averageRating?.trend}
          color="amber"
          to="/provider/reviews"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Booking Requests & Active bookings */}
        <div className="lg:col-span-2 space-y-8">
          {/* Pending Booking Requests */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                Booking Requests
                {pendingRequests.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {pendingRequests.length} New
                  </span>
                )}
              </h3>
              <Link to="/provider/bookings" className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1">
                View All <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-900/20 border border-slate-800/60 text-center flex flex-col items-center justify-center gap-2">
                <AlertCircle className="w-8 h-8 text-slate-500" />
                <p className="text-sm font-semibold text-slate-300">No pending booking requests</p>
                <p className="text-xs text-slate-500">New requests from customers will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pendingRequests.slice(0, 2).map((booking) => (
                  <BookingCard
                    key={booking.id || booking._id}
                    booking={booking}
                    onAccept={handleAcceptBooking}
                    onReject={handleRejectBooking}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Ongoing Services Summary */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              Ongoing Services
              {ongoingBookings.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {ongoingBookings.length} Active
                </span>
              )}
            </h3>

            {ongoingBookings.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-900/20 border border-slate-800/60 text-center flex flex-col items-center justify-center gap-2">
                <Calendar className="w-8 h-8 text-slate-500" />
                <p className="text-sm font-semibold text-slate-300">No active bookings today</p>
                <p className="text-xs text-slate-500">Accept booking requests to start serving clients.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {ongoingBookings.slice(0, 2).map((booking) => (
                  <BookingCard
                    key={booking.id || booking._id}
                    booking={booking}
                    onAccept={handleCompleteBooking}
                    onContact={(name) => alert(`Customer contact: ${name}`)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* System Alerts Panel */}
          <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-white text-sm">System Alerts</h4>
              <Link to="/provider/notifications" className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest">
                View All
              </Link>
            </div>
            <hr className="border-slate-800" />
            <div className="space-y-3">
              {notifications.slice(0, 3).map((notif) => (
                <div
                  key={notif.id || notif._id}
                  onClick={() => handleAlertClick(notif)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleAlertClick(notif);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Alert: ${notif.title}. ${notif.message}. Click to open details.`}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex gap-3 group focus:outline-none focus:ring-1 focus:ring-blue-500/50 ${
                    notif.read
                      ? 'bg-slate-950/40 border-white/5 hover:border-white/20 hover:bg-slate-950/70'
                      : 'bg-slate-950/80 border-blue-500/30 hover:border-blue-500/50 hover:bg-slate-950 shadow-lg shadow-blue-500/5'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 transition-colors ${
                      notif.read ? 'bg-slate-700' : 'bg-blue-500 shadow-sm shadow-blue-500/50'
                    }`}
                  />
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between text-[11px] font-bold">
                      <span className={`transition-colors ${notif.read ? 'text-slate-300' : 'text-blue-400 group-hover:text-blue-300'}`}>
                        {notif.title}
                      </span>
                      <span className="text-slate-500 font-normal">{notif.time}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal group-hover:text-slate-200 transition-colors">
                      {notif.message}
                    </p>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <p className="text-center text-xs text-slate-600 py-4">No recent alerts</p>
              )}
            </div>
          </div>
        </div>

        {/* Right column: Sidebar summary cards */}
        <div className="space-y-8">
          {/* Profile Card */}
          <ProfileCard provider={provider} />
        </div>
      </div>
    </div>
  );
};

export default ProviderDashboard;
