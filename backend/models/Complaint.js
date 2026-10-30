import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  complaintId: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  providerName: { type: String, required: true },
  providerEmail: { type: String, required: true },
  comment: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Investigating', 'Resolved'], default: 'Pending' },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] },
  resolutionTimeline: { type: String, default: 'Resolution within 24 hours expected.' }
}, { timestamps: true });

export default mongoose.model('Complaint', complaintSchema);
