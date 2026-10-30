import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Shield, Lock, Eye, Check, Key, IndianRupee, Clock } from 'lucide-react';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { ProviderService } from '../../services/providerService';
import { formatWorkingHours } from '../../utils/timeFormat';

import ImageUploadComponent from '../../components/provider/ImageUploadComponent';

const ProviderSettings = () => {
  const [provider, setProvider] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  // Tab Profile settings forms
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('Electrician');
  const [experience, setExperience] = useState('5');
  const [gender, setGender] = useState('Male');
  const [age, setAge] = useState('30');
  const [rate, setRate] = useState('');
  const [pricingUnit, setPricingUnit] = useState('Per Visit');
  const [workingHours, setWorkingHours] = useState({ start: '09:00', end: '18:00' });
  const [about, setAbout] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [categories, setCategories] = useState([
    'Electrician', 'Plumber', 'Carpenter', 'Painter', 'AC Repair',
    'Home Cleaning', 'Deep Cleaning', 'Pest Control', 'RO Water Purifier',
    'Gardening', 'Beautician', 'Interior Designer'
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

  // Tab Change password forms
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Tab Notification choices
  const [notifConfig, setNotifConfig] = useState({
    emailAlerts: true,
    smsAlerts: true,
    paymentAlerts: true
  });

  // Tab Privacy
  const [isProfilePublic, setIsProfilePublic] = useState(true);

  useEffect(() => {
    const fetchInfo = async () => {
      const info = await ProviderService.getProviderInfo();
      if (info) {
        setProvider(info);
        setFullName(info.fullName || '');
        setEmail(info.email || '');
        setPhone(info.phone || '');
        setCategory(info.category || 'Electrician');
        setExperience(info.experience || '5');
        setGender(info.gender || 'Male');
        setAge(info.age || '30');
        setRate(info.rate || info.pricing?.[0]?.price || '');
        setPricingUnit(info.pricingUnit || info.pricing?.[0]?.unit || 'Per Visit');
        setWorkingHours(info.workingHours || { start: '09:00', end: '18:00' });
        setAbout(info.bio || info.about || '');
        setProfilePhoto(info.profilePhoto || info.photo || '');
      }

      try {
        const catRes = await fetch('http://localhost:5000/api/customer/services');
        const catData = await catRes.json();
        if (catData.success && Array.isArray(catData.services) && catData.services.length > 0) {
          setCategories(catData.services.map(s => s.name));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchInfo();
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) {
      alert('Required fields cannot be empty.');
      return;
    }

    const updated = await ProviderService.updateProviderInfo({
      fullName,
      email,
      phone,
      category,
      experience: Number(experience),
      gender,
      age: Number(age),
      rate: rate !== '' ? Number(rate) : undefined,
      serviceRate: rate !== '' ? Number(rate) : undefined,
      pricingUnit,
      workingHours,
      about,
      bio: about,
      profilePhoto,
      photo: profilePhoto
    });
    if (updated) {
      setProvider(updated);
    }

    triggerSuccess();
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    const stepErrors = {};
    if (!currentPassword) stepErrors.currentPassword = 'Current password is required';
    if (!newPassword) {
      stepErrors.newPassword = 'New password is required';
    } else if (newPassword.length < 6) {
      stepErrors.newPassword = 'Password must be 6+ characters';
    }
    if (newPassword !== confirmPassword) {
      stepErrors.confirmPassword = 'Passwords do not match';
    }
    if (currentPassword && newPassword && currentPassword === newPassword) {
      stepErrors.newPassword = 'New password must be different from current password';
    }

    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: provider?.email || email,
          currentPassword,
          newPassword
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrors({ currentPassword: data.message || 'Failed to update password' });
        return;
      }

      setErrors({});
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      triggerSuccess();
    } catch (err) {
      setErrors({ currentPassword: err.message || 'Error updating password' });
    }
  };

  const handleToggleNotif = (key) => {
    setNotifConfig({
      ...notifConfig,
      [key]: !notifConfig[key]
    });
  };

  const triggerSuccess = () => {
    setShowSaveSuccess(true);
    setTimeout(() => {
      setShowSaveSuccess(false);
    }, 1500);
  };

  if (!provider) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm font-medium">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Title */}
      <div>
        <h2 className="text-3xl font-extrabold text-white">Portal Settings</h2>
        <p className="text-slate-400 text-sm mt-1">Manage credentials security, notifications config, profile edits and visibility options.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Tabs */}
        <div className="lg:col-span-1 p-4 rounded-3xl bg-slate-900/50 border border-white/10 h-fit space-y-2">
          {[
            { id: 'profile', label: 'Profile settings', icon: User },
            { id: 'security', label: 'Password & Security', icon: Lock },
            { id: 'notifications', label: 'Alert Preferences', icon: Bell },
            { id: 'privacy', label: 'Profile Visibility', icon: Eye }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setErrors({});
                }}
                className={`w-full flex items-center gap-3 p-3 text-sm font-semibold rounded-2xl transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="lg:col-span-3 bg-slate-900/50 border border-white/10 rounded-3xl p-8 shadow-xl">
          {/* PROFILE SETTINGS */}
          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSave} className="space-y-6">
              <h3 className="text-xl font-bold text-white mb-2">Profile Settings</h3>
              <hr className="border-slate-800" />
              
              <ImageUploadComponent
                label="Profile Photo (Click or Drag to Change)"
                value={profilePhoto}
                onChange={(val) => setProfilePhoto(val)}
                type="image"
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <Input
                  label="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-400 block ml-1">Service Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-400 block ml-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
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
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Years of Experience"
                  type="number"
                  min="0"
                  max="50"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                />

                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-sm font-semibold text-slate-400">Working Hours</label>
                    <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                      {formatWorkingHours(workingHours)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="time"
                      value={workingHours?.start || '09:00'}
                      onChange={(e) => setWorkingHours({ ...workingHours, start: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="time"
                      value={workingHours?.end || '18:00'}
                      onChange={(e) => setWorkingHours({ ...workingHours, end: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                />

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-400 block ml-1">Pricing Unit</label>
                  <select
                    value={pricingUnit}
                    onChange={(e) => setPricingUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  >
                    {pricingUnits.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-400 block ml-1">Professional Bio / Description</label>
                <textarea
                  rows={4}
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all duration-300 text-sm"
                />
              </div>

              <div className="pt-4 flex items-center justify-between gap-4 border-t border-slate-800">
                <div />
                <Button
                  type="submit"
                  disabled={showSaveSuccess}
                  className="shadow-lg shadow-blue-500/10 px-8"
                  variant={showSaveSuccess ? 'ghost' : 'primary'}
                >
                  {showSaveSuccess ? (
                    <span className="flex items-center gap-1 text-green-400 font-bold">
                      <Check className="w-4 h-4" /> Saved Successfully!
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* PASSWORD SECURITY */}
          {activeTab === 'security' && (
            <form onSubmit={handlePasswordSave} className="space-y-6">
              <h3 className="text-xl font-bold text-white mb-2">Change Password</h3>
              <hr className="border-slate-800" />

              <Input
                label="Current Password"
                type="password"
                icon={Lock}
                value={currentPassword}
                onChange={(e) => {
                  setCurrentPassword(e.target.value);
                  setErrors({ ...errors, currentPassword: '' });
                }}
                error={errors.currentPassword}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="New Password"
                  type="password"
                  icon={Lock}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setErrors({ ...errors, newPassword: '' });
                  }}
                  error={errors.newPassword}
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  icon={Lock}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrors({ ...errors, confirmPassword: '' });
                  }}
                  error={errors.confirmPassword}
                />
              </div>

              <div className="pt-4 flex items-center justify-between gap-4 border-t border-slate-800">
                <div />
                <Button
                  type="submit"
                  disabled={showSaveSuccess}
                  className="shadow-lg shadow-blue-500/10 px-8"
                  variant={showSaveSuccess ? 'ghost' : 'primary'}
                >
                  {showSaveSuccess ? (
                    <span className="flex items-center gap-1 text-green-400 font-bold">
                      <Check className="w-4 h-4" /> Password Updated!
                    </span>
                  ) : (
                    'Update Password'
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* NOTIFICATION PREFERENCES */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white mb-2">Alert Preferences</h3>
              <p className="text-xs text-slate-500">Pick which channels we use to update you on booking activities.</p>
              <hr className="border-slate-800" />

              <div className="space-y-4">
                {[
                  { key: 'emailAlerts', title: 'Email Alerts', desc: 'Receive new booking alerts and payout transfers summaries via email.' },
                  { key: 'smsAlerts', title: 'SMS Notifications', desc: 'Receive SMS messages for urgent bookings and customer requests details.' },
                  { key: 'paymentAlerts', title: 'Payment Notices', desc: 'Alert me instantly upon payout receipts.' }
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-slate-950/40 rounded-2xl border border-white/5 gap-4">
                    <div className="space-y-1">
                      <span className="text-sm font-bold text-white block">{item.title}</span>
                      <span className="text-xs text-slate-500 block leading-relaxed max-w-md">{item.desc}</span>
                    </div>
                    <button
                      onClick={() => handleToggleNotif(item.key)}
                      className={`text-slate-400 hover:text-white transition-colors flex items-center justify-center`}
                    >
                      <div className={`w-12 h-6 rounded-full border p-1 transition-all duration-300 flex items-center ${
                        notifConfig[item.key]
                          ? 'bg-blue-600 border-blue-500/25 justify-end'
                          : 'bg-slate-900 border-slate-800 justify-start'
                      }`}>
                        <div className="w-4 h-4 bg-white rounded-full shadow" />
                      </div>
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex justify-between border-t border-slate-800">
                <div />
                <Button onClick={triggerSuccess} variant={showSaveSuccess ? 'ghost' : 'primary'} disabled={showSaveSuccess}>
                  {showSaveSuccess ? (
                    <span className="flex items-center gap-1 text-green-400 font-bold">
                      <Check className="w-4 h-4" /> Alerts Setup Saved!
                    </span>
                  ) : (
                    'Save Preferences'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* PROFILE PRIVACY VISIBILITY */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white mb-2">Profile Privacy</h3>
              <p className="text-xs text-slate-500 font-medium">Control who can discover and search your service profile.</p>
              <hr className="border-slate-800" />

              <div className="flex items-center justify-between p-4 bg-slate-950/40 rounded-2xl border border-white/5 gap-4">
                <div className="space-y-1">
                  <span className="text-sm font-bold text-white block">Public Profile Visibility</span>
                  <span className="text-xs text-slate-500 block leading-relaxed max-w-md">
                    Allow search engines and customers to view your public profile biography, service listing counts and completed ratings.
                  </span>
                </div>
                <button
                  onClick={() => setIsProfilePublic(!isProfilePublic)}
                  className="flex items-center justify-center"
                >
                  <div className={`w-12 h-6 rounded-full border p-1 transition-all duration-300 flex items-center ${
                    isProfilePublic
                      ? 'bg-blue-600 border-blue-500/25 justify-end'
                      : 'bg-slate-900 border-slate-800 justify-start'
                  }`}>
                    <div className="w-4 h-4 bg-white rounded-full shadow" />
                  </div>
                </button>
              </div>

              <div className="pt-4 flex justify-between border-t border-slate-800">
                <div />
                <Button onClick={triggerSuccess} variant={showSaveSuccess ? 'ghost' : 'primary'} disabled={showSaveSuccess}>
                  {showSaveSuccess ? (
                    <span className="flex items-center gap-1 text-green-400 font-bold">
                      <Check className="w-4 h-4" /> Privacy Settings Saved!
                    </span>
                  ) : (
                    'Save Settings'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderSettings;
