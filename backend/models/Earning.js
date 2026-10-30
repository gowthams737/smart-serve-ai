import mongoose from 'mongoose';

const earningSchema = new mongoose.Schema({
  providerEmail: { type: String, required: true },
  today: { type: Number, default: 0 },
  weekly: { type: Number, default: 0 },
  monthly: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  completedJobsCount: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Earning', earningSchema);
