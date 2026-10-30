import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

const StatsCard = ({ title, value, icon: Icon, trend, color = 'blue', to, onClick }) => {
  const colorMap = {
    blue: 'from-blue-600/20 to-blue-900/10 border-blue-500/30 text-blue-400',
    green: 'from-green-600/20 to-green-900/10 border-green-500/30 text-green-400',
    amber: 'from-amber-600/20 to-amber-900/10 border-amber-500/30 text-amber-400',
    purple: 'from-purple-600/20 to-purple-900/10 border-purple-500/30 text-purple-400',
    red: 'from-red-600/20 to-red-900/10 border-red-500/30 text-red-400'
  };

  const renderTrend = () => {
    if (!trend) return null;

    if (typeof trend === 'object') {
      if (trend.hasHistoricalData) {
        const pct = trend.percentage ?? 0;
        const isUp = pct > 0;
        const isDown = pct < 0;
        return (
          <span className={`text-xs font-semibold flex items-center gap-1 ${
            isUp ? 'text-green-400' : isDown ? 'text-red-400' : 'text-slate-400'
          }`}>
            <span>{isUp ? `+${pct}%` : `${pct}%`}</span>
            <span className="text-slate-500 font-normal ml-0.5">{trend.label || 'Compared with previous 30 days'}</span>
          </span>
        );
      }
      return (
        <span className="text-[11px] font-medium text-slate-500 block">
          {trend.message || 'Not enough historical data'}
        </span>
      );
    }

    if (typeof trend === 'string') {
      if (trend.trim().toLowerCase() === 'not enough historical data') {
        return (
          <span className="text-[11px] font-medium text-slate-500 block">
            Not enough historical data
          </span>
        );
      }
      const isUp = trend.startsWith('+');
      const isDown = trend.startsWith('-');
      return (
        <span className={`text-xs font-semibold ${
          isUp ? 'text-green-400' : isDown ? 'text-red-400' : 'text-slate-400'
        }`}>
          {trend}
        </span>
      );
    }

    return null;
  };

  const isInteractive = Boolean(to || onClick);

  const cardContent = (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`p-6 rounded-2xl bg-gradient-to-br ${colorMap[color]} border backdrop-blur-xl shadow-xl flex items-center justify-between gap-4 transition-all duration-200 ${
        isInteractive ? 'cursor-pointer hover:border-white/30 group' : ''
      }`}
    >
      <div className="space-y-2 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-slate-400 block group-hover:text-slate-200 transition-colors">
            {title}
          </span>
          {isInteractive && (
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-all transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 opacity-60 group-hover:opacity-100" />
          )}
        </div>
        <h4 className="text-3xl font-extrabold text-white tracking-tight">{value}</h4>
        {renderTrend()}
      </div>
      <div className="p-4 bg-slate-950/60 rounded-xl border border-white/5 flex items-center justify-center group-hover:bg-slate-950/80 transition-colors">
        {Icon && <Icon className="w-6 h-6" />}
      </div>
    </motion.div>
  );

  if (to) {
    return (
      <Link
        to={to}
        className="block focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded-2xl"
        role="button"
        tabIndex={0}
        aria-label={`${title}: ${value}. Click to view details.`}
      >
        {cardContent}
      </Link>
    );
  }

  if (onClick) {
    return (
      <div
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(e);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`${title}: ${value}`}
        className="focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded-2xl"
      >
        {cardContent}
      </div>
    );
  }

  return cardContent;
};

export default StatsCard;
