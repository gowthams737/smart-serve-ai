import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Calendar, ShieldCheck, Edit3, Save } from 'lucide-react';
import { AdminService } from '../../services/adminService';
import { formatDateDDMMYYYY } from '../../utils/dateFormat';

const Profile = () => {
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', email: '', phone: '', department: '' });
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    AdminService.initialize();
    const data = AdminService.getProfile();
    setProfile(data);
    setFormData({
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      department: data.department
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const updated = await AdminService.updateProfile(formData);
    setProfile(updated);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  if (!profile) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Admin Profile</h1>
        <p className="text-sm text-slate-400 mt-1">Manage personal details, view permissions, and audit admin access sessions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Widget: Avatar and summary */}
        <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl flex flex-col items-center text-center space-y-4 h-fit">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-red-500/50 bg-slate-950 flex items-center justify-center">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.fullName} className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-slate-500" />
              )}
            </div>
            <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-red-600 border-2 border-slate-900 text-white">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <h3 className="font-extrabold text-white text-lg">{profile.fullName}</h3>
            <p className="text-xs text-red-400 font-bold uppercase tracking-wider mt-0.5">{profile.role}</p>
            <p className="text-[10px] text-slate-500 mt-2">Department: {profile.department}</p>
          </div>

          <hr className="w-full border-white/5" />

          <div className="w-full text-left space-y-3 text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-slate-500" />
              <span>{profile.email}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-slate-500" />
              <span>{profile.phone}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>Joined Platform: {formatDateDDMMYYYY(profile.joinedDate) || profile.joinedDate}</span>
            </div>
          </div>
        </div>

        {/* Right Widget: Edit Form & Activity Logs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit Form */}
          <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-white text-base">Account Information</h4>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-400 font-bold transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Credentials
                </button>
              ) : (
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Modifying Account Details</span>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    disabled={!isEditing}
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    disabled={!isEditing}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Contact Phone</label>
                  <input
                    type="text"
                    required
                    disabled={!isEditing}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500/50"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Department</label>
                  <input
                    type="text"
                    required
                    disabled={!isEditing}
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              </div>

              {isEditing && (
                <div className="flex gap-3 justify-end pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        fullName: profile.fullName,
                        email: profile.email,
                        phone: profile.phone,
                        department: profile.department
                      });
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Details
                  </button>
                </div>
              )}
            </form>

            {saveSuccess && !isEditing && (
              <p className="text-xs text-green-400 font-bold mt-3">Profile updated successfully!</p>
            )}
          </div>

          {/* Activity summary & Logs */}
          <div className="p-6 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl space-y-4">
            <h4 className="font-bold text-white text-base">Administrative Access Log</h4>
            <div className="divide-y divide-white/5 space-y-3.5">
              <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
                <div>
                  <p className="font-bold text-white">Browser Login (Current Session)</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">IP: 192.168.1.45 • Coimbatore, TN</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">Active</span>
              </div>
              <div className="pt-3.5 flex items-center justify-between text-xs text-slate-400">
                <div>
                  <p className="font-bold text-white">Console API Edit (Platform Setting Update)</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">IP: 192.168.1.45 • 2026-07-29 11:24 AM</p>
                </div>
                <span className="text-[10px] text-slate-500 font-bold">2 hours ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
