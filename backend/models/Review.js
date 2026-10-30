import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  bookingId: { type: String, required: true },
  providerId: { type: String, required: true },
  customerEmail: { type: String, default: '', lowercase: true, trim: true },
  customerName: { type: String, required: true },
  customerImage: { type: String, default: '' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true },
  serviceTaken: { type: String, required: true },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] },
  reply: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('Review', reviewSchema);
