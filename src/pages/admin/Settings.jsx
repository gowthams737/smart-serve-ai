import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Shield, Bell, Eye, Save } from 'lucide-react';
import { AdminService } from '../../services/adminService';

const PlatformSettings = () => {
  const [settings, setSettings] = useState(null);
  const [activeSection, setActiveSection] = useState('general');
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    AdminService.initialize();
    const loadSettings = async () => {
      const data = await AdminService.getSettings();
      setSettings(data);
    };
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const saved = await AdminService.updateSettings(settings);
    if (saved) {
      setSettings(saved);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Platform Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Configure SmartServe AI parameters, notifications, and baseline defaults.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation panel */}
        <div className="md:col-span-1 p-4 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl space-y-2 h-fit">
          <button
            onClick={() => setActiveSection('general')}
            className={`w-full text-left p-3 rounded-2xl text-xs font-bold transition-all ${
              activeSection === 'general' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            General Parameters
          </button>
          <button
            onClick={() => setActiveSection('notifications')}
            className={`w-full text-left p-3 rounded-2xl text-xs font-bold transition-all ${
              activeSection === 'notifications' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Notification Settings
          </button>
          <button
            onClick={() => setActiveSection('services')}
            className={`w-full text-left p-3 rounded-2xl text-xs font-bold transition-all ${
              activeSection === 'services' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Service Configs
          </button>
          <button
            onClick={() => setActiveSection('permissions')}
            className={`w-full text-left p-3 rounded-2xl text-xs font-bold transition-all ${
              activeSection === 'permissions' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            User Permissions (UI)
          </button>
        </div>

        {/* Content panel */}
        <form onSubmit={handleSave} className="md:col-span-3 p-6 rounded-3xl bg-slate-900/50 border border-white/10 backdrop-blur-xl space-y-6">
          {activeSection === 'general' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-white text-base">General Platform Parameters</h3>
              <hr className="border-white/5" />
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Platform Name</label>
                  <input
                    type="text"
                    value={settings.general.siteName}
                    onChange={(e) => setSettings({
                      ...settings,
                      general: { ...settings.general, siteName: e.target.value }
                    })}
                    className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Support Contact Email</label>
                  <input
                    type="email"
                    value={settings.general.supportEmail}
                    onChange={(e) => setSettings({
                      ...settings,
                      general: { ...settings.general, supportEmail: e.target.value }
                    })}
                    className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Support Phone</label>
                  <input
                    type="text"
                    value={settings.general.contactNumber}
                    onChange={(e) => setSettings({
                      ...settings,
                      general: { ...settings.general, contactNumber: e.target.value }
                    })}
                    className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-950/20 rounded-xl border border-white/5">
                  <div>
                    <h5 className="font-bold text-white text-xs">Maintenance Mode</h5>
                    <p className="text-[10px] text-slate-500">Temporarily disable customer app interactions.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.general.maintenanceMode}
                    onChange={(e) => setSettings({
                      ...settings,
                      general: { ...settings.general, maintenanceMode: e.target.checked }
                    })}
                    className="w-4 h-4 cursor-pointer accent-blue-600"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-white text-base">Alerts & System Push Actions</h3>
              <hr className="border-white/5" />
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-950/20 rounded-xl border border-white/5">
                  <div>
                    <h5 className="font-bold text-white text-xs">Global Email Alerts</h5>
                    <p className="text-[10px] text-slate-500">Enable email receipts for all platform processes.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.emailAlerts}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, emailAlerts: e.target.checked }
                    })}
                    className="w-4 h-4 cursor-pointer accent-blue-600"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-950/20 rounded-xl border border-white/5">
                  <div>
                    <h5 className="font-bold text-white text-xs">SMS Warning Alerts</h5>
                    <p className="text-[10px] text-slate-500">Transmit security and payout alerts via mobile carrier SMS.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.smsAlerts}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, smsAlerts: e.target.checked }
                    })}
                    className="w-4 h-4 cursor-pointer accent-blue-600"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-950/20 rounded-xl border border-white/5">
                  <div>
                    <h5 className="font-bold text-white text-xs">Provider Onboarding Alerts</h5>
                    <p className="text-[10px] text-slate-500">Alert administrators on new partner credential applications.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifications.providerApprovalAlerts}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, providerApprovalAlerts: e.target.checked }
                    })}
                    className="w-4 h-4 cursor-pointer accent-blue-600"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'services' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-white text-base">Service Rates & Allocations</h3>
              <hr className="border-white/5" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Platform Commission (%)</label>
                  <input
                    type="number"
                    value={settings.serviceConfiguration.commissionRate}
                    onChange={(e) => setSettings({
                      ...settings,
                      serviceConfiguration: { ...settings.serviceConfiguration, commissionRate: Number(e.target.value) }
                    })}
                    className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Minimum Booking (₹)</label>
                  <input
                    type="number"
                    value={settings.serviceConfiguration.minimumBookingAmount}
                    onChange={(e) => setSettings({
                      ...settings,
                      serviceConfiguration: { ...settings.serviceConfiguration, minimumBookingAmount: Number(e.target.value) }
                    })}
                    className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1">Coverage Radius (Km)</label>
                  <input
                    type="number"
                    value={settings.serviceConfiguration.radiusLimitKm}
                    onChange={(e) => setSettings({
                      ...settings,
                      serviceConfiguration: { ...settings.serviceConfiguration, radiusLimitKm: Number(e.target.value) }
                    })}
                    className="w-full px-4 py-2 bg-slate-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-slate-950/20 rounded-xl border border-white/5 col-span-2">
                  <div>
                    <h5 className="font-bold text-white text-xs">Auto Assign Partner Requests</h5>
                    <p className="text-[10px] text-slate-500">Automatically map customer bookings to the nearest available provider.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.serviceConfiguration.autoAssignProviders}
                    onChange={(e) => setSettings({
                      ...settings,
                      serviceConfiguration: { ...settings.serviceConfiguration, autoAssignProviders: e.target.checked }
                    })}
                    className="w-4 h-4 cursor-pointer accent-blue-600"
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'permissions' && (
            <div className="space-y-4">
              <h3 className="font-extrabold text-white text-base">User Permissions</h3>
              <hr className="border-white/5" />
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-white/5 text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                      <th className="pb-2">Access Role</th>
                      <th className="pb-2">Authorized Modules</th>
                      <th className="pb-2">Access Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {settings.permissions.map((p, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 font-bold text-white">{p.role}</td>
                        <td className="py-2.5">{p.module}</td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-600/10 text-blue-400 border border-blue-500/20">
                            {p.access}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            {saveSuccess && (
              <span className="text-xs text-green-400 font-bold self-center">Settings saved successfully!</span>
            )}
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold transition-all shadow-lg shadow-blue-500/10"
            >
              <Save className="w-4 h-4" />
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlatformSettings;
