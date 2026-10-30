import React from 'react';
import { Bell, Calendar, CreditCard, Sparkles, Award } from 'lucide-react';

const NotificationCard = ({ notification, onClick }) => {
  const typeIcons = {
    new_booking: { icon: Calendar, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
    booking_cancelled: { icon: Calendar, color: 'text-red-500 bg-red-500/10 border-red-500/20' },
    payment_received: { icon: CreditCard, color: 'text-green-500 bg-green-500/10 border-green-500/20' },
    new_review: { icon: Sparkles, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
    profile_approved: { icon: Award, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' }
  };

  const currentType = typeIcons[notification.type] || { icon: Bell, color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' };
  const Icon = currentType.icon;

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick(e);
        }
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={`${notification.title}: ${notification.message}`}
      className={`p-5 rounded-3xl border transition-all duration-300 flex items-start gap-4 ${
        onClick ? 'cursor-pointer hover:border-blue-500/40 hover:bg-slate-900/80 focus:outline-none focus:ring-1 focus:ring-blue-500/40' : ''
      } ${
        notification.read
          ? 'bg-slate-900/20 border-slate-900/60'
          : 'bg-slate-900/60 border-slate-800 shadow-lg'
      }`}
    >
      {/* Icon Badge */}
      <div className={`p-3 rounded-2xl border flex-shrink-0 flex items-center justify-center ${currentType.color}`}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Message Info */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between gap-4">
          <h5 className="font-bold text-white text-sm leading-snug">{notification.title}</h5>
          <span className="text-[10px] text-slate-500 font-bold whitespace-nowrap">{notification.time}</span>
        </div>
        <p className="text-slate-400 text-xs leading-relaxed">{notification.message}</p>
      </div>

      {/* Unread Indicator */}
      {!notification.read && (
        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0 shadow-md shadow-blue-500/50" />
      )}
    </div>
  );
};

export default NotificationCard;
