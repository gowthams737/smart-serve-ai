import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Briefcase, 
  CalendarCheck, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  Sparkles, 
  Activity, 
  TrendingDown
} from 'lucide-react';
import { AdminService } from '../../services/adminService';

const Dashboard = () => {
  const [stats, setStats] = useState({
    customers: 0,
    providers: 0,
    activeBookings: 0,
    completedBookings: 0,
    pendingBookings: 0,
    revenue: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const customers = await AdminService.getCustomers();
      const providers = await AdminService.getProviders();
      const bookings = await AdminService.getBookings();

      const active = bookings.filter(b => b.status === 'Active').length;
      const completed = bookings.filter(b => b.status === 'Completed').length;
      const pending = bookings.filter(b => b.status === 'Pending').length;
      const rev = bookings
        .filter(b => b.status === 'Completed')
        .reduce((sum, b) => sum + b.amount, 0);

      setStats({
        customers: customers.length,
        providers: providers.length,
        activeBookings: active,
        completedBookings: completed,
        pendingBookings: pending,
        revenue: rev
      });

      const recent = [];
      if (Array.isArray(bookings)) {
        bookings.slice(0, 4).forEach((b, i) => {
          recent.push({
            id: b.id || b.bookingId || `b-${i}`,
            type: 'booking',
            text: `${b.customerName || 'Customer'} booked ${b.serviceName || b.serviceType || 'service'} with ${b.providerName || 'Provider'} (${b.amount ? `₹${b.amount}` : ''}).`,
            time: b.date || 'Recent'
          });
        });
      }
      if (Array.isArray(providers) && recent.length < 4) {
        providers.slice(0, 4 - recent.length).forEach((p, i) => {
          recent.push({
            id: p.id || `p-${i}`,
            type: 'provider',
            text: `Provider ${p.name || p.fullName} registered for ${p.category || 'services'} in ${p.city || 'Coimbatore'}.`,
            time: 'Registered'
          });
        });
      }
      setRecentActivities(recent);
    };
    loadData();

    setAiInsights([
      { title: 'Demand Spike Alert', desc: 'AC Repair requests in Peelamedu and RS Puram are up by 42% this week due to rising humidity.', type: 'positive' },
      { title: 'Optimization Tip', desc: 'Carpenter categories have a 18% rejection rate. Consider onboarding 2 more carpenters in Vadavalli.', type: 'alert' },
      { title: 'Customer retention', desc: 'Loyalty programs introduced in June led to a 15% increase in repeat bookings.', type: 'info' }
    ]);
  }, []);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Platform operational status and overview stats.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <motion.div 
          variants={cardVariants} initial="hidden" animate="visible"
          className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl flex items-center justify-between"
        >
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Customers</span>
            <h3 className="text-3xl font-black text-white mt-1">{stats.customers}</h3>
            <span className="text-[10px] text-green-500 font-semibold flex items-center gap-0.5 mt-2">
              <TrendingUp className="w-3 h-3" /> +12% this month
            </span>
          </div>
          <div className="w-12 h-12 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-500">
            <Users className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div 
          variants={cardVariants} initial="hidden" animate="visible"
          className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl flex items-center justify-between"
        >
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Service Providers</span>
            <h3 className="text-3xl font-black text-white mt-1">{stats.providers}</h3>
            <span className="text-[10px] text-green-500 font-semibold flex items-center gap-0.5 mt-2">
              <TrendingUp className="w-3 h-3" /> +3 pending approval
            </span>
          </div>
          <div className="w-12 h-12 bg-green-600/10 border border-green-500/20 rounded-2xl flex items-center justify-center text-green-500">
            <Briefcase className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div 
          variants={cardVariants} initial="hidden" animate="visible"
          className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl flex items-center justify-between"
        >
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Platform Revenue</span>
            <h3 className="text-3xl font-black text-white mt-1">₹{(stats.revenue + 4398).toLocaleString('en-IN')}</h3>
            <span className="text-[10px] text-green-500 font-semibold flex items-center gap-0.5 mt-2">
              <TrendingUp className="w-3 h-3" /> +15.4% week-on-week
            </span>
          </div>
          <div className="w-12 h-12 bg-amber-600/10 border border-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500">
            <span className="text-xl font-bold font-mono">₹</span>
          </div>
        </motion.div>
      </div>

      {/* Bookings Stat Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900/30 border border-white/5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active Bookings</span>
            <h4 className="text-lg font-black text-white">{stats.activeBookings}</h4>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/30 border border-white/5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-500">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Completed Services</span>
            <h4 className="text-lg font-black text-white">{stats.completedBookings}</h4>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/30 border border-white/5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pending Requests</span>
            <h4 className="text-lg font-black text-white">{stats.pendingBookings}</h4>
          </div>
        </div>
      </div>

      {/* Graphs & AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG Monthly Revenue Graph */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-white text-base">Revenue Overview</h4>
              <p className="text-[11px] text-slate-500">Monthly breakdown for 2026</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Booking Revenue</span>
            </div>
          </div>

          {/* Custom SVG Line Chart */}
          <div className="h-64 relative pt-4">
            <svg viewBox="0 0 600 240" className="w-full h-full">
              {/* Grid Lines */}
              <line x1="40" y1="20" x2="580" y2="20" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
              <line x1="40" y1="80" x2="580" y2="80" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
              <line x1="40" y1="140" x2="580" y2="140" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
              <line x1="40" y1="200" x2="580" y2="200" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />

              {/* Chart Line Path */}
              <path
                d="M 50 180 Q 150 130 250 150 T 450 70 T 570 50"
                fill="none"
                stroke="url(#revenueGrad)"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* Gradient beneath chart line */}
              <path
                d="M 50 180 Q 150 130 250 150 T 450 70 T 570 50 L 570 200 L 50 200 Z"
                fill="url(#areaGrad)"
              />

              {/* Data points */}
              <circle cx="50" cy="180" r="5" className="fill-blue-500 stroke-slate-900 stroke-2" />
              <circle cx="150" cy="130" r="5" className="fill-blue-500 stroke-slate-900 stroke-2" />
              <circle cx="250" cy="150" r="5" className="fill-blue-500 stroke-slate-900 stroke-2" />
              <circle cx="350" cy="100" r="5" className="fill-blue-500 stroke-slate-900 stroke-2" />
              <circle cx="450" cy="70" r="5" className="fill-blue-500 stroke-slate-900 stroke-2" />
              <circle cx="570" cy="50" r="5" className="fill-blue-500 stroke-slate-900 stroke-2" />

              {/* Labels */}
              <text x="50" y="225" fill="#64748b" fontSize="10" textAnchor="middle">Jan</text>
              <text x="150" y="225" fill="#64748b" fontSize="10" textAnchor="middle">Feb</text>
              <text x="250" y="225" fill="#64748b" fontSize="10" textAnchor="middle">Mar</text>
              <text x="350" y="225" fill="#64748b" fontSize="10" textAnchor="middle">Apr</text>
              <text x="450" y="225" fill="#64748b" fontSize="10" textAnchor="middle">May</text>
              <text x="570" y="225" fill="#64748b" fontSize="10" textAnchor="middle">Jun</text>

              <text x="30" y="185" fill="#64748b" fontSize="9" textAnchor="end">₹5k</text>
              <text x="30" y="145" fill="#64748b" fontSize="9" textAnchor="end">₹15k</text>
              <text x="30" y="85" fill="#64748b" fontSize="9" textAnchor="end">₹25k</text>
              <text x="30" y="25" fill="#64748b" fontSize="9" textAnchor="end">₹40k</text>

              {/* Definitions */}
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* AI Insights & Alerts */}
        <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <h4 className="font-bold text-white text-base">AI platform Insights</h4>
          </div>
          <div className="space-y-3.5">
            {aiInsights.map((ins, i) => (
              <div 
                key={i} 
                className={`p-4 rounded-2xl border flex flex-col gap-1.5 ${
                  ins.type === 'positive' 
                    ? 'bg-green-500/5 border-green-500/10' 
                    : ins.type === 'alert' 
                    ? 'bg-red-500/5 border-red-500/10' 
                    : 'bg-blue-500/5 border-blue-500/10'
                }`}
              >
                <span className={`text-xs font-bold ${
                  ins.type === 'positive' ? 'text-green-400' : ins.type === 'alert' ? 'text-red-400' : 'text-blue-400'
                }`}>
                  {ins.title}
                </span>
                <p className="text-[11px] text-slate-300 leading-normal font-medium">{ins.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Operational Activity */}
      <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl">
        <h4 className="font-bold text-white text-base mb-4">Platform Activity Log</h4>
        <div className="divide-y divide-white/5 space-y-3">
          {recentActivities.length > 0 ? (
            recentActivities.map((act) => (
              <div key={act.id} className="pt-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    act.type === 'provider' ? 'bg-green-500' : act.type === 'booking' ? 'bg-blue-500' : 'bg-red-500'
                  }`}></span>
                  <p className="text-xs text-slate-300 font-medium">{act.text}</p>
                </div>
                <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap">{act.time}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 py-3">No recent platform activities recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
