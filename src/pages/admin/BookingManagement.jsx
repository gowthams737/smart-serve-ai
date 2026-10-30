import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, CalendarCheck, Edit3, X, Eye } from 'lucide-react';
import { AdminService } from '../../services/adminService';
import { formatDateDDMMYYYY } from '../../utils/dateFormat';

const BookingManagement = () => {
  const [bookings, setBookings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Selected booking for editing status
  const [editingBooking, setEditingBooking] = useState(null);
  const [statusValue, setStatusValue] = useState('');

  const loadBookings = async () => {
    const list = await AdminService.getBookings();
    setBookings(list);
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleStatusUpdate = async (e) => {
    e.preventDefault();
    if (!editingBooking) return;
    await AdminService.updateBookingStatus(editingBooking.id, statusValue);
    setEditingBooking(null);
    loadBookings();
  };

  const handleEditClick = (bk) => {
    setEditingBooking(bk);
    setStatusValue(bk.status);
  };

  const filteredBookings = bookings.filter(b => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      b.customerName.toLowerCase().includes(query) ||
      b.providerName.toLowerCase().includes(query) ||
      b.serviceName.toLowerCase().includes(query) ||
      b.id.toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'All' || b.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Booking Management</h1>
        <p className="text-sm text-slate-400 mt-1">Audit all platform schedules, assignation amounts, and order statuses.</p>
      </div>

      {/* Filters and search */}
      <div className="p-5 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search bookings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>

        {/* Filter */}
        <div className="flex items-center gap-1.5 bg-slate-950/40 border border-white/10 px-3 py-1.5 rounded-2xl w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent border-none text-slate-300 text-xs focus:outline-none cursor-pointer w-full"
          >
            <option value="All">All Booking Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Booking List */}
      <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-white/5 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <th className="pb-3">Booking ID</th>
              <th className="pb-3">Customer Details</th>
              <th className="pb-3">Provider Details</th>
              <th className="pb-3">Service & Date</th>
              <th className="pb-3">Amount</th>
              <th className="pb-3">Status</th>
              <th className="pb-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs text-slate-300">
            {filteredBookings.map(b => (
              <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-4 font-mono text-[10px] font-bold text-blue-400">
                  {(b.bookingId || b.id || '').startsWith('#') ? (b.bookingId || b.id).toUpperCase() : `#${(b.bookingId || b.id).toUpperCase()}`}
                </td>
                <td className="py-4">
                  <p className="font-bold text-white">{b.customerName}</p>
                  <p className="text-[10px] text-slate-500">{b.customerPhone}</p>
                </td>
                <td className="py-4">
                  <p className="font-bold text-white">{b.providerName}</p>
                  <p className="text-[10px] text-slate-500">{b.providerPhone}</p>
                </td>
                <td className="py-4">
                  <p className="font-semibold text-white">{b.serviceName}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{formatDateDDMMYYYY(b.date) || b.date} • {b.time}</p>
                </td>
                <td className="py-4 font-black text-white">₹{b.amount.toLocaleString('en-IN')}</td>
                <td className="py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    b.status === 'Completed'
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : b.status === 'Active'
                      ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : b.status === 'Pending'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {b.status}
                  </span>
                </td>
                <td className="py-4 text-right">
                  <button
                    onClick={() => handleEditClick(b)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/5 text-blue-400 hover:text-white transition-all"
                    title="Update Status"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {filteredBookings.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center py-8 text-xs text-slate-500">
                  No bookings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Status Modal */}
      <AnimatePresence>
        {editingBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-sm p-6 relative"
            >
              <button
                onClick={() => setEditingBooking(null)}
                className="absolute right-4 top-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="font-extrabold text-white text-base mb-2">Update Booking Status</h3>
              <p className="text-[10px] text-slate-500 mb-4 uppercase tracking-wider font-bold">Booking #{editingBooking.id.toUpperCase()}</p>

              <form onSubmit={handleStatusUpdate} className="space-y-4">
                <div className="p-3 bg-slate-950/20 rounded-xl border border-white/5 text-xs text-slate-400 space-y-1">
                  <p><span className="font-bold text-white">Customer:</span> {editingBooking.customerName}</p>
                  <p><span className="font-bold text-white">Provider:</span> {editingBooking.providerName}</p>
                  <p><span className="font-bold text-white">Service:</span> {editingBooking.serviceName}</p>
                  <p><span className="font-bold text-white">Price:</span> ₹{editingBooking.amount}</p>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Status</label>
                  <select
                    value={statusValue}
                    onChange={(e) => setStatusValue(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500/50 cursor-pointer"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingBooking(null)}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
                  >
                    Save Status
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BookingManagement;
