import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Grid3X3,
  CalendarCheck,
  BarChart3,
  Bell,
  AlertOctagon,
  Settings,
  User,
  ShieldAlert
} from 'lucide-react';

const AdminSidebar = ({ isOpen, toggleSidebar }) => {
  const location = useLocation();

  const menuItems = [
    { name: 'Admin Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Customer Management', path: '/admin/customers', icon: Users },
    { name: 'Provider Management', path: '/admin/providers', icon: Briefcase },
    { name: 'Service Management', path: '/admin/services', icon: Grid3X3 },
    { name: 'Booking Management', path: '/admin/bookings', icon: CalendarCheck },
    { name: 'Reports & Analytics', path: '/admin/reports', icon: BarChart3 },
    { name: 'Complaints', path: '/admin/complaints', icon: AlertOctagon },
    { name: 'Notifications', path: '/admin/notifications', icon: Bell },
    { name: 'Platform Settings', path: '/admin/settings', icon: Settings },
    { name: 'Admin Profile', path: '/admin/profile', icon: User }
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
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <li key={item.name}>
                <Link
                  to={item.path}
                  onClick={() => toggleSidebar && toggleSidebar(false)}
                  className={`flex items-center p-3 rounded-2xl group transition-all duration-300 relative ${
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
                      layoutId="adminActiveIndicator"
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
            <ShieldAlert className="w-5 h-5 text-red-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-red-500">Security Access</span>
          </div>
          <p className="text-[10px] text-slate-500 font-medium">
            SmartServe AI Admin Panel v1.0
          </p>
        </div>
      </div>
    </aside>
  );
};

export default AdminSidebar;
