import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Sparkles, Filter, CheckCircle2 } from 'lucide-react';
import NotificationCard from '../../components/provider/NotificationCard';
import FilterComponent from '../../components/provider/FilterComponent';
import EmptyState from '../../components/provider/EmptyState';
import { ProviderService } from '../../services/providerService';
import { getNotificationDestination } from '../../utils/notificationNavigation';

const ProviderNotifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');

  const filterOptions = [
    { label: 'All Alerts', value: 'All' },
    { label: 'Unread Only', value: 'Unread' },
    { label: 'Read Only', value: 'Read' }
  ];

  const fetchNotifs = async () => {
    const list = await ProviderService.getNotifications();
    setNotifications(Array.isArray(list) ? list : []);
  };

  useEffect(() => {
    fetchNotifs();

    window.addEventListener('providerNotificationsUpdated', fetchNotifs);
    return () => window.removeEventListener('providerNotificationsUpdated', fetchNotifs);
  }, []);

  const handleMarkAllRead = async () => {
    const updated = await ProviderService.markNotificationsAsRead();
    setNotifications(Array.isArray(updated) ? updated : []);
  };

  const handleNotificationClick = async (notif) => {
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

  const filteredNotifs = notifications.filter((n) => {
    if (activeFilter === 'Read') return n.read;
    if (activeFilter === 'Unread') return !n.read;
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title & mark read action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white">Notifications Center</h2>
          <p className="text-slate-400 text-sm mt-1">Review alerts, customer bookings requests logs, and payouts reports.</p>
        </div>

        {notifications.some((n) => !n.read) && (
          <button
            onClick={handleMarkAllRead}
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-white flex items-center gap-2 transition-all"
          >
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
            <span>Mark All Read</span>
          </button>
        )}
      </div>

      {/* Filter panel */}
      <div className="p-5 rounded-3xl bg-slate-900/40 border border-white/5 backdrop-blur-xl flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filters</span>
        </div>
        <FilterComponent
          options={filterOptions}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
      </div>

      {/* List */}
      {filteredNotifs.length === 0 ? (
        <EmptyState
          title="All caught up!"
          message="No matching alerts exist for this selection."
          icon={Bell}
        />
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredNotifs.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <NotificationCard
                  notification={notif}
                  onClick={() => handleNotificationClick(notif)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default ProviderNotifications;
