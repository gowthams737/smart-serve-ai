import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarCheck, Search, Filter, AlertCircle, Phone, HelpCircle, X } from 'lucide-react';
import BookingCard from '../../components/provider/BookingCard';
import FilterComponent from '../../components/provider/FilterComponent';
import SearchBar from '../../components/provider/SearchBar';
import EmptyState from '../../components/provider/EmptyState';
import ConfirmationModal from '../../components/provider/ConfirmationModal';
import { ProviderService } from '../../services/providerService';
import { formatDateDDMMYYYY } from '../../utils/dateFormat';

const ProviderBookings = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookings, setBookings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const parseFilterFromQuery = useCallback((params) => {
    const raw = params.get('status') || params.get('filter');
    if (!raw) return 'All';
    const lower = raw.trim().toLowerCase();
    if (lower === 'active' || lower === 'ongoing') return 'Active';
    if (lower === 'completed') return 'Completed';
    if (lower === 'pending') return 'Pending';
    return 'All';
  }, []);

  const [activeFilter, setActiveFilter] = useState(() => parseFilterFromQuery(searchParams));

  // Sync activeFilter when searchParams change (e.g. back/forward navigation or link click)
  useEffect(() => {
    const filterFromUrl = parseFilterFromQuery(searchParams);
    setActiveFilter((prev) => (prev !== filterFromUrl ? filterFromUrl : prev));
  }, [searchParams, parseFilterFromQuery]);

  const handleFilterChange = (newFilter) => {
    setActiveFilter(newFilter);
    const newParams = new URLSearchParams(searchParams);
    if (newFilter === 'All') {
      newParams.delete('status');
      newParams.delete('filter');
    } else {
      newParams.set('status', newFilter);
      newParams.delete('filter');
    }
    setSearchParams(newParams, { replace: true });
  };
  
  // Modals
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [targetAction, setTargetAction] = useState({ id: null, type: '' });
  const [bookingNotice, setBookingNotice] = useState(null);

  const targetBookingId = searchParams.get('id');

  const filterOptions = [
    { label: 'All Bookings', value: 'All' },
    { label: 'Pending Request', value: 'Pending' },
    { label: 'Ongoing', value: 'Active' },
    { label: 'Completed', value: 'Completed' }
  ];

  useEffect(() => {
    const fetchBooks = async () => {
      const books = await ProviderService.getBookings();
      setBookings(books);
    };
    fetchBooks();
  }, []);

  // Handle direct navigation to a specific booking from a notification or link
  useEffect(() => {
    if (!targetBookingId || bookings.length === 0) return;
    const found = bookings.find(
      (b) => String(b._id || b.id) === targetBookingId || String(b.bookingId) === targetBookingId
    );
    if (found) {
      setSelectedBooking(found);
      setShowDetailsModal(true);
      if (found.status && activeFilter !== 'All' && activeFilter !== found.status) {
        setActiveFilter('All');
      }
    } else {
      setBookingNotice(`Booking #${targetBookingId} was not found or is no longer accessible.`);
    }
  }, [targetBookingId, bookings, activeFilter]);

  const handleOpenConfirm = (id, type) => {
    setTargetAction({ id, type });
    setShowConfirmModal(true);
  };

  const handleActionConfirm = async () => {
    const { id, type } = targetAction;
    if (type === 'Accept') {
      await ProviderService.updateBookingStatus(id, 'Active');
    } else if (type === 'Reject') {
      await ProviderService.updateBookingStatus(id, 'Rejected');
    } else if (type === 'Complete') {
      await ProviderService.updateBookingStatus(id, 'Completed');
    }
    const books = await ProviderService.getBookings();
    setBookings(books);
    setShowConfirmModal(false);
    setTargetAction({ id: null, type: '' });
  };

  const handleContactCustomer = (booking) => {
    const customer = typeof booking === 'object' ? booking.customerName : booking;
    const phone = typeof booking === 'object' && booking.customerPhone && booking.customerPhone !== 'Phone number not provided'
      ? booking.customerPhone
      : 'Phone number not provided';
    alert(`Customer Contact Details:\nName: ${customer}\nPhone: ${phone}`);
  };

  const handleViewDetails = (booking) => {
    setSelectedBooking(booking);
    setShowDetailsModal(true);
  };

  // Filters & Searches
  const filteredBookings = bookings.filter((b) => {
    const matchesFilter = activeFilter === 'All' || b.status === activeFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      (b.customerName || '').toLowerCase().includes(q) ||
      (b.serviceName || '').toLowerCase().includes(q) ||
      (b.bookingId || b.id || '').toLowerCase().includes(q) ||
      (b.customerPhone || '').toLowerCase().includes(q) ||
      (b.customerAddress || b.address || b.location || '').toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-extrabold text-white">Booking Requests</h2>
        <p className="text-slate-400 text-sm mt-1">Accept ongoing customer requests or view historical job bookings details.</p>
      </div>

      {/* Target Booking Notice Banner */}
      {bookingNotice && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-amber-300 text-xs font-semibold shadow-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{bookingNotice}</span>
          </div>
          <button
            onClick={() => setBookingNotice(null)}
            className="p-1 text-amber-400 hover:text-white rounded-lg transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Control panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/40 border border-white/5 backdrop-blur-xl">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search bookings..."
        />
        <FilterComponent
          options={filterOptions}
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
        />
      </div>

      {/* Bookings listing */}
      {filteredBookings.length === 0 ? (
        <EmptyState
          title="No bookings found"
          message="No matching records exist for your filter selection or query."
          icon={CalendarCheck}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onAccept={(id) => handleOpenConfirm(id, booking.status === 'Active' ? 'Complete' : 'Accept')}
                onReject={(id) => handleOpenConfirm(id, 'Reject')}
                onContact={handleContactCustomer}
                onViewDetails={handleViewDetails}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Booking Details Modal */}
      <AnimatePresence>
        {showDetailsModal && selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetailsModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl z-10 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xl font-bold text-white">Booking Details</h4>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <hr className="border-slate-800" />
              
              <div className="space-y-4 text-sm text-slate-300">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Booking ID:</span>
                  <span className="text-blue-400 font-mono font-bold px-2.5 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    {(selectedBooking.bookingId || selectedBooking.id || '').startsWith('#') ? (selectedBooking.bookingId || selectedBooking.id) : `#${selectedBooking.bookingId || selectedBooking.id}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer Name:</span>
                  <span className="text-white font-semibold">{selectedBooking.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Phone Number:</span>
                  <span className="text-white font-semibold">{selectedBooking.customerPhone || 'Phone number not provided'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Requested Service:</span>
                  <span className="text-white font-semibold">{selectedBooking.serviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Scheduled Date:</span>
                  <span className="text-white font-semibold">{formatDateDDMMYYYY(selectedBooking.date) || selectedBooking.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Time:</span>
                  <span className="text-white font-semibold">{selectedBooking.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Est. Payout:</span>
                  <span className="text-blue-400 font-bold">₹{(selectedBooking.price || selectedBooking.amount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-slate-500">Customer Address:</span>
                  <span className="text-white bg-slate-950 p-3 rounded-xl border border-white/5 leading-relaxed">
                    {selectedBooking.customerAddress || selectedBooking.address || selectedBooking.location || 'Address not provided'}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Actions Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        title={`${targetAction.type} Booking Request?`}
        message={`Are you sure you want to ${targetAction.type.toLowerCase()} this booking slot?`}
        confirmText={targetAction.type}
        onConfirm={handleActionConfirm}
        onCancel={() => setShowConfirmModal(false)}
        isDangerous={targetAction.type === 'Reject'}
      />
    </div>
  );
};

export default ProviderBookings;
