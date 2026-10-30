import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Search, Sparkles, CheckCircle, AlertCircle, Filter } from 'lucide-react';
import ServiceCard from '../../components/provider/ServiceCard';
import Button from '../../components/Button';
import Input from '../../components/Input';
import ConfirmationModal from '../../components/provider/ConfirmationModal';
import EmptyState from '../../components/provider/EmptyState';
import { ProviderService } from '../../services/providerService';

// ── Small inline toast ───────────────────────────────────────────
const Toast = ({ type, message, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: -16 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -16 }}
    className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl text-sm font-semibold max-w-sm
      ${type === 'success'
        ? 'bg-green-900/90 border-green-700 text-green-200'
        : 'bg-red-900/90 border-red-700 text-red-200'
      } backdrop-blur-xl`}
  >
    {type === 'success'
      ? <CheckCircle className="w-4 h-4 shrink-0 text-green-400" />
      : <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
    }
    <span>{message}</span>
    <button onClick={onClose} className="ml-auto pl-2 opacity-60 hover:opacity-100">
      <X className="w-3.5 h-3.5" />
    </button>
  </motion.div>
);

// ── Duration input: number + unit select ─────────────────────────
const DurationInput = ({ value, onChange, error }) => {
  // Parse stored string like "30 minutes" or "2 hours" into parts
  const parse = (str) => {
    if (!str) return { num: '', unit: 'hours' };
    const parts = str.trim().split(' ');
    const n = parts[0] || '';
    const u = (parts[1] || 'hours').toLowerCase().startsWith('min') ? 'minutes' : 'hours';
    return { num: n, unit: u };
  };

  const [num, setNum] = useState(() => parse(value).num);
  const [unit, setUnit] = useState(() => parse(value).unit);

  // Keep local state in sync if parent resets (edit open)
  useEffect(() => {
    const p = parse(value);
    setNum(p.num);
    setUnit(p.unit);
  }, [value]);

  const notify = (n, u) => {
    if (!n) { onChange(''); return; }
    onChange(`${n} ${u}`);
  };

  const handleNum = (e) => {
    const v = e.target.value;
    setNum(v);
    notify(v, unit);
  };

  const handleUnit = (e) => {
    const u = e.target.value;
    setUnit(u);
    notify(num, u);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-slate-400 block ml-1">Estimated Duration</label>
      <div className="flex gap-2">
        <input
          type="number"
          min="1"
          step="1"
          value={num}
          onChange={handleNum}
          placeholder="Minutes"
          className="flex-1 bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300"
        />
        <select
          value={unit}
          onChange={handleUnit}
          className="bg-slate-950 border border-slate-700/50 rounded-xl px-3 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300"
        >
          <option value="minutes">min</option>
          <option value="hours">hrs</option>
        </select>
      </div>
      {error && <p className="text-xs text-red-500 ml-1">{error}</p>}
    </div>
  );
};

// ── Main page component ──────────────────────────────────────────
const ProviderServices = () => {
  const [services, setServices] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [targetDeleteId, setTargetDeleteId] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  // ── Filters / search
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // ── Form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Home Cleaning');
  const [formDesc, setFormDesc] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formImage, setFormImage] = useState('');
  const [providerPhoto, setProviderPhoto] = useState('');
  const [errors, setErrors] = useState({});

  // ── Toast
  const [toast, setToast] = useState(null);
  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const categories = [
    'Home Cleaning',
    'Plumbing',
    'Electrical Work',
    'Appliance Repair',
    'Pest Control',
    'Painting',
    'Carpentry'
  ];

  const fetchServices = async () => {
    try {
      const list = await ProviderService.getServices();
      setServices(list);
    } catch (err) {
      console.error('fetchServices error:', err);
      showToast('error', 'Failed to load services. Check that the backend is running.');
    } finally {
      setPageLoading(false);
    }
  };

  const fetchProviderProfile = async () => {
    try {
      const info = await ProviderService.getProviderInfo();
      const photo = info?.profilePhoto || info?.photo || '';
      setProviderPhoto(photo);
    } catch (e) {
      console.error('fetchProviderProfile error:', e);
    }
  };

  useEffect(() => {
    fetchServices();
    fetchProviderProfile();
  }, []);

  // ── Filtered view
  const filtered = useMemo(() => {
    return services.filter(s => {
      const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.description || '').toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCategory === 'All' || s.category === filterCategory;
      const matchStatus = filterStatus === 'All' || (filterStatus === 'Available' ? s.isAvailable : !s.isAvailable);
      return matchSearch && matchCat && matchStatus;
    });
  }, [services, search, filterCategory, filterStatus]);

  const openAddModal = () => {
    setEditTarget(null);
    setFormName('');
    setFormCategory('Home Cleaning');
    setFormDesc('');
    setFormPrice('');
    setFormTime('');
    setFormImage(providerPhoto);
    setErrors({});
    setShowModal(true);
  };

  const openEditModal = (service) => {
    setEditTarget(service);
    setFormName(service.name);
    setFormCategory(service.category);
    setFormDesc(service.description);
    setFormPrice(service.price.toString());
    setFormTime(service.time || '');
    setFormImage(service.image || providerPhoto);
    setErrors({});
    setShowModal(true);
  };

  const handleDeletePrompt = (id) => {
    setTargetDeleteId(id);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!targetDeleteId) { setShowDeleteModal(false); return; }
    try {
      await ProviderService.deleteService(targetDeleteId);
      await fetchServices();
      showToast('success', 'Service deleted successfully.');
    } catch (err) {
      console.error('deleteService error:', err);
      showToast('error', err.message || 'Failed to delete service.');
    } finally {
      setShowDeleteModal(false);
      setTargetDeleteId(null);
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await ProviderService.duplicateService(id);
      await fetchServices();
      showToast('success', 'Service duplicated.');
    } catch (err) {
      showToast('error', err.message || 'Failed to duplicate service.');
    }
  };

  const handleToggleAvailability = async (id, isAvailable) => {
    try {
      await ProviderService.updateService(id, { isAvailable });
      await fetchServices();
    } catch (err) {
      showToast('error', err.message || 'Failed to update availability.');
    }
  };

  const validateForm = () => {
    const formErrors = {};
    if (!formName.trim()) formErrors.name = 'Service name is required';
    if (!formDesc.trim()) formErrors.desc = 'Description is required';
    const priceNum = parseFloat(formPrice);
    if (!formPrice.trim() || isNaN(priceNum) || priceNum <= 0) {
      formErrors.price = 'Enter a valid price greater than 0';
    }
    // Validate duration
    if (!formTime.trim()) {
      formErrors.time = 'Estimated duration is required';
    } else {
      const durationNum = parseFloat(formTime);
      if (isNaN(durationNum) || durationNum <= 0) {
        formErrors.time = 'Enter a valid positive duration';
      }
    }
    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const serviceData = {
      name: formName,
      category: formCategory,
      description: formDesc,
      price: parseFloat(formPrice),
      time: formTime,
      image: formImage
    };

    try {
      if (editTarget) {
        await ProviderService.updateService(editTarget.id, serviceData);
        showToast('success', 'Service updated successfully.');
      } else {
        await ProviderService.addService(serviceData);
        showToast('success', 'Service added successfully.');
      }
      await fetchServices();
      setShowModal(false);
    } catch (err) {
      console.error('handleSave error:', err);
      showToast('error', err.message || 'Failed to save service. Check the backend.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <Toast key="toast" type={toast.type} message={toast.message} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>

      {/* Title & Add Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white">Manage Services</h2>
          <p className="text-slate-400 text-sm mt-1">Configure and publish services offered to clients.</p>
        </div>
        <Button onClick={openAddModal} className="shadow-lg shadow-blue-500/20">
          <Plus className="w-4 h-4 mr-2" /> Add Service
        </Button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search services..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/50 rounded-xl text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm transition-all"
          />
        </div>

        {/* Category Filter */}
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        >
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        >
          <option value="All">All Status</option>
          <option value="Available">Available</option>
          <option value="Paused">Paused</option>
        </select>
      </div>

      {/* Services Grid */}
      {pageLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-72 rounded-3xl bg-slate-800/40 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        services.length === 0 ? (
          <EmptyState
            title="No services published"
            message="Publish clean services lists to begin matching with customers looking for professionals."
            actionText="Add Service"
            onAction={openAddModal}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Filter className="w-10 h-10 text-slate-600 mb-4" />
            <p className="text-slate-400 font-medium">No services match your filters.</p>
            <button
              onClick={() => { setSearch(''); setFilterCategory('All'); setFilterStatus('All'); }}
              className="mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Clear filters
            </button>
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filtered.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onEdit={openEditModal}
                onDelete={handleDeletePrompt}
                onDuplicate={handleDuplicate}
                onToggleAvailability={handleToggleAvailability}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* CRUD Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl overflow-y-auto max-h-[90vh] z-10"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-500" />
                  {editTarget ? 'Edit Service' : 'Add New Service'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <Input
                  label="Service Name"
                  placeholder="Service name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  error={errors.name}
                />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-400 block ml-1">Category</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <DurationInput
                    value={formTime}
                    onChange={setFormTime}
                    error={errors.time}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Starting Price (₹)"
                    placeholder="Price"
                    type="number"
                    min="1"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    error={errors.price}
                  />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-400 block ml-1">Service Image</label>
                      {providerPhoto && formImage === providerPhoto && (
                        <span className="text-[10px] text-blue-400 font-semibold bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                          Reusing Profile Photo
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 items-center">
                      {formImage ? (
                        <div className="w-11 h-11 rounded-xl overflow-hidden border border-blue-500/30 flex-shrink-0 bg-slate-800">
                          <img src={formImage} alt="Service preview" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-xl border border-slate-700/50 flex items-center justify-center flex-shrink-0 bg-slate-950 text-slate-500 text-[10px] font-semibold">
                          None
                        </div>
                      )}
                      <input
                        type="text"
                        placeholder="Image URL (defaults to registered profile photo)"
                        value={formImage}
                        onChange={(e) => setFormImage(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-3 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-400 block ml-1">Description</label>
                  <textarea
                    rows={3}
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Outline what features and cleaning elements this service includes..."
                    className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all duration-300"
                  />
                  {errors.desc && <p className="text-xs text-red-500 ml-1">{errors.desc}</p>}
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    loading={loading}
                    className="flex-1 shadow-lg shadow-blue-500/20 bg-blue-600"
                  >
                    {editTarget ? 'Save Changes' : 'Publish Service'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        title="Delete Service?"
        message="Are you sure you want to delete this service? Customers will not be able to book this service anymore."
        confirmText="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => { setShowDeleteModal(false); setTargetDeleteId(null); }}
      />
    </div>
  );
};

export default ProviderServices;
