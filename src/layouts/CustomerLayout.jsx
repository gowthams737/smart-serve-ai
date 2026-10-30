import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, ShieldCheck, User, LogOut, Briefcase, Moon, Sun, AlertCircle, RotateCcw } from 'lucide-react';
import CustomerSidebar from '../components/customer/CustomerSidebar';
import { CustomerService } from '../services/customerService';
import { AuthService } from '../services/authService';
import { getNotificationDestination } from '../utils/notificationNavigation';
import ErrorBoundary from '../components/ErrorBoundary';

const CustomerLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [darkMode, setDarkMode] = useState(true);
  const navigate = useNavigate();
  const currentUser = AuthService.getCurrentUser();

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const info = CustomerService.getCustomerInfo();
      if (!info || !info.email) {
        navigate('/login');
        return;
      }
      setCustomer(info);

      const notifs = await CustomerService.getNotifications();
      const notifsList = Array.isArray(notifs) ? notifs : [];
      setNotifications(notifsList);
      setUnreadCount(notifsList.filter(n => !n.read).length);
    } catch (err) {
      console.error('Error loading customer layout:', err);
      setError(err.message || 'Failed to initialize Customer Portal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for profile updates
    const handleProfileUpdate = () => {
      const info = CustomerService.getCustomerInfo();
      if (info) setCustomer(info);
    };

    const handleNotificationsUpdate = async () => {
      const notifs = await CustomerService.getNotifications();
      const notifsList = Array.isArray(notifs) ? notifs : [];
      setNotifications(notifsList);
      setUnreadCount(notifsList.filter(n => !n.read).length);
    };

    window.addEventListener('storage', handleProfileUpdate);
    window.addEventListener('profile-updated', handleProfileUpdate);
    window.addEventListener('customerNotificationsUpdated', handleNotificationsUpdate);

    return () => {
      window.removeEventListener('storage', handleProfileUpdate);
      window.removeEventListener('profile-updated', handleProfileUpdate);
      window.removeEventListener('customerNotificationsUpdated', handleNotificationsUpdate);
    };
  }, [navigate]);

  // Real-time Server-Sent Events (SSE) notification listener
  useEffect(() => {
    if (!customer?.email) return;

    let eventSource = null;
    try {
      const streamUrl = `/api/customer/notifications/stream/${encodeURIComponent(customer.email.toLowerCase().trim())}`;
      eventSource = new EventSource(streamUrl);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type !== 'connected') {
            // New genuine notification received in real-time
            setNotifications(prev => {
              const exists = prev.some(n => (n._id && n._id === data._id) || (n.id && n.id === data.id));
              if (exists) return prev;
              return [data, ...prev];
            });
            if (!data.read) {
              setUnreadCount(prev => prev + 1);
            }
            // Trigger cross-page notification refresh
            window.dispatchEvent(new CustomEvent('customerNotificationsUpdated', { detail: data }));
          }
        } catch (e) {
          console.warn('Error parsing incoming customer SSE notification:', e);
        }
      };

      eventSource.onerror = () => {
        // EventSource automatically reconnects on error
      };
    } catch (err) {
      console.warn('SSE connection initialization skipped:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [customer?.email]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    const body = document.body;
    if (darkMode) {
      body.classList.remove('bg-slate-950', 'text-slate-50');
      body.classList.add('bg-slate-50', 'text-slate-900');
    } else {
      body.classList.remove('bg-slate-50', 'text-slate-900');
      body.classList.add('bg-slate-950', 'text-slate-50');
    }
  };

  const handleMarkAllRead = async () => {
    const updated = await CustomerService.markNotificationsAsRead();
    setNotifications(Array.isArray(updated) ? updated : []);
    setUnreadCount(0);
  };

  const handleNotificationClick = async (n) => {
    setShowNotifDropdown(false);
    const notifId = n._id || n.id;
    if (!n.read && notifId) {
      await CustomerService.markNotificationAsRead(notifId);
      setNotifications(prev =>
        prev.map(item => ((item._id === notifId || item.id === notifId) ? { ...item, read: true } : item))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    const destination = getNotificationDestination(n, 'Customer');
    navigate(destination);
  };

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login', { replace: true });
  };

  // Safe Loading State - Prevents Blank Screen
  if (loading) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex flex-col items-center justify-center gap-4`}>
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm font-semibold tracking-wide text-slate-400">Loading SmartServe Customer Portal...</p>
      </div>
    );
  }

  // Safe Error State - Prevents Blank Screen
  if (!customer) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} flex items-center justify-center p-6`}>
        <div className="max-w-md w-full bg-slate-900/90 border border-white/10 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Customer Portal Session Expired</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            {error || 'Unable to retrieve your customer profile. Please sign in again.'}
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Retry
            </button>
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm rounded-xl transition-all border border-white/10"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-slate-950 text-slate-50' : 'bg-slate-50 text-slate-900'} flex transition-colors duration-300`}>
      {/* Top Navbar */}
      <nav className={`fixed top-0 z-50 w-full ${darkMode ? 'bg-slate-950/80 border-b border-white/10' : 'bg-white/80 border-b border-slate-200'} backdrop-blur-xl px-6 py-4 flex items-center justify-between transition-colors duration-300`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className={`p-2 rounded-xl md:hidden transition-all ${darkMode ? 'text-slate-400 hover:text-white hover:bg-slate-900' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300 shadow-lg shadow-blue-500/20">
              <ShieldCheck className="text-white w-5 h-5" />
            </div>
            <span className={`text-xl font-bold bg-gradient-to-r ${darkMode ? 'from-white to-slate-400' : 'from-slate-900 to-slate-600'} bg-clip-text text-transparent hidden sm:inline-block`}>
              SmartServe AI
            </span>
          </Link>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-4">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
              darkMode 
                ? 'bg-slate-900/50 border-white/5 text-amber-400 hover:text-amber-300 hover:bg-slate-900' 
                : 'bg-white border-slate-200 text-blue-600 hover:bg-slate-50'
            }`}
            title="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Switch to Admin View - Admin ONLY */}
          {currentUser?.role === 'Admin' && (
            <Link
              to="/admin/dashboard"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                darkMode
                  ? 'bg-slate-900/50 text-slate-300 border-white/5 hover:bg-slate-800'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
              <span className="hidden sm:inline">Admin Portal</span>
            </Link>
          )}

          {/* Notifications Dropdown with Real-Time Events */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className={`p-2.5 border rounded-xl transition-all flex items-center justify-center relative ${
                darkMode
                  ? 'bg-slate-900/50 border-white/5 text-slate-400 hover:text-white hover:bg-slate-900'
                  : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full text-[10px] font-extrabold flex items-center justify-center text-white border-2 border-slate-950 animate-bounce">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className={`absolute right-0 mt-3 w-80 sm:w-96 border rounded-3xl p-4 shadow-2xl z-50 space-y-4 ${
                darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h5 className="font-bold text-sm">Customer Alerts</h5>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-400">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-wider"
                    >
                      Mark All Read
                    </button>
                  )}
                </div>
                <hr className={darkMode ? 'border-slate-800' : 'border-slate-100'} />
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {notifications.slice(0, 5).map((n, idx) => (
                    <div
                      key={n._id || n.id || idx}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3 rounded-2xl border flex flex-col gap-1 cursor-pointer transition-all ${
                        !n.read
                          ? darkMode ? 'bg-blue-600/10 border-blue-500/30 hover:bg-blue-600/15' : 'bg-blue-50 border-blue-200 hover:bg-blue-100/50'
                          : darkMode ? 'bg-slate-950/45 border-white/5 hover:bg-slate-950/70' : 'bg-slate-50 border-slate-100 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-bold ${!n.read ? 'text-blue-400' : darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          {n.title}
                        </span>
                        <span className="text-[9px] text-slate-500">{n.time || 'Just now'}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-normal line-clamp-2">{n.message}</p>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      No notifications yet.
                    </div>
                  )}
                </div>
                <hr className={darkMode ? 'border-slate-800' : 'border-slate-100'} />
                <Link
                  to="/customer/notifications"
                  onClick={() => setShowNotifDropdown(false)}
                  className="block text-center text-xs font-bold text-blue-500 hover:text-blue-400 uppercase tracking-wider pt-1"
                >
                  View All Alerts ({notifications.length})
                </Link>
              </div>
            )}
          </div>

          {/* User profile menu */}
          <div className={`flex items-center gap-2 pl-2 border-l ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <Link to="/customer/profile" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-blue-500/50 flex items-center justify-center bg-blue-600/20 text-blue-400 group-hover:border-blue-500 transition-all font-black text-sm select-none">
                {customer.photo ? (
                  <img
                    src={customer.photo}
                    alt={customer.fullName}
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback');
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <span
                  className="avatar-fallback w-full h-full items-center justify-center"
                  style={{ display: customer.photo ? 'none' : 'flex' }}
                >
                  {((customer.fullName || '').trim().charAt(0) || '').toUpperCase()}
                </span>
              </div>
              <span className={`text-xs font-bold group-hover:text-blue-500 transition-colors hidden md:inline ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {customer.fullName?.split(' ')[0]}
              </span>
            </Link>
            <button
              onClick={handleLogout}
              className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'text-slate-500 hover:text-red-400 hover:bg-slate-900' : 'text-slate-400 hover:text-red-600 hover:bg-slate-100'}`}
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Sidebar Container */}
      <CustomerSidebar isOpen={isSidebarOpen} toggleSidebar={setIsSidebarOpen} />

      {/* Main Content Area */}
      <main className={`flex-1 md:ml-64 pt-24 px-6 pb-12 overflow-x-hidden min-h-screen ${
        darkMode ? 'bg-slate-950' : 'bg-slate-50'
      }`}>
        <div className="max-w-7xl mx-auto space-y-6">
          <ErrorBoundary>
            <Outlet context={{ darkMode }} />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
};

export default CustomerLayout;
