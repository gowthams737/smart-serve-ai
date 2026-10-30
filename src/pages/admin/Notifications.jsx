import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, ShieldCheck, Mail, ShieldAlert, Award, FileText, CheckCircle2 } from 'lucide-react';
import { AdminService } from '../../services/adminService';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('All');

  const loadNotifications = async () => {
    const list = await AdminService.getNotifications();
    setNotifications(list);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    const updated = await AdminService.markNotificationsAsRead();
    setNotifications(updated);
  };

  const getIcon = (type) => {
    switch (type) {
      case 'registration':
        return <Award className="w-5 h-5 text-green-500" />;
      case 'complaint':
        return <ShieldAlert className="w-5 h-5 text-red-500" />;
      case 'booking':
        return <FileText className="w-5 h-5 text-blue-500" />;
      default:
        return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  const filteredNotifs = notifications.filter(n => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Unread') return !n.read;
    return n.type === activeTab.toLowerCase();
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">System Alerts Center</h1>
          <p className="text-sm text-slate-400 mt-1">Review operational updates, registration alerts, and unresolved complaints.</p>
        </div>
        <button
          onClick={handleMarkAllRead}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-300 hover:text-white rounded-2xl text-xs font-bold transition-all self-start sm:self-auto"
        >
          <CheckCircle2 className="w-4 h-4 text-blue-500" />
          Mark All As Read
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 overflow-x-auto gap-4 scrollbar-none">
        {['All', 'Unread', 'Registration', 'Complaint', 'Booking'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-xs font-bold uppercase tracking-wider relative whitespace-nowrap ${
              activeTab === tab ? 'text-blue-500 font-extrabold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <motion.div
                layoutId="notifTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {/* Notifications feed */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredNotifs.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-4 rounded-3xl border flex items-start gap-4 transition-all duration-300 ${
                notif.read 
                  ? 'bg-slate-900/30 border-white/5 opacity-75' 
                  : 'bg-slate-900/60 border-white/15 shadow-lg shadow-blue-500/[0.02]'
              }`}
            >
              <div className="p-3 bg-slate-950/50 rounded-2xl border border-white/5">
                {getIcon(notif.type)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <h4 className="font-extrabold text-white text-xs flex items-center gap-2">
                    {notif.title}
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    )}
                  </h4>
                  <span className="text-[10px] text-slate-500 font-bold">{notif.time}</span>
                </div>
                <p className="text-xs text-slate-300 leading-normal font-medium">{notif.message}</p>
              </div>
            </motion.div>
          ))}
          {filteredNotifs.length === 0 && (
            <div className="text-center py-12 bg-slate-900/20 border border-slate-800 rounded-3xl space-y-2">
              <Bell className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-500">No notifications found in this segment.</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Notifications;
