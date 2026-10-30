import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  time: { type: String, default: 'Just now' },
  type: { type: String, default: 'system' }, // registration, complaint, booking, system, new_booking, new_review, etc.
  read: { type: Boolean, default: false },
  recipientRole: { type: String, enum: ['All', 'Customer', 'Provider', 'Admin'], default: 'Admin' },
  recipientEmail: { type: String, lowercase: true, trim: true },
  bookingId: { type: String },
  targetRoute: { type: String },
  relatedId: { type: String },
  dedupKey: { type: String, index: true, sparse: true }
}, { timestamps: true });

export default mongoose.model('Notification', notificationSchema);
