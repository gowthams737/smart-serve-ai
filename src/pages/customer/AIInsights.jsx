import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Award,
  IndianRupee,
  Briefcase,
  Percent,
  Clock,
  ThumbsUp,
  MapPin,
  Sparkles
} from 'lucide-react';
import { CustomerService } from '../../services/customerService';

const AIInsights = () => {
  const { darkMode } = useOutletContext();
  const [data, setData] = useState(null);

  useEffect(() => {
    setData(CustomerService.getAIInsightsData());
  }, []);

  if (!data) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h2 className={`text-3xl font-extrabold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          <TrendingUp className="w-8 h-8 text-blue-500" />
          AI Insights & Analytics
        </h2>
        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
          Coimbatore market service trends, average pricing indices, and system performance logs.
        </p>
      </div>

      {/* Grid containing summary statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Customer Satisfaction', value: `${data.customerSatisfaction} / 5.0`, subtitle: 'Based on 4,500+ reviews', icon: ThumbsUp, color: 'text-green-500 bg-green-500/10' },
          { title: 'Job Completion Rate', value: `${data.providerPerformance.completionRate}%`, subtitle: 'Target: 98.0% minimum', icon: Percent, color: 'text-blue-500 bg-blue-500/10' },
          { title: 'Average Response Time', value: data.providerPerformance.averageResponseTime, subtitle: 'Dispatch duration', icon: Clock, color: 'text-amber-500 bg-amber-500/10' },
          { title: 'Active Experts (Coimbatore)', value: data.providerPerformance.activeProviders, subtitle: 'Verified professionals', icon: Briefcase, color: 'text-purple-500 bg-purple-500/10' }
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className={`p-6 rounded-3xl border ${
                darkMode ? 'bg-slate-900/50 border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
              }`}
            >
              <div className="flex justify-between items-center mb-4">
                <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>
                  {item.title}
                </span>
                <div className={`p-2.5 rounded-xl ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <h4 className="text-2xl font-extrabold tracking-tight">{item.value}</h4>
              <p className={`text-[10px] ${darkMode ? 'text-slate-500' : 'text-slate-400'} mt-1`}>{item.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Charts split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2/3): Booking Volume Monthly Trend */}
        <div className={`lg:col-span-2 p-6 rounded-3xl border flex flex-col justify-between gap-6 ${
          darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <h4 className={`text-base font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-1.5`}>
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <span>Monthly Booking Volume Trend</span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Aggregate user orders completed in Coimbatore</p>
          </div>

          {/* Bar Chart Container */}
          <div className="h-64 flex items-end justify-between pt-6 px-4 relative">
            {/* Grid background lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-5 pr-8 py-6">
              <hr className="border-white" />
              <hr className="border-white" />
              <hr className="border-white" />
              <hr className="border-white" />
            </div>

            {data.bookingTrends.map((t, idx) => {
              const maxVal = Math.max(...data.bookingTrends.map(b => b.bookings));
              const heightPercent = `${(t.bookings / maxVal) * 90}%`;

              return (
                <div key={idx} className="flex flex-col items-center gap-2 w-1/6 group relative z-10">
                  {/* Tooltip */}
                  <span className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 text-white font-bold text-[10px] px-2 py-0.5 rounded shadow-lg pointer-events-none">
                    {t.bookings} bookings
                  </span>

                  {/* Visual Bar */}
                  <div
                    style={{ height: heightPercent }}
                    className="w-8 sm:w-12 bg-gradient-to-t from-blue-600 to-cyan-500 rounded-t-xl transition-all duration-1000 group-hover:from-blue-500 group-hover:to-cyan-400 group-hover:scale-y-[1.03]"
                  />

                  {/* Label */}
                  <span className={`text-[10px] font-bold ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {t.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (1/3): Trending Categories List */}
        <div className={`p-6 rounded-3xl border space-y-6 ${
          darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div>
            <h4 className={`text-base font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-1.5`}>
              <Sparkles className="w-5 h-5 text-blue-500" />
              <span>Trending Categories</span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Highest order growth rates this week</p>
          </div>

          <div className="space-y-4">
            {data.trendingServices.map((cat, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className={darkMode ? 'text-slate-200' : 'text-slate-800'}>{cat.name}</span>
                  <span className="text-green-500">{cat.growth}</span>
                </div>
                {/* Progress bar */}
                <div className={`h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <div
                    style={{ width: `${(cat.bookings / 130) * 100}%`, backgroundColor: cat.color }}
                    className="h-full rounded-full transition-all duration-1000"
                  />
                </div>
                <span className="text-[9px] text-slate-500 font-medium block">
                  {cat.bookings} local bookings in Coimbatore
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Average Pricing comparison index */}
      <div className={`p-6 rounded-3xl border space-y-6 ${
        darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div>
          <h4 className={`text-base font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'} flex items-center gap-1.5`}>
            <IndianRupee className="w-5 h-5 text-blue-500" />
            <span>Regional Price Index (SmartServe vs. State Average)</span>
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">AI-driven cost efficiency comparisons across Tamil Nadu</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {data.averagePricing.map((item, idx) => {
            const savings = Math.round(((item.stateAvg - item.price) / item.stateAvg) * 100);
            return (
              <div
                key={idx}
                className={`p-4 rounded-2xl border text-center space-y-2 ${
                  darkMode ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-100'
                }`}
              >
                <h5 className={`font-extrabold text-xs ${darkMode ? 'text-white' : 'text-slate-800'}`}>
                  {item.category}
                </h5>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase">SmartServe</span>
                  <span className="text-base font-black text-blue-500">₹{item.price}</span>
                </div>
                <hr className={darkMode ? 'border-slate-800' : 'border-slate-200'} />
                <div className="flex items-center justify-between text-[10px] font-bold px-1 text-slate-400">
                  <span>State Avg:</span>
                  <span className="text-slate-500">₹{item.stateAvg}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-[9px] font-black text-green-500 inline-block uppercase tracking-wider">
                  Save {savings}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AIInsights;
