import mongoose from 'mongoose';

const serviceCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  icon: { type: String, default: '⚡' },
  image: { type: String, default: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500' },
  startingPrice: { type: Number, required: true },
  rating: { type: Number, default: 4.5 },
  duration: { type: String, default: 'Per Visit' },
  description: { type: String, default: '' },
  color: { type: String, default: '#3b82f6' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  bookingsCount: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('ServiceCategory', serviceCategorySchema);
