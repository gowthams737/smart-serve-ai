import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  id: { type: String, default: () => 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7) },
  sender: { type: String, enum: ['user', 'ai'], required: true },
  text: { type: String, default: '' },
  attachments: [{
    type: { type: String, enum: ['image', 'file'] },
    name: { type: String },
    mimeType: { type: String },
    size: { type: Number },
    previewUrl: { type: String }
  }],
  card: {
    title: { type: String },
    category: { type: String },
    rating: { type: Number },
    price: { type: String },
    location: { type: String },
    photo: { type: String },
    providerId: { type: String },
    matchReason: { type: String }
  },
  suggestedQuestions: [{ type: String }],
  timestamp: { type: String, default: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const chatConversationSchema = new mongoose.Schema({
  customerEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
  title: { type: String, default: 'SmartServe AI Conversation' },
  messages: [messageSchema],
  lastActivity: { type: Date, default: Date.now }
}, { timestamps: true });

export default mongoose.model('ChatConversation', chatConversationSchema);
