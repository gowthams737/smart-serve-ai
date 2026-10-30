import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  providerEmail: { type: String, required: true, lowercase: true, trim: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider', required: true },
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  pricingUnit: { type: String, default: 'Per Visit' },
  estimatedDuration: { type: String, default: '' }, // e.g. "30 minutes", "2 hours"
  image: { type: String, default: '' },
  isAvailable: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('Service', serviceSchema);
