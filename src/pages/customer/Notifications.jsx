import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2, Calendar, AlertCircle, CreditCard, Sparkles, TrendingUp, CheckCircle2 } from 'lucide-react';
import { CustomerService } from '../../services/customerService';
import { getNotificationDestination } from '../../utils/notificationNavigation';

const CustomerNotifications = () => {
  const { darkMode } = useOutletContext();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifs = async () => {
    try {
      setLoading(true);
      const alerts = await CustomerService.getNotifications();
      setNotifications(Array.isArray(alerts) ? alerts : []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifs();

    const handleNotifUpdate = () => {
      loadNotifs();
    };

    window.addEventListener('customerNotificationsUpdated', handleNotifUpdate);
    window.addEventListener('focus', handleNotifUpdate);
    return () => {
      window.removeEventListener('customerNotificationsUpdated', handleNotifUpdate);
      window.removeEventListener('focus', handleNotifUpdate);
    };
  }, []);

  const handleMarkAllRead = async () => {
    const updated = await CustomerService.markNotificationsAsRead();
    setNotifications(Array.isArray(updated) ? updated : []);
  };

  const handleNotificationClick = async (n) => {
    const notifId = n._id || n.id;
    if (!n.read && notifId) {
      await CustomerService.markNotificationAsRead(notifId);
      setNotifications((prev) =>
        prev.map((item) => ((item._id === notifId || item.id === notifId) ? { ...item, read: true } : item))
      );
    }
    const destination = getNotificationDestination(n, 'Customer');
    if (destination) {
      navigate(destination);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'booking_confirmed':
      case 'provider_accepted':
      case 'service_completed':
        return <Calendar className="w-4 h-4 text-emerald-500" />;
      case 'booking':
        return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
      case 'payment_success':
        return <CreditCard className="w-4 h-4 text-blue-500" />;
      case 'provider_cancelled':
      case 'booking_cancelled':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'review':
        return <Sparkles className="w-4 h-4 text-amber-500" />;
      default:
        return <Bell className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-3xl font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Notification Center
          </h2>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
            Real-time notifications for your bookings, provider updates, and completed services.
          </p>
        </div>

        {notifications.some(n => !n.read) && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all"
          >
            <Check className="w-3.5 h-3.5" /> Mark All Read
          </button>
        )}
      </div>

      {/* Notifications stack */}
      <div className="space-y-4">
        {notifications.map((n) => {
          const notifId = n._id || n.id;
          return (
            <div
              key={notifId}
              onClick={() => handleNotificationClick(n)}
              className={`p-5 rounded-3xl border flex items-start gap-4 transition-all cursor-pointer ${
                !n.read 
                  ? darkMode ? 'bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50' : 'bg-blue-50/70 border-blue-200 hover:border-blue-300 shadow-sm' 
                  : darkMode ? 'bg-slate-900/40 border-white/5 hover:border-white/10' : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
              }`}
            >
              <div className={`p-2.5 rounded-xl h-fit ${
                !n.read 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : darkMode ? 'bg-slate-950 text-slate-500' : 'bg-slate-100 text-slate-500'
              }`}>
                {getIcon(n.type)}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-center">
                  <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>{n.title}</h4>
                  <span className="text-[10px] text-slate-500">{n.time || 'Just now'}</span>
                </div>
                <p className={`text-xs leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {n.message}
                </p>
                {!n.read && (
                  <span className="inline-block mt-2 px-2 py-0.5 rounded bg-blue-600 text-white text-[9px] font-bold uppercase tracking-wider">
                    New
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {!loading && notifications.length === 0 && (
          <div className="py-20 text-center text-slate-500 font-medium">
            Your notification inbox is clean. Real-time alerts will appear here as your bookings progress.
          </div>
        )}

        {loading && (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-xs font-semibold">Loading notifications...</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default CustomerNotifications;
