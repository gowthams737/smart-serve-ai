import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Bell, Menu, ShieldAlert, User, LogOut, Sun, Moon, Briefcase } from 'lucide-react';
import AdminSidebar from '../components/admin/AdminSidebar';
import { AdminService } from '../services/adminService';
import { AuthService } from '../services/authService';

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [darkMode, setDarkMode] = useState(true);
  const navigate = useNavigate();
  const currentUser = AuthService.getCurrentUser();

  useEffect(() => {
    const loadData = async () => {
      const info = AdminService.getProfile();
      setAdmin(info);

      const notifs = await AdminService.getNotifications();
      const notifsList = Array.isArray(notifs) ? notifs : [];
      setNotifications(notifsList);
      setUnreadCount(notifsList.filter(n => !n.read).length);
    };
    loadData();
  }, []);

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
    const updated = await AdminService.markNotificationsAsRead();
    setNotifications(updated);
    setUnreadCount(0);
  };

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login', { replace: true });
  };

  if (!admin) return null;

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
          
          <Link to="/admin/dashboard" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-300 shadow-lg shadow-red-500/20">
              <ShieldAlert className="text-white w-5 h-5" />
            </div>
            <span className={`text-xl font-bold bg-gradient-to-r ${darkMode ? 'from-white to-slate-400' : 'from-slate-900 to-slate-600'} bg-clip-text text-transparent hidden sm:inline-block`}>
              SmartServe AI Admin
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

          {/* Switcher links for Admin only */}
          {currentUser?.role === 'Admin' && (
            <>
              <Link
                to="/customer/dashboard"
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  darkMode
                    ? 'bg-slate-900/50 text-slate-300 border-white/5 hover:bg-slate-800'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <User className="w-3.5 h-3.5 text-blue-500" />
                <span className="hidden sm:inline">Customer Portal</span>
              </Link>

              <Link
                to="/provider/dashboard"
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  darkMode
                    ? 'bg-slate-900/50 text-slate-300 border-white/5 hover:bg-slate-800'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5 text-green-500" />
                <span className="hidden sm:inline">Provider Portal</span>
              </Link>
            </>
          )}

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className={`p-2.5 border rounded-xl transition-all flex items-center justify-center ${
                darkMode
                  ? 'bg-slate-900/50 border-white/5 text-slate-400 hover:text-white hover:bg-slate-900'
                  : 'bg-white border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full text-[10px] font-extrabold flex items-center justify-center text-white border-2 border-slate-950 animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className={`absolute right-0 mt-3 w-80 border rounded-3xl p-4 shadow-2xl z-50 space-y-4 ${
                darkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
              }`}>
                <div className="flex items-center justify-between">
                  <h5 className="font-bold text-sm">System Alerts</h5>
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-wider"
                  >
                    Mark All Read
                  </button>
                </div>
                <hr className={darkMode ? 'border-slate-800' : 'border-slate-100'} />
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {notifications.slice(0, 4).map((n) => (
                    <div key={n.id} className={`p-3 rounded-2xl border flex flex-col gap-1 ${
                      darkMode ? 'bg-slate-950/45 border-white/5' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-bold ${n.read ? 'text-slate-400' : 'text-red-500'}`}>
                          {n.title}
                        </span>
                        <span className="text-[9px] text-slate-500">{n.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-normal">{n.message}</p>
                    </div>
                  ))}
                  {notifications.length === 0 && (
                    <p className="text-center text-xs text-slate-500 py-4">No alerts.</p>
                  )}
                </div>
                <hr className={darkMode ? 'border-slate-800' : 'border-slate-100'} />
                <Link
                  to="/admin/notifications"
                  onClick={() => setShowNotifDropdown(false)}
                  className="block text-center text-xs font-bold text-red-500 hover:text-red-400 uppercase tracking-wider pt-1"
                >
                  View All Alerts
                </Link>
              </div>
            )}
          </div>

          {/* User profile menu */}
          <div className={`flex items-center gap-2 pl-2 border-l ${darkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <Link to="/admin/profile" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-red-500/50 flex items-center justify-center bg-slate-900 group-hover:border-red-500 transition-all">
                {admin.avatar ? (
                  <img src={admin.avatar} alt={admin.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-extrabold text-red-500">
                    {admin.fullName?.charAt(0)}
                  </span>
                )}
              </div>
              <span className={`text-xs font-bold group-hover:text-red-500 transition-colors hidden md:inline ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {admin.fullName?.split(' ')[0]}
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
      <AdminSidebar isOpen={isSidebarOpen} toggleSidebar={setIsSidebarOpen} />

      {/* Main Content Area */}
      <main className={`flex-1 md:ml-64 pt-24 px-6 pb-12 overflow-x-hidden min-h-screen ${
        darkMode ? 'bg-slate-950' : 'bg-slate-50'
      }`}>
        <div className="max-w-7xl mx-auto space-y-6">
          <Outlet context={{ darkMode }} />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
