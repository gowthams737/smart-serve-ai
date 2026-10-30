import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, User, Phone, MapPin, ArrowLeft, Save, Check, AlertCircle, Lock } from 'lucide-react';
import { AuthService } from '../services/authService';
import Input from '../components/Input';
import Button from '../components/Button';

const EditProfilePage = () => {
  const user = AuthService.getCurrentUser();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    address: user?.address || '',
    city: user?.city || 'Coimbatore',
    state: user?.state || 'Tamil Nadu',
    pincode: user?.pincode || '641002'
  });
  // Preview image (base64 or existing URL) for display before saving
  const [previewImage, setPreviewImage] = useState(user?.profileImage || '');
  // The final base64 string to save (null means no change, '' means removed)
  const [newProfileImage, setNewProfileImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPG, PNG, GIF, etc.).');
      return;
    }
    // Validate size (max 5MB for base64 storage)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be smaller than 5MB.');
      return;
    }

    setUploadError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setPreviewImage(base64String);
      setNewProfileImage(base64String);
    };
    reader.onerror = () => {
      setUploadError('Failed to read the selected image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaveError('');
    try {
      // Save profile details (name, phone, address, location)
      await AuthService.updateProfile({
        fullName: formData.fullName,
        phone: formData.phone,
        address: formData.address,
        city: formData.city || 'Coimbatore',
        state: formData.state || 'Tamil Nadu',
        pincode: formData.pincode || '641002'
      });

      // If a new photo was selected, persist it separately
      if (newProfileImage !== null) {
        await AuthService.updateProfileImage(newProfileImage);
      }

      setSuccess(true);
      setTimeout(() => {
        // Navigate to the customer profile page
        const currentUser = AuthService.getCurrentUser();
        if (currentUser?.role === 'Customer') {
          navigate('/customer/profile');
        } else {
          navigate('/profile');
        }
      }, 1500);
    } catch (err) {
      setSaveError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
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
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordError('New password must be different from current password.');
      return;
    }

    setPasswordLoading(true);
    try {
      await AuthService.changePassword(passwordData.currentPassword, passwordData.newPassword);
      setPasswordSuccess('Password successfully updated!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password. Please check your current password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen pt-32 pb-20 px-6">
      <div className="container mx-auto max-w-2xl">
        <button 
          onClick={() => {
            const currentUser = AuthService.getCurrentUser();
            if (currentUser?.role === 'Customer') navigate('/customer/profile');
            else navigate('/profile');
          }}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> Back to Profile
        </button>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 md:p-10 rounded-[32px] shadow-2xl">
          <h2 className="text-3xl font-bold text-white mb-10">Edit Profile</h2>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center justify-center mb-10">
              <div className="relative group">
                <div className="w-32 h-32 rounded-full border-4 border-blue-500/20 p-1 flex items-center justify-center bg-slate-800 overflow-hidden">
                  {previewImage ? (
                    <img
                      src={previewImage}
                      alt="Profile Preview"
                      className="w-full h-full object-cover rounded-full"
                      onError={() => setPreviewImage('')}
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 font-black text-4xl select-none">
                      {((formData.fullName || user?.fullName || '').trim().charAt(0) || '').toUpperCase() || <User className="w-16 h-16 text-blue-500" />}
                    </div>
                  )}
                </div>
                <label
                  htmlFor="profile-image-input"
                  className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  title="Click to change profile photo"
                >
                  <Camera className="text-white w-8 h-8" />
                  <input
                    id="profile-image-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
              <p className="mt-4 text-sm text-slate-500">Click image to change profile photo</p>
              {uploadError && (
                <div className="mt-2 flex items-center gap-2 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
              {newProfileImage && !uploadError && (
                <p className="mt-2 text-xs text-green-400">✓ New photo selected — save to apply</p>
              )}
            </div>

            {saveError && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{saveError}</p>
              </div>
            )}

            <div className="space-y-6">
              <Input
                label="Full Name"
                icon={User}
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />

              <Input
                label="Phone Number"
                icon={Phone}
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />

              <Input
                label="Primary Address"
                icon={MapPin}
                placeholder="Street address in Coimbatore"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-semibold text-slate-400 block ml-1 mb-2">City</label>
                  <input
                    type="text"
                    disabled
                    value={formData.city || 'Coimbatore'}
                    className="w-full bg-slate-900/30 border border-slate-700/30 rounded-xl px-4 py-3 text-slate-400 text-sm cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-400 block ml-1 mb-2">State</label>
                  <input
                    type="text"
                    disabled
                    value={formData.state || 'Tamil Nadu'}
                    className="w-full bg-slate-900/30 border border-slate-700/30 rounded-xl px-4 py-3 text-slate-400 text-sm cursor-not-allowed"
                  />
                </div>
                <div>
                  <Input
                    label="Pincode"
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Button 
                type="submit" 
                className="w-full" 
                size="lg" 
                loading={loading}
                variant={success ? 'ghost' : 'primary'}
                disabled={success || !!uploadError}
              >
                {success ? (
                  <span className="flex items-center gap-2 text-green-500">
                    <Check className="w-6 h-6" /> Profile Updated!
                  </span>
                ) : (
                  <>
                    <Save className="w-5 h-5 mr-2" /> Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Password & Security Section */}
          <div className="mt-12 pt-8 border-t border-white/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Password & Security</h3>
                <p className="text-xs text-slate-400">Update your account credentials with secure encryption</p>
              </div>
            </div>

            {passwordError && (
              <div className="mb-6 flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{passwordError}</p>
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-6 flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-xl">
                <Check className="w-5 h-5 flex-shrink-0" />
                <p>{passwordSuccess}</p>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-6">
              <Input
                label="Current Password"
                type="password"
                icon={Lock}
                placeholder="Enter your current password"
                value={passwordData.currentPassword}
                onChange={(e) => {
                  setPasswordData({ ...passwordData, currentPassword: e.target.value });
                  if (passwordError) setPasswordError('');
                }}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="New Password"
                  type="password"
                  icon={Lock}
                  placeholder="At least 6 characters"
                  value={passwordData.newPassword}
                  onChange={(e) => {
                    setPasswordData({ ...passwordData, newPassword: e.target.value });
                    if (passwordError) setPasswordError('');
                  }}
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  icon={Lock}
                  placeholder="Re-enter new password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => {
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value });
                    if (passwordError) setPasswordError('');
                  }}
                />
              </div>

              <Button
                type="submit"
                variant="outline"
                className="w-full"
                size="lg"
                loading={passwordLoading}
              >
                <Lock className="w-4 h-4 mr-2" /> Update Password
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfilePage;

