import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate, Link } from 'react-router-dom';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  Home, 
  Briefcase,
  Lock,
  Camera,
  X,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  ShieldCheck
} from 'lucide-react';
import { CustomerService } from '../../services/customerService';
import { AuthService } from '../../services/authService';
import { cleanImageUrl } from '../../utils/imageUrl';
import Button from '../../components/Button';

const CustomerProfile = () => {
  const { darkMode } = useOutletContext();
  const navigate = useNavigate();
  
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Image Upload State
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [imageSuccess, setImageSuccess] = useState('');

  // Edit Profile Details Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    phone: '',
    address: '',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    pincode: '641002'
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // Change Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // New address form state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: 'Home',
    address: ''
  });

  const loadProfile = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const profile = await CustomerService.fetchCustomerProfile();
      if (!profile) {
        setLoadError('Customer account not found in database or session expired. Please sign in or register.');
      } else {
        setCustomer(profile);
        setEditFormData({
          fullName: profile.fullName || '',
          phone: profile.phone || '',
          address: profile.address || '',
          city: profile.city || 'Coimbatore',
          state: profile.state || 'Tamil Nadu',
          pincode: profile.pincode || '641002'
        });
      }
    } catch (err) {
      setLoadError(err.message || 'Failed to load customer profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();

    const handleProfileUpdate = () => {
      const updated = CustomerService.getCustomerInfo();
      if (updated) {
        setCustomer(updated);
        setEditFormData({
          fullName: updated.fullName || '',
          phone: updated.phone || '',
          address: updated.address || '',
          city: updated.city || 'Coimbatore',
          state: updated.state || 'Tamil Nadu',
          pincode: updated.pincode || '641002'
        });
      }
    };

    const handleAuthInvalidated = () => {
      setCustomer(null);
      setLoadError('Your session has ended or account was deleted from the database. Please sign in again.');
    };

    window.addEventListener('profile-updated', handleProfileUpdate);
    window.addEventListener('auth-invalidated', handleAuthInvalidated);
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
      window.removeEventListener('auth-invalidated', handleAuthInvalidated);
    };
  }, []);

  // Handle Profile Image Upload
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageError('');
    setImageSuccess('');

    // Client-side format validation: JPEG, PNG, WebP
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setImageError('Unsupported format. Please select a JPEG, PNG, or WebP image.');
      return;
    }

    // Client-side file size validation: max 5MB
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Profile image must be 5MB or smaller.');
      return;
    }

    setImageUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result;
        const updated = await AuthService.updateProfileImage(base64Data);
        setCustomer(prev => ({ ...prev, photo: updated.photo || updated.profileImage }));
        setImageSuccess('Profile picture updated successfully!');
        setTimeout(() => setImageSuccess(''), 3500);
      } catch (err) {
        setImageError(err.message || 'Failed to update profile picture.');
      } finally {
        setImageUploading(false);
      }
    };
    reader.onerror = () => {
      setImageError('Could not read image file. Please try another image.');
      setImageUploading(false);
    };
    reader.readAsDataURL(file);
  };

  // Open Edit Details Modal
  const handleOpenEditModal = () => {
    if (customer) {
      setEditFormData({
        fullName: customer.fullName || '',
        phone: customer.phone || '',
        address: customer.address || '',
        city: customer.city || 'Coimbatore',
        state: customer.state || 'Tamil Nadu',
        pincode: customer.pincode || '641002'
      });
    }
    setEditError('');
    setEditSuccess('');
    setShowEditModal(true);
  };

  // Save Profile Details
  const handleSaveProfileDetails = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess('');

    if (!editFormData.fullName.trim()) {
      setEditError('Full name is required.');
      return;
    }

    const cleanPhone = editFormData.phone.replace(/[\s\-()+]/g, '');
    if (cleanPhone.length < 7 || isNaN(cleanPhone)) {
      setEditError('Please enter a valid numeric phone number.');
      return;
    }

    if (!editFormData.address.trim()) {
      setEditError('Primary delivery address is required.');
      return;
    }

    const unsupportedCities = ['chennai', 'bangalore', 'bengaluru', 'mumbai', 'delhi', 'hyderabad', 'kolkata', 'kochi', 'madurai', 'salem', 'trichy', 'tirupur', 'erode'];
    if (unsupportedCities.some(c => editFormData.address.toLowerCase().includes(c))) {
      setEditError('SmartServe AI operates exclusively in Coimbatore, Tamil Nadu. Address must be within Coimbatore.');
      return;
    }

    const cleanPincode = editFormData.pincode.trim();
    if (cleanPincode && (!/^\d{6}$/.test(cleanPincode))) {
      setEditError('Pincode must be a 6-digit number (e.g. 641002).');
      return;
    }

    setEditLoading(true);
    try {
      const updatedUser = await CustomerService.updateCustomerInfo({
        fullName: editFormData.fullName.trim(),
        phone: editFormData.phone.trim(),
        address: editFormData.address.trim(),
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: cleanPincode || '641002'
      });
      setCustomer(updatedUser);
      setEditSuccess('Profile details saved successfully!');
      setTimeout(() => {
        setEditSuccess('');
        setShowEditModal(false);
      }, 1200);
    } catch (err) {
      setEditError(err.message || 'Failed to update profile details.');
    } finally {
      setEditLoading(false);
    }
  };

  // Open Password Change Modal
  const handleOpenPasswordModal = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordError('');
    setPasswordSuccess('');
    setShowPasswordModal(true);
  };

  // Submit Password Change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordData.currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (passwordData.newPassword.length > 128) {
      setPasswordError('New password cannot exceed 128 characters.');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordError('New password must be different from your current password.');
      return;
    }

    setPasswordLoading(true);
    try {
      await AuthService.changePassword(passwordData.currentPassword, passwordData.newPassword);
      setPasswordSuccess('Password successfully updated!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setPasswordSuccess('');
        setShowPasswordModal(false);
      }, 1500);
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password. Please check your current password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Address Book Add Location
  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!newAddress.address.trim()) return;

    const unsupportedCities = ['chennai', 'bangalore', 'bengaluru', 'mumbai', 'delhi', 'hyderabad', 'kolkata', 'kochi', 'madurai', 'salem', 'trichy', 'tirupur', 'erode'];
    if (unsupportedCities.some(c => newAddress.address.toLowerCase().includes(c))) {
      alert('SmartServe AI operates exclusively in Coimbatore, Tamil Nadu. Please enter an address located in Coimbatore.');
      return;
    }

    const formattedAddress = newAddress.address.toLowerCase().includes('coimbatore')
      ? newAddress.address.trim()
      : `${newAddress.address.trim()}, Coimbatore, TN`;

    const addressList = customer.savedAddresses || [];
    const updatedAddresses = [
      ...addressList,
      {
        id: 'addr_' + Date.now(),
        label: newAddress.label,
        address: formattedAddress
      }
    ];

    try {
      const updatedCustomer = await CustomerService.updateCustomerInfo({
        savedAddresses: updatedAddresses
      });
      setCustomer(updatedCustomer);
      setNewAddress({ label: 'Home', address: '' });
      setShowAddressForm(false);
    } catch (err) {
      alert(err.message || 'Failed to save address.');
    }
  };

  // Address Book Delete Location
  const handleDeleteAddress = async (id) => {
    const updatedAddresses = (customer.savedAddresses || []).filter(a => a.id !== id);
    try {
      const updatedCustomer = await CustomerService.updateCustomerInfo({
        savedAddresses: updatedAddresses
      });
      setCustomer(updatedCustomer);
    } catch (err) {
      alert(err.message || 'Failed to delete address.');
    }
  };

  // Session Invalidated / Account Deleted View
  if (loadError) {
    return (
      <div className="max-w-md mx-auto py-24 text-center space-y-5 animate-in fade-in duration-300">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className={`text-2xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Session Unavailable</h3>
        <p className="text-sm text-slate-400 leading-relaxed">{loadError}</p>
        <div className="pt-2">
          <button
            onClick={() => {
              AuthService.logout();
              navigate('/login');
            }}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all cursor-pointer"
          >
            Sign In Again
          </button>
        </div>
      </div>
    );
  }

  // Loading View
  if (loading && !customer) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm font-medium">Loading your profile from database...</p>
      </div>
    );
  }

  if (!customer) return null;

  // Profile setup completion calculation
  const fields = [
    customer.fullName,
    customer.email,
    customer.phone,
    customer.photo,
    customer.address,
    customer.city,
    customer.state,
    customer.pincode,
    customer.savedAddresses?.length > 0
  ];
  const completedFields = fields.filter(Boolean).length;
  const completionPercentage = Math.round((completedFields / fields.length) * 100);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Header */}
      <div>
        <h2 className={`text-3xl font-extrabold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          My Profile
        </h2>
        <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
          Manage your verified customer profile, profile photo, credentials, and saved service addresses.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Avatar, Upload, Progress Meter */}
        <div className="space-y-6">
          <div className={`p-6 rounded-[32px] border text-center relative ${
            darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            {/* Avatar with Camera Upload Overlay */}
            <div className="relative inline-block mb-4 pt-2">
              <div className="w-28 h-28 rounded-full border-4 border-blue-500/20 p-1 flex items-center justify-center bg-slate-800 overflow-hidden relative group">
                {cleanImageUrl(customer.photo) ? (
                  <img
                    src={cleanImageUrl(customer.photo)}
                    alt={customer.fullName}
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.parentElement?.querySelector('.cust-profile-fallback');
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  className="cust-profile-fallback w-full h-full rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-4xl select-none"
                  style={{ display: cleanImageUrl(customer.photo) ? 'none' : 'flex' }}
                >
                  {((customer.fullName || '').trim().charAt(0) || 'C').toUpperCase()}
                </div>

                {/* Uploading Spinner */}
                {imageUploading && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-full">
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Camera Upload Button */}
              <label
                htmlFor="cust-avatar-file-input"
                className="absolute bottom-1 right-1 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg border-2 border-slate-900 cursor-pointer transition-all hover:scale-105"
                title="Change profile picture (JPEG, PNG, WebP up to 5MB)"
              >
                <Camera className="w-4 h-4" />
                <input
                  id="cust-avatar-file-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageFileChange}
                  disabled={imageUploading}
                />
              </label>
            </div>

            {/* Image Feedback */}
            {imageError && (
              <div className="mb-3 p-2 text-[11px] rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{imageError}</span>
              </div>
            )}
            {imageSuccess && (
              <div className="mb-3 p-2 text-[11px] rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 flex items-center justify-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{imageSuccess}</span>
              </div>
            )}

            <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{customer.fullName}</h3>
            <p className="text-xs text-slate-500 font-semibold mb-6">Registered Customer • Coimbatore</p>

            {/* Profile Completion Meter */}
            <div className="space-y-2 text-left mb-6">
              <div className="flex justify-between text-xs font-bold">
                <span className={darkMode ? 'text-slate-400' : 'text-slate-500'}>Profile Setup</span>
                <span className="text-blue-500">{completionPercentage}%</span>
              </div>
              <div className={`w-full h-2 rounded-full overflow-hidden ${darkMode ? 'bg-slate-950' : 'bg-slate-100'}`}>
                <div 
                  className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full transition-all duration-1000"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 leading-normal pt-1">
                Fill in your phone, delivery address, and profile photo to reach 100% profile setup.
              </p>
            </div>

            <hr className={`my-6 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`} />

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <button 
                onClick={handleOpenEditModal}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Edit3 className="w-4 h-4" /> Edit Profile Details
              </button>

              <button 
                onClick={handleOpenPasswordModal}
                className={`w-full py-2.5 rounded-2xl border ${darkMode ? 'border-slate-800 hover:border-slate-700 text-slate-300 bg-slate-950/40' : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50'} font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer`}
              >
                <Lock className="w-3.5 h-3.5 text-blue-400" /> Change Password
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Account details and Address Book */}
        <div className="lg:col-span-2 space-y-6">
          {/* Account Details info */}
          <div className={`p-6 md:p-8 rounded-[32px] border ${
            darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`font-bold text-base ${darkMode ? 'text-white' : 'text-slate-900'}`}>Personal Information</h3>
              <button
                onClick={handleOpenEditModal}
                className="text-xs font-bold text-blue-500 hover:text-blue-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Full Name</span>
                  <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'} mt-0.5 block`}>{customer.fullName}</span>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Email Address</span>
                  <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'} mt-0.5 block`}>{customer.email}</span>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Phone</span>
                  <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'} mt-0.5 block`}>
                    {customer.phone || <span className="text-slate-500 font-normal italic">Not provided</span>}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">Primary Location</span>
                  <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'} mt-0.5 block`}>
                    {customer.address ? `${customer.address}, ${customer.city || 'Coimbatore'}, ${customer.state || 'Tamil Nadu'} ${customer.pincode || ''}` : <span className="text-slate-500 font-normal italic">Not set</span>}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Address Book */}
          <div className={`p-6 md:p-8 rounded-[32px] border ${
            darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className={`font-bold text-base ${darkMode ? 'text-white' : 'text-slate-900'}`}>Saved Address Book</h3>
                <p className="text-xs text-slate-500 mt-0.5">Manage home and office locations for faster bookings.</p>
              </div>
              <button
                onClick={() => setShowAddressForm(!showAddressForm)}
                className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Address
              </button>
            </div>

            {/* New Address Form */}
            {showAddressForm && (
              <form onSubmit={handleAddAddress} className="mb-6 p-4 rounded-2xl border border-slate-800 space-y-4 animate-in slide-in-from-top-2 duration-300">
                <div className="flex gap-4">
                  {['Home', 'Office', 'Other'].map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setNewAddress(prev => ({ ...prev, label: lbl }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                        newAddress.label === lbl
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : darkMode ? 'bg-slate-950 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
                
                <div className="space-y-1.5">
                  <input
                    type="text"
                    required
                    value={newAddress.address}
                    onChange={(e) => setNewAddress(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Enter street/locality in Coimbatore..."
                    className={`w-full p-3 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div className="flex justify-end gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(false)}
                    className="px-3 py-2 border rounded-xl border-slate-800 text-slate-400 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl cursor-pointer"
                  >
                    Save Location
                  </button>
                </div>
              </form>
            )}

            {/* Address List */}
            <div className="space-y-3">
              {customer.savedAddresses?.map((a) => (
                <div
                  key={a.id}
                  className={`p-4 rounded-2xl border flex justify-between items-center gap-4 ${
                    darkMode ? 'bg-slate-950/40 border-white/5' : 'bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500">
                      {a.label === 'Home' ? <Home className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-900'} block`}>{a.label} Location</span>
                      <span className="text-[11px] text-slate-500 leading-normal block mt-0.5">{a.address}</span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleDeleteAddress(a.id)}
                    className="p-2 text-slate-500 hover:text-red-500 transition-colors cursor-pointer"
                    title="Delete location"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {(!customer.savedAddresses || customer.savedAddresses.length === 0) && (
                <p className="text-xs text-slate-500 text-center py-4">No saved addresses found. Add a home or office location above.</p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ─── MODAL: EDIT PROFILE DETAILS ───────────────────────── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`relative w-full max-w-lg p-6 md:p-8 rounded-[32px] border shadow-2xl ${
            darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Edit Profile Details</h3>
                  <p className="text-xs text-slate-500">Update your verified personal and delivery information</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            )}
            {editSuccess && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{editSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfileDetails} className="space-y-4">
              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.fullName}
                  onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                  placeholder="Your full name"
                  className={`w-full p-3 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  placeholder="10-digit mobile number"
                  className={`w-full p-3 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Primary Delivery Address *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  placeholder="Street / locality in Coimbatore..."
                  className={`w-full p-3 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                    darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`text-[11px] font-semibold block mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    City
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editFormData.city || 'Coimbatore'}
                    className={`w-full p-2.5 text-xs rounded-xl border cursor-not-allowed ${
                      darkMode ? 'bg-slate-950/60 border-white/5 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                    }`}
                  />
                </div>
                <div>
                  <label className={`text-[11px] font-semibold block mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    State
                  </label>
                  <input
                    type="text"
                    disabled
                    value={editFormData.state || 'Tamil Nadu'}
                    className={`w-full p-2.5 text-xs rounded-xl border cursor-not-allowed ${
                      darkMode ? 'bg-slate-950/60 border-white/5 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'
                    }`}
                  />
                </div>
                <div>
                  <label className={`text-[11px] font-semibold block mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Pincode
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={editFormData.pincode}
                    onChange={(e) => setEditFormData({ ...editFormData, pincode: e.target.value })}
                    placeholder="641002"
                    className={`w-full p-2.5 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer"
                >
                  {editLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL: CHANGE PASSWORD ────────────────────────────── */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`relative w-full max-w-md p-6 md:p-8 rounded-[32px] border shadow-2xl ${
            darkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Change Password</h3>
                  <p className="text-xs text-slate-500">Update account credentials with secure encryption</p>
                </div>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {passwordError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}
            {passwordSuccess && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Current Password *
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    className={`w-full p-3 pr-10 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    placeholder="At least 6 characters"
                    className={`w-full p-3 pr-10 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className={`text-xs font-semibold block mb-1.5 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                    className={`w-full p-3 pr-10 text-xs rounded-xl border focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      darkMode ? 'bg-slate-950 border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-500/20 cursor-pointer"
                >
                  {passwordLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Lock className="w-4 h-4" />}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerProfile;
