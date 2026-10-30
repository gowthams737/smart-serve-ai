import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, Plus, Trash2, Edit2, X, Info } from 'lucide-react';
import { AdminService } from '../../services/adminService';

const ServiceManagement = () => {
  const [services, setServices] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  
  // Forms
  const [addForm, setAddForm] = useState({ name: '', startingPrice: '', duration: 'Per Visit', description: '', status: 'Active' });
  const [editForm, setEditForm] = useState({ name: '', startingPrice: '', duration: 'Per Visit', description: '', status: 'Active' });

  const loadServices = async () => {
    const list = await AdminService.getServices();
    setServices(list);
  };

  useEffect(() => {
    loadServices();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.startingPrice) return;
    await AdminService.addService({
      name: addForm.name,
      startingPrice: Number(addForm.startingPrice),
      duration: addForm.duration,
      description: addForm.description,
      status: addForm.status
    });
    setAddForm({ name: '', startingPrice: '', duration: 'Per Visit', description: '', status: 'Active' });
    setShowAddModal(false);
    loadServices();
  };

  const handleEditClick = (srv) => {
    setEditingService(srv);
    setEditForm({
      name: srv.name,
      startingPrice: srv.startingPrice,
      duration: srv.duration,
      description: srv.description || '',
      status: srv.status
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.startingPrice) return;
    await AdminService.updateService(editingService.id, {
      name: editForm.name,
      startingPrice: Number(editForm.startingPrice),
      duration: editForm.duration,
      description: editForm.description,
      status: editForm.status
    });
    setEditingService(null);
    loadServices();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this service category?')) {
      await AdminService.deleteService(id);
      loadServices();
    }
  };

  const filteredServices = services.filter(srv => {
    const matchesSearch = srv.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || srv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Service Management</h1>
          <p className="text-sm text-slate-400 mt-1">Configure service categories, durations, and platform-wide baseline pricing.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-blue-500/10 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Service Category
        </button>
      </div>

      {/* Filters */}
      <div className="p-5 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search service categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950/50 border border-white/10 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950/40 border border-white/10 px-3 py-1.5 rounded-2xl w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent border-none text-slate-300 text-xs focus:outline-none cursor-pointer w-full"
          >
            <option value="All">All Category Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map(srv => (
          <div key={srv.id} className="p-5 rounded-3xl bg-slate-900/50 border border-white/10 flex flex-col justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                  srv.status === 'Active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}>
                  {srv.status}
                </span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">₹{srv.startingPrice} {srv.duration}</span>
              </div>
              <h4 className="font-extrabold text-white text-base">{srv.name}</h4>
              <p className="text-xs text-slate-400 leading-normal line-clamp-2 font-medium">
                {srv.description || 'No description provided.'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-white/5 text-[11px] text-slate-500">
              <span className="font-semibold">{srv.bookingsCount || 0} Bookings</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEditClick(srv)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(srv.id)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md p-6 relative"
            >
              <button
                onClick={() => setShowAddModal(false)}
                className="absolute right-4 top-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="font-extrabold text-white text-lg mb-4">Add Service Category</h3>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Category Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Category name"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Starting Price (₹)</label>
                    <input
                      type="number"
                      required
                      placeholder="Starting price"
                      value={addForm.startingPrice}
                      onChange={(e) => setAddForm({ ...addForm, startingPrice: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Charge Unit</label>
                    <select
                      value={addForm.duration}
                      onChange={(e) => setAddForm({ ...addForm, duration: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500/50 cursor-pointer"
                    >
                      <option value="Per Hour">Per Hour</option>
                      <option value="Per Visit">Per Visit</option>
                      <option value="Per Sq.Ft">Per Sq.Ft</option>
                      <option value="Per BHK">Per BHK</option>
                      <option value="Per Session">Per Session</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Description</label>
                  <textarea
                    rows="3"
                    value={addForm.description}
                    onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 resize-none"
                  ></textarea>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
                  >
                    Create Category
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingService && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-md p-6 relative"
            >
              <button
                onClick={() => setEditingService(null)}
                className="absolute right-4 top-4 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="font-extrabold text-white text-lg mb-4">Edit Service Category</h3>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Category Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Starting Price (₹)</label>
                    <input
                      type="number"
                      required
                      value={editForm.startingPrice}
                      onChange={(e) => setEditForm({ ...editForm, startingPrice: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Charge Unit</label>
                    <select
                      value={editForm.duration}
                      onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500/50 cursor-pointer"
                    >
                      <option value="Per Hour">Per Hour</option>
                      <option value="Per Visit">Per Visit</option>
                      <option value="Per Sq.Ft">Per Sq.Ft</option>
                      <option value="Per BHK">Per BHK</option>
                      <option value="Per Session">Per Session</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Description</label>
                  <textarea
                    rows="3"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500/50 resize-none"
                  ></textarea>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Category Status</label>
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
                    onClick={() => setEditingService(null)}
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

export default ServiceManagement;
