import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, default: '' },
  email: { type: String, default: '', lowercase: true, trim: true },
  phone: { type: String, default: '', trim: true },
  photo: { type: String, default: '' },
  city: { type: String, default: 'Coimbatore' },
  address: { type: String, required: true },
  state: { type: String, default: 'Tamil Nadu' },
  pincode: { type: String, default: '641002' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  bookingsCount: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  savedProviders: [{ type: String }], // Stores provider IDs that this customer saved
  savedAddresses: [{
    id: { type: String },
    label: { type: String },
    address: { type: String }
  }]
}, { timestamps: true });

export default mongoose.model('Customer', customerSchema);
