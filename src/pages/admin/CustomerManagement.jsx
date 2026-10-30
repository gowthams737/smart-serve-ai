import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Trash2, Eye, Edit2, X, PlusCircle, Check, Info } from 'lucide-react';
import { AdminService } from '../../services/adminService';
import { formatDateDDMMYYYY } from '../../utils/dateFormat';

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [cityFilter, setCityFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  
  // Selected customer for preview/modal
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  
  // Edit customer state
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editForm, setEditForm] = useState({ fullName: '', email: '', phone: '', city: '', status: '' });

  // Load customers
  const loadCustomers = async () => {
    const list = await AdminService.getCustomers();
    setCustomers(list);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Filter & Sort
  const filteredCustomers = customers
    .filter(cust => {
      const matchesSearch = 
        cust.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cust.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cust.phone.includes(searchQuery);
      
      const matchesStatus = statusFilter === 'All' || cust.status === statusFilter;
      const matchesCity = cityFilter === 'All' || cust.city === cityFilter;

      return matchesSearch && matchesStatus && matchesCity;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.fullName.localeCompare(b.fullName);
      if (sortBy === 'spend') return b.totalSpent - a.totalSpent;
      if (sortBy === 'bookings') return b.bookingsCount - a.bookingsCount;
      return 0;
    });

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      await AdminService.deleteCustomer(id);
      loadCustomers();
      if (selectedCustomer?.id === id) setSelectedCustomer(null);
    }
  };

  const handleEditClick = (cust) => {
    setEditingCustomer(cust);
    setEditForm({
      fullName: cust.fullName,
      email: cust.email,
      phone: cust.phone,
      city: cust.city,
      status: cust.status
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.fullName.trim() || !editForm.email.trim()) return;

    await AdminService.updateCustomer(editingCustomer.id, editForm);
    setEditingCustomer(null);
    loadCustomers();
  };

  const uniqueCities = [...new Set(customers.map(c => c.city))];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Customer Management</h1>
          <p className="text-sm text-slate-400 mt-1">Manage platform users, view history, and edit credentials.</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="p-5 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status filter */}
          <div className="flex items-center gap-1.5 bg-slate-950/40 border border-white/10 px-3 py-1.5 rounded-2xl">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-slate-300 text-xs focus:outline-none cursor-pointer"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* City filter */}
          <div className="flex items-center gap-1.5 bg-slate-950/40 border border-white/10 px-3 py-1.5 rounded-2xl">
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="bg-transparent border-none text-slate-300 text-xs focus:outline-none cursor-pointer"
            >
              <option value="All">All Locations (Coimbatore)</option>
              {uniqueCities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1.5 bg-slate-950/40 border border-white/10 px-3 py-1.5 rounded-2xl">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-none text-slate-300 text-xs focus:outline-none cursor-pointer"
            >
              <option value="name">Sort by Name</option>
              <option value="bookings">Sort by Bookings</option>
              <option value="spend">Sort by Spent (₹)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer List */}
      <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-white/5 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <th className="pb-3">Customer</th>
              <th className="pb-3">Location</th>
              <th className="pb-3">Contact</th>
              <th className="pb-3">Bookings</th>
              <th className="pb-3">Spent</th>
              <th className="pb-3">Status</th>
              <th className="pb-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredCustomers.map(cust => (
              <tr key={cust.id} className="text-slate-300 hover:bg-white/[0.02] transition-colors">
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-blue-400">
                      {cust.fullName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-xs">{cust.fullName}</h4>
                      <span className="text-[10px] text-slate-500">Joined {formatDateDDMMYYYY(cust.joinedDate) || cust.joinedDate}</span>
                    </div>
                  </div>
                </td>
                <td className="py-4 text-xs font-medium">{cust.city}</td>
                <td className="py-4">
                  <div className="text-xs font-medium">{cust.email}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{cust.phone}</div>
                </td>
                <td className="py-4 text-xs font-bold text-white">{cust.bookingsCount}</td>
                <td className="py-4 text-xs font-black text-white">₹{cust.totalSpent.toLocaleString('en-IN')}</td>
                <td className="py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    cust.status === 'Active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {cust.status}
                  </span>
                </td>
                <td className="py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedCustomer(cust)}
                      className="p-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/15 text-blue-400 transition-colors"
                      title="View Profile"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleEditClick(cust)}
                      className="p-2 rounded-xl bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/15 text-amber-400 transition-colors"
                      title="Edit Customer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cust.id)}
                      className="p-2 rounded-xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/15 text-red-400 transition-colors"
                      title="Delete Customer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredCustomers.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center py-8 text-xs text-slate-500">
                  No customers found matching search filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Customer Detail Modal */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-xl p-6 relative overflow-hidden"
            >
              <button
                onClick={() => setSelectedCustomer(null)}
                className="absolute right-4 top-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="font-extrabold text-white text-lg mb-4">Customer Detail Profile</h3>

              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-slate-950/30 p-4 rounded-2xl border border-white/5">
                  <div className="w-14 h-14 rounded-full bg-slate-800 border border-blue-500/30 flex items-center justify-center font-black text-xl text-blue-400">
                    {selectedCustomer.fullName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base">{selectedCustomer.fullName}</h4>
                    <p className="text-xs text-slate-500">Joined {formatDateDDMMYYYY(selectedCustomer.joinedDate) || selectedCustomer.joinedDate}</p>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      selectedCustomer.status === 'Active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {selectedCustomer.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-950/20 rounded-xl border border-white/5">
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Contact Phone</span>
                    <p className="text-xs text-slate-300 font-semibold mt-1">{selectedCustomer.phone}</p>
                  </div>
                  <div className="p-3 bg-slate-950/20 rounded-xl border border-white/5">
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Email Address</span>
                    <p className="text-xs text-slate-300 font-semibold mt-1 overflow-x-auto">{selectedCustomer.email}</p>
                  </div>
                  <div className="p-3 bg-slate-950/20 rounded-xl border border-white/5 col-span-2">
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Registered Address</span>
                    <p className="text-xs text-slate-300 font-semibold mt-1">{selectedCustomer.address}</p>
                  </div>
                </div>

                {/* Booking History */}
                <div>
                  <h5 className="font-bold text-white text-xs mb-2">Booking History Preview</h5>
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                    {selectedCustomer.bookingHistory && selectedCustomer.bookingHistory.map(b => (
                      <div key={b.id} className="p-3 bg-slate-950/30 rounded-xl border border-white/5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-white">{b.service}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{formatDateDDMMYYYY(b.date) || b.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-white">₹{b.amount}</p>
                          <span className={`inline-block text-[9px] font-bold ${
                            b.status === 'Completed' ? 'text-green-400' : 'text-amber-400'
                          }`}>{b.status}</span>
                        </div>
                      </div>
                    ))}
                    {(!selectedCustomer.bookingHistory || selectedCustomer.bookingHistory.length === 0) && (
                      <p className="text-[11px] text-slate-500 text-center py-4">No recent bookings recorded.</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Customer Edit Modal */}
      <AnimatePresence>
        {editingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md p-6 relative"
            >
              <button
                onClick={() => setEditingCustomer(null)}
                className="absolute right-4 top-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="font-extrabold text-white text-lg mb-4">Edit Customer Profile</h3>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Phone Number</label>
                  <input
                    type="text"
                    required
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Service City</label>
                  <input
                    type="text"
                    disabled
                    value="Coimbatore"
                    className="w-full px-4 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-400 cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Platform service location is fixed to Coimbatore, Tamil Nadu.</p>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Account Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500/50 cursor-pointer"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingCustomer(null)}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
                  >
                    Save Changes
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

export default CustomerManagement;
