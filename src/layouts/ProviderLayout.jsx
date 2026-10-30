import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, ShieldCheck, Check, Power, Star, User, LogOut, AlertCircle, RotateCcw } from 'lucide-react';
import Sidebar from '../components/provider/Sidebar';
import { ProviderService } from '../services/providerService';
import { AuthService } from '../services/authService';
import { getNotificationDestination } from '../utils/notificationNavigation';
import ErrorBoundary from '../components/ErrorBoundary';

const ProviderLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();
  const currentUser = AuthService.getCurrentUser();

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const user = AuthService.getCurrentUser();
      if (!user || user.role !== 'Provider') {
        navigate('/login');
        return;
      }

      const info = await ProviderService.getProviderInfo();
      if (!info) {
        setError('Unable to load service provider account details.');
        setLoading(false);
        return;
      }
      setProvider(info);

      const notifs = await ProviderService.getNotifications();
      const notifsList = Array.isArray(notifs) ? notifs : [];
      setNotifications(notifsList);
      setUnreadCount(notifsList.filter(n => !n.read).length);
    } catch (err) {
      console.error('Error loading provider layout:', err);
      setError(err.message || 'Failed to initialize Service Provider Portal.');
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
      const notifs = await ProviderService.getNotifications();
      const notifsList = Array.isArray(notifs) ? notifs : [];
      setNotifications(notifsList);
      setUnreadCount(notifsList.filter(n => !n.read).length);
    };

    window.addEventListener('providerProfileUpdated', handleProfileUpdate);
    window.addEventListener('providerNotificationsUpdated', handleNotificationsUpdate);
    return () => {
      window.removeEventListener('providerProfileUpdated', handleProfileUpdate);
      window.removeEventListener('providerNotificationsUpdated', handleNotificationsUpdate);
    };
  }, [navigate]);

  // Real-time Server-Sent Events (SSE) notification listener for Provider
  useEffect(() => {
    if (!provider?.email) return;

    let eventSource = null;
    try {
      const streamUrl = `http://localhost:5000/api/provider/notifications/stream/${encodeURIComponent(provider.email.toLowerCase().trim())}`;
      eventSource = new EventSource(streamUrl);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type !== 'connected') {
            setNotifications(prev => {
              const exists = prev.some(n => (n._id && n._id === data._id) || (n.id && n.id === data.id));
              if (exists) return prev;
              return [data, ...prev];
            });
            if (!data.read) {
              setUnreadCount(prev => prev + 1);
            }
            window.dispatchEvent(new CustomEvent('providerNotificationsUpdated', { detail: data }));
          }
        } catch (e) {
          console.warn('Error parsing incoming provider SSE notification:', e);
        }
      };

      eventSource.onerror = () => {
        // EventSource auto-reconnects
      };
    } catch (err) {
      console.warn('Provider SSE connection initialization skipped:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [provider?.email]);

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login', { replace: true });
  };

  const handleOnlineToggle = async () => {
    if (!provider) return;
    const nextOnlineState = !provider.isOnline;
    const updated = await ProviderService.updateProviderInfo({ isOnline: nextOnlineState });
    setProvider(updated);
    await ProviderService.addNotification({
      title: nextOnlineState ? 'System Online' : 'System Offline',
      message: nextOnlineState 
        ? 'You are now online and will receive new service requests.' 
        : 'You are now offline. Customers will not see you as active.',
      type: 'system',
      targetRoute: '/provider/availability'
    });
    const notifs = await ProviderService.getNotifications();
    const notifsList = Array.isArray(notifs) ? notifs : [];
    setNotifications(notifsList);
    setUnreadCount(notifsList.filter(n => !n.read).length);
  };

  const handleMarkAllRead = async () => {
    const updated = await ProviderService.markNotificationsAsRead();
    setNotifications(Array.isArray(updated) ? updated : []);
    setUnreadCount(0);
  };

  const handleNotificationClick = async (n) => {
    setShowNotifDropdown(false);
    const notifId = n._id || n.id;
    if (!n.read && notifId) {
      await ProviderService.markNotificationAsRead(notifId);
      setNotifications((prev) =>
        prev.map((item) => ((item.id === notifId || item._id === notifId) ? { ...item, read: true } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    const destination = getNotificationDestination(n, 'Provider');
    navigate(destination);
  };

  // Safe Loading State - Prevents Blank Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm font-semibold tracking-wide text-slate-400">Loading SmartServe Provider Portal...</p>
      </div>
    );
  }

  // Safe Error State - Prevents Blank Screen
  if (!provider) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900/90 border border-white/10 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Provider Session Unavailable</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            {error || 'Unable to retrieve your service provider details. Please sign in again.'}
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
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 h-20 bg-slate-950/80 backdrop-blur-md border-b border-white/10 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <Link to="/provider/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300 shadow-lg shadow-blue-500/20">
              <ShieldCheck className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent hidden sm:inline-block">
              SmartServe AI Partner
            </span>
          </Link>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {/* Status Toggle Button */}
          <button
            onClick={handleOnlineToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
              provider.isOnline
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${provider.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span>{provider.isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </button>

          {/* Switch to Admin View - Admin ONLY */}
          {currentUser?.role === 'Admin' && (
            <Link
              to="/admin/dashboard"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/50 border border-white/10 text-slate-300 hover:bg-slate-800 text-xs font-bold transition-all"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-red-500" />
              <span className="hidden sm:inline">Admin Portal</span>
            </Link>
          )}

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-400 hover:text-white transition-colors relative"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full text-[10px] font-extrabold flex items-center justify-center text-white border-2 border-slate-950 animate-bounce">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifDropdown && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-2xl z-50 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h5 className="font-bold text-sm text-white">Notifications</h5>
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
                <hr className="border-slate-800" />
                <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                  {notifications.slice(0, 5).map((n, idx) => (
                    <div
                      key={n._id || n.id || idx}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3 rounded-2xl border flex flex-col gap-1 cursor-pointer transition-all ${
                        !n.read
                          ? 'bg-blue-600/10 border-blue-500/30 hover:bg-blue-600/15'
                          : 'bg-slate-950/45 border-white/5 hover:bg-slate-950/70'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-bold ${!n.read ? 'text-blue-400' : 'text-slate-300'}`}>
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
                <hr className="border-slate-800" />
                <Link
                  to="/provider/notifications"
                  onClick={() => setShowNotifDropdown(false)}
                  className="block text-center text-xs font-bold text-blue-500 hover:text-blue-400 uppercase tracking-wider pt-1"
                >
                  View All Notifications ({notifications.length})
                </Link>
              </div>
            )}
          </div>

          {/* User Widget */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <Link
              to="/provider/profile"
              className="flex items-center gap-2 group"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden border border-blue-500/50 flex items-center justify-center bg-slate-900 group-hover:border-blue-500 transition-all font-black text-sm select-none">
                {provider.profilePhoto || provider.photo ? (
                  <img
                    src={provider.profilePhoto || provider.photo}
                    alt={provider.fullName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.parentElement?.querySelector('.provider-avatar-fallback');
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <span
                  className="provider-avatar-fallback w-full h-full items-center justify-center text-xs font-extrabold text-blue-400"
                  style={{ display: (provider.profilePhoto || provider.photo) ? 'none' : 'flex' }}
                >
                  {provider.fullName?.charAt(0) || 'P'}
                </span>
              </div>
              <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors hidden md:inline">
                {provider.fullName?.split(' ')[0]}
              </span>
            </Link>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-900 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar Container */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={setIsSidebarOpen} />

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 pt-24 px-6 pb-12 overflow-x-hidden min-h-screen bg-slate-950">
        <div className="max-w-7xl mx-auto space-y-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
};

export default ProviderLayout;
