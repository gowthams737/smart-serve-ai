import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  MapPin, 
  IndianRupee, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  X,
  FileText
} from 'lucide-react';
import { CustomerService } from '../../services/customerService';
import { formatDateDDMMYYYY } from '../../utils/dateFormat';
import { cleanImageUrl } from '../../utils/imageUrl';

const CustomerHistory = () => {
  const { darkMode } = useOutletContext();
  const [bookings, setBookings] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [cancellingBooking, setCancellingBooking] = useState(null);
  const [viewInvoice, setViewInvoice] = useState(null);

  useEffect(() => {
    const fetchBookings = async () => {
      const books = await CustomerService.getBookings();
      setBookings(books);
    };
    fetchBookings();
  }, []);

  const handleCancelBooking = async () => {
    if (!cancellingBooking) return;
    await CustomerService.cancelBooking(cancellingBooking.id);
    const books = await CustomerService.getBookings();
    setBookings(books);
    setCancellingBooking(null);
  };

  const filteredBookings = filterStatus === 'All'
    ? bookings
    : bookings.filter(b => b.status === filterStatus);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Confirmed':
        return 'bg-green-500/10 text-green-400 border border-green-500/20';
      case 'Pending':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'Completed':
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
      case 'Cancelled':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default:
        return 'bg-slate-900/50 text-slate-400';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className={`text-3xl font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Booking History
          </h2>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
            Track active appointments and view transaction statements.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl border bg-slate-950/20 border-white/5">
          {['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                filterStatus === status
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10'
                  : darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Booking List */}
      <div className="space-y-4">
        {filteredBookings.map((b) => (
          <div
            key={b.id}
            className={`p-6 rounded-3xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-6 ${
              darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            {/* Left */}
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border border-blue-500/20 bg-slate-800 flex-shrink-0">
                <img src={cleanImageUrl(b.providerPhoto)} alt={b.providerName} className="w-full h-full object-cover" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full ${getStatusStyle(b.status)}`}>
                    {b.status}
                  </span>
                  {(b.bookingId || b.id) && (
                    <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                      {(b.bookingId || b.id).startsWith('#') ? (b.bookingId || b.id) : `#${b.bookingId || b.id}`}
                    </span>
                  )}
                </div>
                <h4 className={`font-bold text-base leading-snug mt-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>{b.service}</h4>
                <p className="text-xs text-slate-500 font-semibold">{b.providerName} • {b.category}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-blue-500" /> {formatDateDDMMYYYY(b.date) || b.date}
                  </span>
                  <span className="flex items-center gap-1 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-blue-500" /> {b.time}
                  </span>
                  <span className="flex items-center gap-1 font-semibold truncate max-w-xs">
                    <MapPin className="w-3.5 h-3.5 text-blue-500" /> {(b.location || b.address || '').split(',')[0]}
                  </span>
                </div>
              </div>
            </div>

            {/* Right */}
            <div className="flex md:flex-col items-end justify-between w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-slate-800">
              <div className="text-left md:text-right space-y-1">
                <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Total Charge</span>
                <span className="text-2xl font-black text-blue-500">₹{(b.amount || b.price || b.total || 0).toLocaleString('en-IN')}</span>
              </div>
              
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setViewInvoice(b)}
                  className={`p-2.5 rounded-xl border flex items-center justify-center text-xs font-bold transition-all ${
                    darkMode ? 'bg-slate-950 border-white/5 text-slate-300 hover:text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-900'
                  }`}
                  title="View Receipt Summary"
                >
                  <FileText className="w-4 h-4 mr-1.5" /> Details
                </button>

                {(b.status === 'Confirmed' || b.status === 'Pending') && (
                  <button
                    onClick={() => setCancellingBooking(b)}
                    className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors"
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredBookings.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-slate-500 font-medium">No bookings found for the selected status.</p>
          </div>
        )}
      </div>

      {/* CANCEL BOOKING DIALOG */}
      <AnimatePresence>
        {cancellingBooking && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-sm rounded-[32px] border p-6 space-y-6 ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className={`font-extrabold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>Cancel Booking?</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Are you sure you want to cancel your appointment for **{cancellingBooking.service}** with **{cancellingBooking.providerName}**? Refund takes 3-5 business days.
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setCancellingBooking(null)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider border ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  No, Keep
                </button>
                <button
                  onClick={handleCancelBooking}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-red-500/20"
                >
                  Yes, Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BILLING / INVOICE MODAL */}
      <AnimatePresence>
        {viewInvoice && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`w-full max-w-md rounded-[32px] border p-6 space-y-6 ${
                darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex justify-between items-start">
                <h3 className={`font-extrabold text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>Booking Invoice</h3>
                <button
                  onClick={() => setViewInvoice(null)}
                  className="p-1.5 rounded-full bg-slate-950/60 text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <hr className={darkMode ? 'border-slate-800' : 'border-slate-100'} />

              {/* invoice breakdown */}
              <div className="space-y-4 text-xs font-semibold">
                {(viewInvoice.bookingId || viewInvoice.id) && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Booking ID</span>
                    <span className="font-mono font-bold text-blue-500">
                      {(viewInvoice.bookingId || viewInvoice.id).startsWith('#') ? (viewInvoice.bookingId || viewInvoice.id) : `#${viewInvoice.bookingId || viewInvoice.id}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Service</span>
                  <span className={darkMode ? 'text-white' : 'text-slate-900'}>{viewInvoice.service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Provider</span>
                  <span className={darkMode ? 'text-white' : 'text-slate-900'}>{viewInvoice.providerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Service Address</span>
                  <span className={`text-right max-w-[200px] truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {viewInvoice.customerAddress || viewInvoice.address || viewInvoice.location || 'Address not provided'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date & Time</span>
                  <span className={darkMode ? 'text-white' : 'text-slate-900'}>{formatDateDDMMYYYY(viewInvoice.date) || viewInvoice.date} at {viewInvoice.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] ${getStatusStyle(viewInvoice.status)}`}>{viewInvoice.status}</span>
                </div>

                <hr className={darkMode ? 'border-slate-800' : 'border-slate-100'} />

                <div className="flex justify-between">
                  <span className="text-slate-500">Service Rate</span>
                  <span className={darkMode ? 'text-white' : 'text-slate-900'}>₹{viewInvoice.amount || viewInvoice.price || viewInvoice.total}</span>
                </div>

                <hr className={darkMode ? 'border-slate-800' : 'border-slate-100'} />

                <div className="flex justify-between font-black text-blue-500 text-sm">
                  <span>Grand Total Paid</span>
                  <span>₹{viewInvoice.amount || viewInvoice.price || viewInvoice.total}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setViewInvoice(null)}
                  className="w-full px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 text-center"
                >
                  Dismiss Receipt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default CustomerHistory;
