import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, CheckCircle2, XCircle, Eye, Trash2, X, Star, Shield, ShieldCheck } from 'lucide-react';
import { AdminService } from '../../services/adminService';
import RatingStars from '../../components/provider/RatingStars';

const ProviderManagement = () => {
  const [providers, setProviders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedProvider, setSelectedProvider] = useState(null);

  const loadProviders = async () => {
    const list = await AdminService.getProviders();
    setProviders(list);
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const handleApprove = async (id) => {
    const updated = await AdminService.approveProvider(id);
    loadProviders();
    if (selectedProvider?.id === id) {
      setSelectedProvider(updated);
    }
  };

  const handleReject = async (id) => {
    const updated = await AdminService.rejectProvider(id);
    loadProviders();
    if (selectedProvider?.id === id) {
      setSelectedProvider(updated);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this provider profile?')) {
      await AdminService.deleteProvider(id);
      loadProviders();
      if (selectedProvider?.id === id) setSelectedProvider(null);
    }
  };

  // Filter lists
  const filteredProviders = providers.filter(prov => {
    const matchesSearch = 
      prov.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prov.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prov.phone.includes(searchQuery);

    const matchesCategory = categoryFilter === 'All' || prov.category === categoryFilter;
    const matchesStatus = statusFilter === 'All' || prov.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const uniqueCategories = [...new Set(providers.map(p => p.category))];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Provider Management</h1>
        <p className="text-sm text-slate-400 mt-1">Review onboarding applications, verify credentials, and approve or reject partners.</p>
      </div>

      {/* Filters and search */}
      <div className="p-5 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search providers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Category filter */}
          <div className="flex items-center gap-1.5 bg-slate-950/40 border border-white/10 px-3 py-1.5 rounded-2xl">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent border-none text-slate-300 text-xs focus:outline-none cursor-pointer"
            >
              <option value="All">All Categories</option>
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 bg-slate-950/40 border border-white/10 px-3 py-1.5 rounded-2xl">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none text-slate-300 text-xs focus:outline-none cursor-pointer"
            >
              <option value="All">All Verification Status</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending Review</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Provider List */}
      <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-white/5 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <th className="pb-3">Provider</th>
              <th className="pb-3">Category</th>
              <th className="pb-3">Experience</th>
              <th className="pb-3">Rating</th>
              <th className="pb-3">Verification</th>
              <th className="pb-3">Availability</th>
              <th className="pb-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredProviders.map(p => (
              <tr key={p.id} className="text-slate-300 hover:bg-white/[0.02] transition-colors">
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-green-400">
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-xs">{p.name}</h4>
                      <span className="text-[10px] text-slate-500">{p.email}</span>
                    </div>
                  </div>
                </td>
                <td className="py-4 text-xs font-semibold text-white">{p.category}</td>
                <td className="py-4 text-xs font-medium">{p.experience} Years</td>
                <td className="py-4">
                  <div className="flex items-center gap-2">
                    <RatingStars rating={p.rating} size={13} />
                    <span className="text-[10px] text-slate-500 font-bold">({p.reviewsCount})</span>
                  </div>
                </td>
                <td className="py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    p.status === 'Approved' 
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                      : p.status === 'Pending' 
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {p.status}
                  </span>
                </td>
                <td className="py-4 text-xs font-medium text-slate-400">{p.availability}</td>
                <td className="py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedProvider(p)}
                      className="p-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/15 text-blue-400 transition-colors"
                      title="Preview Profile"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {p.status === 'Pending' && (
                      <>
                        <button
                          onClick={() => handleApprove(p.id)}
                          className="p-2 rounded-xl bg-green-600/10 hover:bg-green-600/20 border border-green-500/15 text-green-400 transition-colors"
                          title="Approve Provider"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleReject(p.id)}
                          className="p-2 rounded-xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/15 text-red-400 transition-colors"
                          title="Reject Provider"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-400 hover:text-red-400 transition-colors"
                      title="Delete Provider"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredProviders.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center py-8 text-xs text-slate-500">
                  No service providers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Provider Details Drawer / Modal */}
      <AnimatePresence>
        {selectedProvider && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-xl p-6 relative overflow-hidden"
            >
              <button
                onClick={() => setSelectedProvider(null)}
                className="absolute right-4 top-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-4 text-blue-500">
                <Shield className="w-5 h-5" />
                <h3 className="font-extrabold text-white text-lg">Partner Credentials Verification</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4 bg-slate-950/30 p-4 rounded-2xl border border-white/5">
                  <div className="w-14 h-14 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-xl text-green-400">
                    {selectedProvider.name.charAt(0)}
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-base flex items-center gap-1.5">
                      {selectedProvider.name}
                      {selectedProvider.status === 'Approved' && (
                        <ShieldCheck className="w-4 h-4 text-green-400" />
                      )}
                    </h4>
                    <p className="text-xs text-slate-500">{selectedProvider.category} • {selectedProvider.experience} Years Experience</p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      selectedProvider.status === 'Approved' ? 'bg-green-500/10 text-green-400' : selectedProvider.status === 'Pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      Verification: {selectedProvider.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-950/20 rounded-xl border border-white/5">
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Contact Email</span>
                    <p className="text-xs text-slate-300 font-semibold mt-1">{selectedProvider.email}</p>
                  </div>
                  <div className="p-3 bg-slate-950/20 rounded-xl border border-white/5">
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Contact Phone</span>
                    <p className="text-xs text-slate-300 font-semibold mt-1">{selectedProvider.phone}</p>
                  </div>
                  <div className="p-3 bg-slate-950/20 rounded-xl border border-white/5">
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Rating & Reviews</span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <RatingStars rating={selectedProvider.rating} size={14} />
                      <span className="text-xs text-white font-bold">{selectedProvider.rating}</span>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-950/20 rounded-xl border border-white/5">
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Completed Jobs</span>
                    <p className="text-xs text-slate-300 font-semibold mt-1">{selectedProvider.completedJobs || 142} Orders</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/20 rounded-2xl border border-white/5">
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block mb-1">About / Bio</span>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">{selectedProvider.about}</p>
                </div>

                {selectedProvider.status === 'Pending' && (
                  <div className="flex gap-3 pt-3">
                    <button
                      onClick={() => handleReject(selectedProvider.id)}
                      className="flex-1 py-2.5 rounded-xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 text-xs font-bold transition-all"
                    >
                      Reject Application
                    </button>
                    <button
                      onClick={() => handleApprove(selectedProvider.id)}
                      className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition-all"
                    >
                      Approve & Onboard
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProviderManagement;
