import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShieldCheck, Award, MapPin, Clock, User, IndianRupee, ArrowRight } from 'lucide-react';
import RatingStars from './RatingStars';
import { formatWorkingHours } from '../../utils/timeFormat';

const ProfileCard = ({ provider }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl shadow-xl space-y-6 flex flex-col justify-between"
    >
      <div className="space-y-6">
        {/* Header Photo & Name */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-500/20 p-1 bg-slate-800 flex items-center justify-center">
              {provider.profilePhoto || provider.photo ? (
                <img src={provider.profilePhoto || provider.photo} alt={provider.fullName} className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-3xl font-extrabold text-blue-500">
                  {provider.fullName?.charAt(0)}
                </span>
              )}
            </div>
            {provider.isOnline && (
              <span className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-4 border-slate-900 rounded-full" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5">
              <h4 className="text-xl font-bold text-white leading-tight">{provider.fullName}</h4>
              <ShieldCheck className="w-5 h-5 text-blue-500" />
            </div>
            <span className="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {provider.category}
            </span>
          </div>
        </div>

        <hr className="border-white/5" />

        {/* Rating Stars Summary */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Average Rating</span>
            <div className="flex items-center gap-1.5">
              <RatingStars rating={provider.rating} size={14} />
              <span className="text-sm font-extrabold text-white">{provider.rating}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Total Reviews</span>
            <span className="text-slate-200">{provider.reviewsCount} reviews</span>
          </div>

          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>Completed Jobs</span>
            <span className="text-slate-200">{provider.completedJobs} jobs</span>
          </div>

          {/* Clickable Availability Status */}
          <Link
            to="/provider/availability"
            className="flex items-center justify-between text-xs font-semibold text-slate-400 hover:text-white p-2 -mx-2 rounded-xl hover:bg-slate-800/60 border border-transparent hover:border-white/5 transition-all cursor-pointer group focus:outline-none focus:ring-1 focus:ring-blue-500"
            role="button"
            tabIndex={0}
            aria-label="Manage Availability Status and Working Hours"
          >
            <span className="group-hover:text-slate-200 transition-colors">Availability Status</span>
            <span className={`font-bold flex items-center gap-1.5 ${provider.isOnline ? 'text-green-400 animate-pulse' : 'text-slate-500'}`}>
              {provider.isOnline ? 'Online & Available' : 'Offline'}
              <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100" />
            </span>
          </Link>
        </div>

        <hr className="border-white/5" />

        {/* Mini Details */}
        <div className="space-y-3 text-xs text-slate-400 font-medium">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span>{provider.experience} Years Professional Experience</span>
          </div>
          {provider.gender && provider.age ? (
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span>{provider.gender}, {provider.age} yrs</span>
            </div>
          ) : null}
          {/* Clickable Hours row */}
          <Link
            to="/provider/availability"
            className="flex items-center justify-between p-2 -mx-2 rounded-xl hover:bg-slate-800/60 border border-transparent hover:border-white/5 text-slate-400 hover:text-slate-200 transition-all cursor-pointer group focus:outline-none focus:ring-1 focus:ring-blue-500"
            role="button"
            tabIndex={0}
            aria-label="View and configure operating hours"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span>Hours: {formatWorkingHours(provider.workingHours)}</span>
            </div>
            <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all opacity-0 group-hover:opacity-100" />
          </Link>
          {(provider.rate || provider.pricing?.[0]?.price) ? (
            <div className="flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span>Rate: ₹{provider.rate || provider.pricing?.[0]?.price} / {provider.pricingUnit || provider.pricing?.[0]?.unit || 'Visit'}</span>
            </div>
          ) : null}
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <span>{provider.city || 'Coimbatore'}, {provider.state || 'Tamil Nadu'}</span>
          </div>
        </div>
      </div>

      {/* Profile completion rate */}
      {provider.profileCompletion < 100 && (
        <div className="pt-2">
          <div className="flex justify-between items-center text-xs font-semibold mb-1">
            <span className="text-slate-400">Profile Completion</span>
            <span className="text-blue-400">{provider.profileCompletion}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full"
              style={{ width: `${provider.profileCompletion}%` }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ProfileCard;
