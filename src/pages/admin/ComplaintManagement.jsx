import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, AlertTriangle, CheckCircle, ShieldAlert, X, Eye } from 'lucide-react';
import { AdminService } from '../../services/adminService';
import { formatDateDDMMYYYY } from '../../utils/dateFormat';

const ComplaintManagement = () => {
  const [complaints, setComplaints] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  
  // Status update
  const [editingComplaint, setEditingComplaint] = useState(null);
  const [statusValue, setStatusValue] = useState('');

  const loadComplaints = async () => {
    const list = await AdminService.getComplaints();
    setComplaints(list);
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  const handleStatusUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!editingComplaint) return;
    await AdminService.updateComplaintStatus(editingComplaint.id, statusValue);
    setEditingComplaint(null);
    loadComplaints();
    if (selectedComplaint?.id === editingComplaint.id) {
      setSelectedComplaint(prev => ({ ...prev, status: statusValue }));
    }
  };

  const filteredComplaints = complaints.filter(cmp => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      cmp.customerName.toLowerCase().includes(query) ||
      cmp.providerName.toLowerCase().includes(query) ||
      cmp.comment.toLowerCase().includes(query);

    const matchesStatus = statusFilter === 'All' || cmp.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || cmp.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const getPriorityStyle = (prio) => {
    switch (prio) {
      case 'High':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'Medium':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Complaint Management</h1>
        <p className="text-sm text-slate-400 mt-1">Review, investigate, and resolve grievances filed by customers against service providers.</p>
      </div>

      {/* Filters and search */}
      <div className="p-5 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search complaints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>

        {/* Filters */}
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
              <option value="Pending">Pending</option>
              <option value="Investigating">Investigating</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {/* Priority filter */}
          <div className="flex items-center gap-1.5 bg-slate-950/40 border border-white/10 px-3 py-1.5 rounded-2xl">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent border-none text-slate-300 text-xs focus:outline-none cursor-pointer"
            >
              <option value="All">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Complaints List */}
      <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-white/5 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <th className="pb-3">Complaint ID</th>
              <th className="pb-3">Customer Details</th>
              <th className="pb-3">Provider Details</th>
              <th className="pb-3">Filing Date</th>
              <th className="pb-3">Priority</th>
              <th className="pb-3">Status</th>
              <th className="pb-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-xs text-slate-300">
            {filteredComplaints.map(c => (
              <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-4 font-mono text-[10px] font-bold text-red-400">#{c.id.toUpperCase()}</td>
                <td className="py-4">
                  <p className="font-bold text-white">{c.customerName}</p>
                  <p className="text-[10px] text-slate-500">{c.customerEmail}</p>
                </td>
                <td className="py-4">
                  <p className="font-bold text-white">{c.providerName}</p>
                  <p className="text-[10px] text-slate-500">{c.providerEmail}</p>
                </td>
                <td className="py-4 font-medium text-slate-400">{formatDateDDMMYYYY(c.date) || c.date}</td>
                <td className="py-4">
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${getPriorityStyle(c.priority)}`}>
                    {c.priority}
                  </span>
                </td>
                <td className="py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    c.status === 'Resolved'
                      ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                      : c.status === 'Investigating'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      : 'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {c.status}
                  </span>
                </td>
                <td className="py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setSelectedComplaint(c)}
                      className="p-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/15 text-blue-400 transition-all animate-none"
                      title="Preview Case"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingComplaint(c);
                        setStatusValue(c.status);
                      }}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/5 text-slate-300 hover:text-white transition-all"
                      title="Update status"
                    >
                      <Filter className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredComplaints.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center py-8 text-xs text-slate-500">
                  No complaints found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Case Preview Modal */}
      <AnimatePresence>
        {selectedComplaint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg p-6 relative overflow-hidden"
            >
              <button
                onClick={() => setSelectedComplaint(null)}
                className="absolute right-4 top-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-4 text-red-500">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-extrabold text-white text-lg">Grievance Investigation File</h3>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-950/20 rounded-2xl border border-white/5 text-xs text-slate-300 space-y-1.5">
                  <p><span className="font-bold text-slate-500">Complaint ID:</span> <span className="font-mono text-red-400 font-bold">#{selectedComplaint.id.toUpperCase()}</span></p>
                  <p><span className="font-bold text-slate-500">Filing Date:</span> {formatDateDDMMYYYY(selectedComplaint.date) || selectedComplaint.date}</p>
                  <p><span className="font-bold text-slate-500">Priority Level:</span> <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${getPriorityStyle(selectedComplaint.priority)}`}>{selectedComplaint.priority}</span></p>
                  <p><span className="font-bold text-slate-500">Current Status:</span> <span className="font-bold text-white">{selectedComplaint.status}</span></p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-950/20 rounded-xl border border-white/5">
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Customer Details</span>
                    <p className="text-xs text-white font-bold mt-1">{selectedComplaint.customerName}</p>
                    <p className="text-[10px] text-slate-500">{selectedComplaint.customerEmail}</p>
                  </div>
                  <div className="p-3 bg-slate-950/20 rounded-xl border border-white/5">
                    <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Provider Details</span>
                    <p className="text-xs text-white font-bold mt-1">{selectedComplaint.providerName}</p>
                    <p className="text-[10px] text-slate-500">{selectedComplaint.providerEmail}</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-950/20 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block">Grievance Comment</span>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">"{selectedComplaint.comment}"</p>
                </div>

                <div className="p-4 bg-slate-950/20 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[9px] text-slate-500 uppercase font-bold tracking-wider block">Resolution Timeline</span>
                  <p className="text-xs text-slate-400 font-semibold">{selectedComplaint.resolutionTimeline}</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setEditingComplaint(selectedComplaint);
                      setStatusValue(selectedComplaint.status);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all"
                  >
                    Modify Case Status
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Status Modal */}
      <AnimatePresence>
        {editingComplaint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-sm p-6 relative"
            >
              <button
                onClick={() => setEditingComplaint(null)}
                className="absolute right-4 top-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="font-extrabold text-white text-base mb-4">Update Case Status</h3>

              <form onSubmit={handleStatusUpdateSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Status</label>
                  <select
                    value={statusValue}
                    onChange={(e) => setStatusValue(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500/50 cursor-pointer"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Investigating">Investigating</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingComplaint(null)}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
                  >
                    Update Case
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

export default ComplaintManagement;
