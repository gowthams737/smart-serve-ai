import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema({
  general: {
    siteName: { type: String, default: 'SmartServe AI' },
    supportEmail: { type: String, default: 'support@smartserve.ai' },
    contactNumber: { type: String, default: '+91 422 2451000' },
    address: { type: String, default: '102 Tidel Park, Peelamedu, Coimbatore, TN - 641014' },
    maintenanceMode: { type: Boolean, default: false }
  },
  notifications: {
    emailAlerts: { type: Boolean, default: true },
    smsAlerts: { type: Boolean, default: false },
    providerApprovalAlerts: { type: Boolean, default: true },
    complaintEscalationAlerts: { type: Boolean, default: true },
    bookingStatusAlerts: { type: Boolean, default: true }
  },
  appearance: {
    defaultTheme: { type: String, default: 'dark' },
    primaryColor: { type: String, default: '#2563eb' },
    fontSize: { type: String, default: 'medium' },
    compactMode: { type: Boolean, default: false }
  },
  serviceConfiguration: {
    commissionRate: { type: Number, default: 15 },
    minimumBookingAmount: { type: Number, default: 299 },
    autoAssignProviders: { type: Boolean, default: false },
    radiusLimitKm: { type: Number, default: 15 }
  },
  permissions: [{
    role: { type: String },
    module: { type: String },
    access: { type: String }
  }]
}, { timestamps: true });

export default mongoose.model('Setting', settingSchema);
