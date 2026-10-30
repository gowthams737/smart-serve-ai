import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  User,
  Briefcase,
  CalendarCheck,
  Star,
  Clock,
  Bell,
  Settings,
  ShieldCheck
} from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', path: '/provider/dashboard', icon: LayoutDashboard },
    { name: 'My Profile', path: '/provider/profile', icon: User },
    { name: 'Manage Services', path: '/provider/services', icon: Briefcase },
    { name: 'Bookings Requests', path: '/provider/bookings', icon: CalendarCheck },
    { name: 'Reviews', path: '/provider/reviews', icon: Star },
    { name: 'Availability', path: '/provider/availability', icon: Clock },
    { name: 'Notifications', path: '/provider/notifications', icon: Bell },
    { name: 'Settings', path: '/provider/settings', icon: Settings },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 w-64 h-screen pt-20 transition-transform bg-slate-950 border-r border-white/10 md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="h-full px-4 py-6 overflow-y-auto flex flex-col justify-between">
        {/* Navigation Items */}
        <ul className="space-y-2 font-medium">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <li key={item.name}>
                <Link
                  to={item.path}
                  onClick={() => toggleSidebar && toggleSidebar(false)}
                  className={`flex items-center p-3 rounded-2xl group transition-all duration-300 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 transition duration-300 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                    }`}
                  />
                  <span className="ms-3 text-sm font-semibold">{item.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute left-0 w-1 h-8 bg-white rounded-r-full"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Brand / Footer */}
        <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 text-center mt-6">
          <div className="flex items-center justify-center gap-1.5 text-blue-500 mb-1">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Verified Partner</span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium">
            SmartServe AI Provider Portal v1.0
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
