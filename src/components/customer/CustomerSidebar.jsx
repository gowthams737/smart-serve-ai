import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Search,
  Grid3X3,
  CalendarCheck,
  Heart,
  Bell,
  User,
  Clock,
  ShieldCheck,
  Sparkles,
  Bot,
  Calculator,
  Calendar,
  TrendingUp
} from 'lucide-react';

const CustomerSidebar = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', path: '/customer/dashboard', icon: LayoutDashboard },
    { name: 'AI Assistant', path: '/customer/ai-assistant', icon: Bot },
    { name: 'AI Cost Estimator', path: '/customer/ai-estimator', icon: Calculator },
    { name: 'AI Service Planner', path: '/customer/ai-planner', icon: Calendar },
    { name: 'Browse Services', path: '/customer/services', icon: Grid3X3 },
    { name: 'Search Providers', path: '/customer/providers', icon: Search },
    { name: 'Bookings & Saved', path: '/customer/bookings-and-saved', icon: Clock },
    { name: 'My Profile', path: '/customer/profile', icon: User },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 z-40 w-64 h-screen pt-20 transition-transform bg-slate-950 border-r border-white/10 md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="h-full px-4 py-6 overflow-y-auto flex flex-col justify-between">
        <ul className="space-y-2 font-medium">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path === '/customer/bookings-and-saved' && (location.pathname === '/customer/history' || location.pathname === '/customer/saved'));
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
                      layoutId="customerActiveIndicator"
                      className="absolute left-0 w-1 h-8 bg-white rounded-r-full"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 text-center mt-6">
          <div className="flex items-center justify-center gap-1.5 text-blue-500 mb-1">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Trusted Platform</span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium">
            SmartServe AI Customer Portal v1.0
          </p>
        </div>
      </div>
    </aside>
  );
};

export default CustomerSidebar;
