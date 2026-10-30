import React from 'react';
import { Calendar, Clock, MapPin, User, Check, X, Phone, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../Button';
import { formatDateDDMMYYYY } from '../../utils/dateFormat';

const BookingCard = ({ booking, onAccept, onReject, onViewDetails, onContact }) => {
  const statusColors = {
    Pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Active: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Completed: 'bg-green-500/10 text-green-400 border-green-500/20',
    Rejected: 'bg-red-500/10 text-red-400 border-red-500/20'
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 shadow-xl space-y-4 hover:border-slate-700 transition-all duration-300 flex flex-col justify-between"
    >
      <div className="space-y-4">
        {/* Customer Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-700 bg-slate-800">
              {booking.customerPhoto ? (
                <img src={booking.customerPhoto} alt={booking.customerName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <User size={20} />
                </div>
              )}
            </div>
            <div>
              <h5 className="font-bold text-white leading-tight">{booking.customerName}</h5>
              <span className="text-xs text-slate-400">Customer</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
              {(booking.bookingId || booking.id || '').startsWith('#') ? (booking.bookingId || booking.id) : `#${booking.bookingId || booking.id}`}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${statusColors[booking.status]}`}>
              {booking.status}
            </span>
          </div>
        </div>

        <hr className="border-slate-800" />

        {/* Booking Details */}
        <div className="space-y-2.5">
          <h4 className="text-base font-bold text-white">{booking.serviceName}</h4>

          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <Calendar size={15} className="text-blue-500 flex-shrink-0" />
            <span>{formatDateDDMMYYYY(booking.date) || booking.date}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <Clock size={15} className="text-blue-500 flex-shrink-0" />
            <span>{booking.time}</span>
          </div>

          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <Phone size={15} className="text-blue-500 flex-shrink-0" />
            <span>{booking.customerPhone || 'Phone number not provided'}</span>
          </div>

          <div className="flex items-start gap-2 text-slate-300 text-sm">
            <MapPin size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <span className="line-clamp-2">{booking.customerAddress || booking.address || booking.location || 'Address not provided'}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">Est. Price</span>
          <span className="text-lg font-extrabold text-blue-400">₹{booking.price.toLocaleString('en-IN')}</span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {booking.status === 'Pending' && (
            <>
              <Button
                variant="danger"
                size="sm"
                onClick={() => onReject(booking.id)}
                className="w-full font-semibold rounded-xl"
              >
                <X className="w-4 h-4 mr-1.5" /> Reject
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onAccept(booking.id)}
                className="w-full font-semibold rounded-xl"
              >
                <Check className="w-4 h-4 mr-1.5" /> Accept
              </Button>
            </>
          )}
          {booking.status === 'Active' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onContact(booking)}
                className="w-full font-semibold rounded-xl text-xs"
              >
                <Phone className="w-3.5 h-3.5 mr-1" /> Contact
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onAccept(booking.id)} // Used as 'Complete' action in details
                className="w-full font-semibold rounded-xl text-xs bg-green-600 hover:bg-green-700 shadow-green-500/10"
              >
                <Check className="w-3.5 h-3.5 mr-1" /> Complete
              </Button>
            </>
          )}
          {booking.status === 'Completed' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDetails(booking)}
              className="col-span-2 w-full font-semibold rounded-xl"
            >
              <Eye className="w-4 h-4 mr-1.5" /> View Details
            </Button>
          )}
          {booking.status === 'Rejected' && (
            <span className="col-span-2 text-center text-xs text-slate-500 italic py-2">
              Request Rejected
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default BookingCard;
