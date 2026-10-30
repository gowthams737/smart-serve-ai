import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'dns';
import { fileURLToPath } from 'url';

// Ensure DNS resolution succeeds when local loopback DNS is configured
try {
  const currentServers = dns.getServers();
  if (currentServers.includes('127.0.0.1') || currentServers.length === 0) {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  }
} catch (e) {}

// Import Routes
import authRoutes from './routes/authRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import providerRoutes from './routes/providerRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import { normalizeDatabaseImages } from './utils/imageHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config(); // fallback to cwd .env if present

const app = express();
const PORT = process.env.PORT || 5000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartserve';

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/provider', providerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);

// Catch-all 404 handler for unmatched API routes (prevents SPA fallback from masking API errors)
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Serve frontend static build assets
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA fallback for client-side routing (serves index.html for non-API/non-upload GET requests)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Database Connection
mongoose.connect(mongoUri)
  .then(async () => {
    console.log('Connected to MongoDB database successfully.');
    try {
      await normalizeDatabaseImages(mongoose);
    } catch (e) {
      console.warn('Initial image normalization skipped:', e.message);
    }
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database connection error:', err);
  });
