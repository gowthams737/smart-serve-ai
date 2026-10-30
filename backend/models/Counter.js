import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Composite key: `${providerKey}_${serviceKey}`
  providerId: { type: String, index: true },
  serviceId: { type: String, index: true },
  seq: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Counter', counterSchema);
