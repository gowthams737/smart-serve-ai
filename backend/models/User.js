import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  role: { type: String, enum: ['Customer', 'Provider', 'Admin'], required: true },
  password: { type: String, default: '' },
  profileImage: { type: String, default: '' },
  joinedDate: { type: String, default: () => new Date().toISOString().split('T')[0] }
}, { timestamps: true });

export default mongoose.model('User', userSchema);
