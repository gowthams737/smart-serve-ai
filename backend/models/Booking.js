import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, index: true }, // e.g. #01, #02, or historical b1
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  customerPhone: { type: String, default: 'Phone number not provided' },
  customerAddress: { type: String, default: 'Address not provided' },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider' },
  providerName: { type: String, required: true },
  providerEmail: { type: String, required: true, index: true },
  providerPhone: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  serviceType: { type: String, required: true },
  serviceName: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled', 'Active', 'Rejected'], default: 'Pending' },
  location: { type: String, default: '' },
  providerPhoto: { type: String, default: '' }
}, { timestamps: true });

// Performance index for provider-service queries
bookingSchema.index({ providerEmail: 1, serviceType: 1 });

export default mongoose.model('Booking', bookingSchema);
