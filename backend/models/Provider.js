import mongoose from 'mongoose';

const providerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, default: '' },
  email: { type: String, default: '', lowercase: true, trim: true },
  phone: { type: String, default: '', trim: true },
  category: { type: String, required: true },
  experience: { type: Number, required: true },
  rating: { type: Number, default: 0 },
  reviewsCount: { type: Number, default: 0 },
  availability: { type: String, default: 'Available Today' }, // e.g. 'Available Today', 'Weekend Only'
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  city: { type: String, default: 'Coimbatore' },
  state: { type: String, default: 'Tamil Nadu' },
  pincode: { type: String, default: '641002' },
  address: { type: String, default: '' },
  languages: { type: String, default: 'Tamil, English' },
  about: { type: String, default: '' },
  bio: { type: String, default: '' },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], default: 'Male' },
  age: { type: Number, default: 25 },
  completedJobs: { type: Number, default: 0 },
  earnings: { type: Number, default: 0 },
  workingHours: {
    start: { type: String, default: '09:00' },
    end: { type: String, default: '18:00' }
  },
  workingDays: { type: [String], default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
  holidays: [{ type: String }],
  blockedDates: [{ type: String }],
  isOnline: { type: Boolean, default: true },
  photo: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  skills: [{ type: String }],
  rate: { type: Number, default: 0 },
  hourlyRate: { type: Number, default: 0 },
  pricingUnit: { type: String, default: 'Per Visit' },
  pricing: [{
    service: { type: String },
    price: { type: Number },
    unit: { type: String, default: 'Per Visit' }
  }]
}, { timestamps: true });

export default mongoose.model('Provider', providerSchema);
