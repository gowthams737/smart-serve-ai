import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Clock,
  Award,
  Edit2,
  Star,
  Activity,
  Calendar,
  X,
  Check,
  Briefcase,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  IndianRupee,
  MapPin
} from 'lucide-react';
import ReviewCard from '../../components/provider/ReviewCard';
import ImageUploadComponent from '../../components/provider/ImageUploadComponent';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { ProviderService } from '../../services/providerService';
import { formatWorkingHours } from '../../utils/timeFormat';

const ProviderProfile = () => {
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [categories, setCategories] = useState([
    'Electrician',
    'Plumber',
    'Carpenter',
    'Painter',
    'AC Repair',
    'Home Cleaning',
    'Deep Cleaning',
    'Pest Control',
    'RO Water Purifier',
    'Gardening',
    'Beautician',
    'Interior Designer'
  ]);

  const pricingUnits = [
    'Per Visit',
    'Per Hour',
    'Per Sq.Ft',
    'Per BHK',
    'Per Session',
    'Per Project',
    'Per Service',
    'Per Day'
  ];

  // Edit form state
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    category: '',
    experience: '',
    gender: 'Male',
    age: '',
    rate: '',
    pricingUnit: 'Per Visit',
    workingHours: { start: '09:00', end: '18:00' },
    bio: '',
    profilePhoto: ''
  });

  const loadProfileData = async () => {
    const info = await ProviderService.getProviderInfo();
    setProvider(info);
    if (info) {
      setEditForm({
        fullName: info.fullName || '',
        phone: info.phone || '',
        category: info.category || 'Electrician',
        experience: info.experience || '',
        gender: info.gender || 'Male',
        age: info.age || '',
        rate: info.rate || info.pricing?.[0]?.price || '',
        pricingUnit: info.pricingUnit || info.pricing?.[0]?.unit || 'Per Visit',
        workingHours: info.workingHours || { start: '09:00', end: '18:00' },
        bio: info.bio || info.about || '',
        profilePhoto: info.profilePhoto || info.photo || ''
      });
    }
    const list = await ProviderService.getReviews();
    setReviews(list);
  };

  useEffect(() => {
    loadProfileData();

    // Fetch existing categories
    const fetchCats = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/customer/services');
        const data = await res.json();
        if (data.success && Array.isArray(data.services) && data.services.length > 0) {
          setCategories(data.services.map(s => s.name));
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchCats();

    const handleProfileUpdate = (e) => {
      if (e.detail) {
        setProvider(e.detail);
        setEditForm({
          fullName: e.detail.fullName || '',
          phone: e.detail.phone || '',
          category: e.detail.category || 'Electrician',
          experience: e.detail.experience || '',
          gender: e.detail.gender || 'Male',
          age: e.detail.age || '',
          rate: e.detail.rate || e.detail.pricing?.[0]?.price || '',
          pricingUnit: e.detail.pricingUnit || e.detail.pricing?.[0]?.unit || 'Per Visit',
          workingHours: e.detail.workingHours || { start: '09:00', end: '18:00' },
          bio: e.detail.bio || e.detail.about || '',
          profilePhoto: e.detail.profilePhoto || e.detail.photo || ''
        });
      } else {
        loadProfileData();
      }
    };
    window.addEventListener('providerProfileUpdated', handleProfileUpdate);
    return () => window.removeEventListener('providerProfileUpdated', handleProfileUpdate);
  }, []);

  const handleReplySubmit = async (reviewId, replyText) => {
    await ProviderService.addReviewReply(reviewId, replyText);
    const list = await ProviderService.getReviews();
    setReviews(list);
  };

  const handleOpenEdit = () => {
    if (provider) {
      setEditForm({
        fullName: provider.fullName || '',
        phone: provider.phone || '',
        category: provider.category || 'Electrician',
        experience: provider.experience || '',
        gender: provider.gender || 'Male',
        age: provider.age || '',
        workingHours: provider.workingHours || { start: '09:00', end: '18:00' },
        bio: provider.bio || provider.about || '',
        profilePhoto: provider.profilePhoto || provider.photo || ''
      });
    }
    setIsEditing(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editForm.fullName.trim() || !editForm.phone.trim()) {
      alert('Full Name and Phone Number are required.');
      return;
    }

    setSaving(true);
    try {
      const updated = await ProviderService.updateProviderInfo({
        fullName: editForm.fullName.trim(),
        phone: editForm.phone.trim(),
        category: editForm.category,
        experience: Number(editForm.experience),
        gender: editForm.gender,
        age: Number(editForm.age),
        rate: editForm.rate !== '' ? Number(editForm.rate) : undefined,
        serviceRate: editForm.rate !== '' ? Number(editForm.rate) : undefined,
        pricingUnit: editForm.pricingUnit,
        workingHours: editForm.workingHours,
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        bio: editForm.bio.trim(),
        about: editForm.bio.trim(),
        profilePhoto: editForm.profilePhoto,
        photo: editForm.profilePhoto
      });

      if (updated) {
        setProvider(updated);
        setSaveSuccess(true);
        setTimeout(() => {
          setSaveSuccess(false);
          setIsEditing(false);
        }, 800);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenDeleteModal = () => {
    setDeletePassword('');
    setDeleteError('');
    setIsDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    if (isDeleting) return;
    setIsDeleteModalOpen(false);
    setDeletePassword('');
    setDeleteError('');
  };

  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    if (!deletePassword) {
      setDeleteError('Please enter your account password to confirm deletion.');
      return;
    }

    setIsDeleting(true);
    setDeleteError('');

    try {
      await ProviderService.deleteAccount(deletePassword, provider?.email);
      // Successful deletion: clear state and redirect to login page with success notification
      navigate('/login', {
        replace: true,
        state: { message: 'Your service provider account has been deleted successfully.' }
      });
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete account. Please verify your password and try again.');
      setIsDeleting(false);
    }
  };

  if (!provider) return null;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Banner / Cover Header */}
      <div className="relative bg-slate-900 border border-white/10 p-8 rounded-[32px] overflow-hidden flex flex-col md:flex-row items-center md:items-end justify-between gap-6 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/10 to-transparent -z-10" />
        
        {/* Profile identity info */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-4 border-slate-950 overflow-hidden bg-slate-800 p-1 flex items-center justify-center">
              {provider.profilePhoto || provider.photo ? (
                <img
                  src={provider.profilePhoto || provider.photo}
                  alt={provider.fullName}
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.parentElement?.querySelector('.provider-card-fallback');
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="provider-card-fallback w-full h-full items-center justify-center"
                style={{ display: (provider.profilePhoto || provider.photo) ? 'none' : 'flex' }}
              >
                <User size={64} className="text-blue-500" />
              </div>
            </div>
            {provider.isOnline && (
              <span className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-4 border-slate-900 rounded-full" />
            )}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <h2 className="text-3xl font-extrabold text-white">{provider.fullName}</h2>
              <span className="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                {provider.category}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-1.5 text-sm text-slate-400 font-medium">
              <span className="flex items-center gap-1">
                <Mail className="w-4 h-4 text-blue-500" /> {provider.email}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="w-4 h-4 text-blue-500" /> {provider.phone}
              </span>
              <span className="flex items-center gap-1">
                <Award className="w-4 h-4 text-blue-500" /> {provider.experience} years exp
              </span>
            </div>
          </div>
        </div>

        {/* Action / Quick Rating */}
        <div className="flex flex-col items-center md:items-end gap-3">
          <div className="flex items-center gap-2 bg-slate-950/80 px-4 py-2 rounded-2xl border border-white/5">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-sm font-extrabold text-white">{provider.rating}</span>
            <span className="text-xs text-slate-500">({provider.reviewsCount} reviews)</span>
          </div>

          <button
            onClick={handleOpenEdit}
            className="px-5 py-2.5 rounded-xl border border-blue-500/30 hover:border-blue-500 bg-blue-600/10 hover:bg-blue-600/20 text-xs font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300 flex items-center gap-2 transition-all shadow-lg shadow-blue-500/10"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit Profile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Key Provider Details & Working Schedule */}
        <div className="space-y-8">
          {/* Key Registered Details */}
          <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500" /> Provider Details
            </h3>
            <hr className="border-slate-800" />

            <div className="space-y-3.5 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Full Name</span>
                <span className="text-white font-semibold">{provider.fullName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Email Address</span>
                <span className="text-white font-semibold">{provider.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Phone Number</span>
                <span className="text-white font-semibold">{provider.phone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Service Category</span>
                <span className="text-blue-400 font-semibold">{provider.category}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Gender</span>
                <span className="text-white font-semibold">{provider.gender || 'Not specified'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Age</span>
                <span className="text-white font-semibold">{provider.age ? `${provider.age} years old` : 'Not specified'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Years of Experience</span>
                <span className="text-white font-semibold">{provider.experience} years</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Service Rate</span>
                <span className="text-blue-400 font-bold">
                  ₹{provider.rate || provider.pricing?.[0]?.price || 0} / {provider.pricingUnit || provider.pricing?.[0]?.unit || 'Visit'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Service Location</span>
                <span className="text-white font-semibold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  {provider.city || 'Coimbatore'}, {provider.state || 'Tamil Nadu'}
                </span>
              </div>
            </div>
          </div>

          {/* Working Schedule */}
          <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" /> Working Hours & Schedule
            </h3>
            <hr className="border-slate-800" />

            <div className="space-y-3.5 text-sm text-slate-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>Work Hours</span>
                </div>
                <span className="text-white font-bold text-xs uppercase bg-slate-950/80 px-3 py-1 rounded-lg border border-white/5">
                  {formatWorkingHours(provider.workingHours)}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  <span>Working Days</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(provider.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']).map((day) => (
                    <span key={day} className="px-2.5 py-1 bg-slate-950 rounded-lg text-xs font-semibold text-slate-400 border border-white/5">
                      {day}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2 font-medium">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span>Availability Status</span>
                </div>
                <span className={`text-xs font-bold uppercase ${provider.isOnline ? 'text-green-400' : 'text-slate-500'}`}>
                  {provider.isOnline ? 'Accepting requests' : 'Offline / Paused'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Professional Bio & Reviews list */}
        <div className="lg:col-span-2 space-y-8">
          {/* Professional Bio */}
          <div className="p-6 md:p-8 rounded-3xl bg-slate-900/50 border border-white/10 space-y-4">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-blue-500" /> Professional Bio & Description
            </h3>
            <hr className="border-slate-800" />
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
              {provider.bio || provider.about || 'No professional bio added yet.'}
            </p>
          </div>

          {/* Completed jobs indicator */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-slate-900/50 border border-white/10 text-center space-y-1">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Jobs Completed</span>
              <span className="text-2xl font-black text-white">{provider.completedJobs || 0}</span>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900/50 border border-white/10 text-center space-y-1">
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Total Hours Served</span>
              <span className="text-2xl font-black text-white">{(provider.completedJobs || 0) * 3} hrs</span>
            </div>
          </div>

          {/* Client Reviews Summary */}
          <div className="space-y-4">
            <h3 className="font-bold text-white text-lg">Recent Client Reviews</h3>
            <div className="space-y-4">
              {reviews.map((review, idx) => (
                <ReviewCard
                  key={review._id || review.id || idx}
                  review={review}
                  onReplySubmit={handleReplySubmit}
                />
              ))}
              {reviews.length === 0 && (
                <p className="text-center text-xs text-slate-600 py-6 bg-slate-900/20 rounded-3xl border border-slate-800/60">
                  No customer reviews received yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Account Management / Danger Zone */}
      <div className="p-6 md:p-8 rounded-3xl bg-red-950/20 border border-red-500/20 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-red-400 text-base md:text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" /> Danger Zone
            </h3>
            <p className="text-xs md:text-sm text-slate-400">
              Permanently delete your service provider account, services, and profile. This action cannot be undone.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenDeleteModal}
            className="px-5 py-2.5 rounded-xl border border-red-500/30 hover:border-red-500 bg-red-600/10 hover:bg-red-600/20 text-xs font-bold uppercase tracking-wider text-red-400 hover:text-red-300 flex items-center justify-center gap-2 transition-all shadow-lg shadow-red-500/10 self-start sm:self-auto flex-shrink-0"
          >
            <Trash2 className="w-4 h-4" /> Delete Account
          </button>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 md:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white">Edit Provider Profile</h3>
                <p className="text-xs text-slate-400 mt-0.5">Update your professional details and profile image</p>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Profile Photo Upload */}
              <ImageUploadComponent
                label="Profile Image"
                value={editForm.profilePhoto}
                onChange={(val) => setEditForm({ ...editForm, profilePhoto: val })}
                type="image"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Full Name"
                  icon={User}
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                />
                <Input
                  label="Phone Number"
                  icon={Phone}
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-400 block ml-1">Service Category</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-400 block ml-1">Gender</label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <Input
                  label="Age"
                  type="number"
                  min="18"
                  max="100"
                  value={editForm.age}
                  onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Years of Experience"
                  type="number"
                  min="0"
                  max="50"
                  icon={Award}
                  value={editForm.experience}
                  onChange={(e) => setEditForm({ ...editForm, experience: e.target.value })}
                />

                {/* Working Hours */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-sm font-semibold text-slate-400">Working Hours</label>
                    <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                      {formatWorkingHours(editForm.workingHours)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="time"
                      value={editForm.workingHours?.start || '09:00'}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        workingHours: { ...editForm.workingHours, start: e.target.value }
                      })}
                      className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="time"
                      value={editForm.workingHours?.end || '18:00'}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        workingHours: { ...editForm.workingHours, end: e.target.value }
                      })}
                      className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Service Rate & Pricing Unit */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Service Rate (₹)"
                  type="number"
                  min="1"
                  icon={IndianRupee}
                  placeholder="Rate"
                  value={editForm.rate}
                  onChange={(e) => setEditForm({ ...editForm, rate: e.target.value })}
                />

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-400 block ml-1">Pricing Unit</label>
                  <select
                    value={editForm.pricingUnit}
                    onChange={(e) => setEditForm({ ...editForm, pricingUnit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  >
                    {pricingUnits.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Service Territory (Fixed to Coimbatore) */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-400 block ml-1 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-500" /> Service Location
                </label>
                <div className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 text-sm flex items-center justify-between">
                  <span>Coimbatore, Tamil Nadu, India</span>
                  <span className="text-[10px] font-bold text-blue-400 uppercase bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Exclusive Region</span>
                </div>
                <p className="text-[10px] text-slate-500 ml-1">Providers register and operate exclusively within Coimbatore.</p>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-400 block ml-1">Professional Bio / Description</label>
                <textarea
                  rows={4}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="Tell clients about your expertise..."
                  className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={saving}
                  disabled={saveSuccess}
                  variant={saveSuccess ? 'ghost' : 'primary'}
                >
                  {saveSuccess ? (
                    <span className="flex items-center gap-1.5 text-green-400 font-bold">
                      <Check className="w-4 h-4" /> Changes Saved!
                    </span>
                  ) : (
                    'Save Profile Changes'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-red-500/30 rounded-3xl w-full max-w-lg p-6 md:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 text-red-500 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Delete Account</h3>
                  <p className="text-xs text-red-400 font-medium mt-0.5">Permanent & Irreversible</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                disabled={isDeleting}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-300 bg-slate-950/60 p-4 rounded-2xl border border-white/5">
              <p className="font-semibold text-white">
                Are you sure you want to permanently delete your service provider account? This action cannot be undone.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                All your listed services, provider details, and profile data will be permanently removed. You will be logged out immediately and cannot log in with this account again.
              </p>
            </div>

            {deleteError && (
              <div className="flex items-center gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmDelete} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Enter your password to confirm deletion:
                </label>
                <input
                  type="password"
                  placeholder="Enter account password"
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value);
                    setDeleteError('');
                  }}
                  disabled={isDeleting}
                  className="w-full bg-slate-950 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all placeholder:text-slate-600 disabled:opacity-50"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleCloseDeleteModal}
                  className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-slate-800 text-xs font-bold text-slate-300 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-red-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" /> Permanently Delete Account
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderProfile;