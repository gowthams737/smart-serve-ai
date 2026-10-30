import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const uploadsDir = path.resolve(__dirname, '..', 'uploads');

/**
 * Checks if a stored uploads URL corresponds to an existing file on disk.
 * Returns false for missing or deleted files.
 */
export const uploadedFileExists = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') return false;
  if (!imageUrl.includes('/uploads/')) return false;

  const parts = imageUrl.split('/uploads/');
  if (parts.length < 2) return false;
  const fileName = parts[1].split('?')[0];
  const filePath = path.join(uploadsDir, fileName);
  return fs.existsSync(filePath);
};

/**
 * Normalizes any image URL (e.g. http://localhost:5000/uploads/xyz.png,
 * http://127.0.0.1:5000/uploads/xyz.png, or /uploads/xyz.png)
 * into a clean relative /uploads/xyz.png path so images always load from the active host origin.
 */
export const normalizeImageUrl = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') return '';
  const trimmed = imageUrl.trim();
  if (!trimmed) return '';

  // Reject transient blob: URLs
  if (trimmed.startsWith('blob:')) return '';

  // Reject hardcoded sample Unsplash placeholders
  if (trimmed.includes('images.unsplash.com/photo-1566492031773-4f4e44671857')) {
    return '';
  }

  // If it's a local /uploads/ URL, extract filename and return clean relative path
  if (trimmed.includes('/uploads/')) {
    const parts = trimmed.split('/uploads/');
    const fileName = parts[parts.length - 1].split('?')[0];
    if (!fileName) return '';
    return `/uploads/${fileName}`;
  }

  return trimmed;
};

/**
 * Validates and sanitizes an image URL.
 * If the image points to a local /uploads/ URL that is missing from disk,
 * returns an empty string '' (never a random placeholder or broken URL).
 * If valid, returns the clean normalized relative URL.
 */
export const sanitizeImageUrl = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') return '';
  const trimmed = imageUrl.trim();
  if (!trimmed) return '';

  // Reject transient blob: URLs
  if (trimmed.startsWith('blob:')) return '';

  // Reject hardcoded sample Unsplash placeholders
  if (trimmed.includes('images.unsplash.com/photo-1566492031773-4f4e44671857')) {
    return '';
  }

  // If it's a local /uploads/ URL, verify the file exists on disk
  if (trimmed.includes('/uploads/')) {
    if (!uploadedFileExists(trimmed)) {
      console.warn(`Local upload file missing on disk for: ${trimmed}`);
      return '';
    }
    return normalizeImageUrl(trimmed);
  }

  return trimmed;
};

/**
 * Saves a base64 Data URI to a permanent file on disk in backend/uploads/
 * and returns the static public URL (e.g. http://localhost:5000/uploads/profile_...).
 * If already a valid URL or empty, returns the clean URL or empty string.
 * Rejects temporary blob: URLs and invalid/failed image data.
 */
export const saveImageIfBase64 = (imageString) => {
  if (!imageString || typeof imageString !== 'string') {
    return '';
  }

  const trimmed = imageString.trim();
  if (!trimmed) {
    return '';
  }

  // Reject temporary blob URLs
  if (trimmed.startsWith('blob:')) {
    console.warn('Rejected transient blob: URL for permanent storage.');
    return '';
  }

  // If already a persisted URL (http:// or https:// or /uploads/)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/uploads/')) {
    return sanitizeImageUrl(trimmed);
  }

  // Check if Base64 Data URI
  const matches = trimmed.match(/^data:image\/([a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!matches) {
    return '';
  }

  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    let ext = matches[1].toLowerCase();
    if (ext === 'jpeg') ext = 'jpg';
    if (ext === 'svg+xml') ext = 'svg';

    // Allowed image extensions
    const allowedExts = ['jpg', 'png', 'webp', 'gif', 'svg'];
    if (!allowedExts.includes(ext)) {
      ext = 'png';
    }

    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Reject empty buffer or oversized (>10MB)
    if (!buffer || buffer.length === 0) {
      console.warn('Empty image buffer received, skipping save.');
      return '';
    }
    if (buffer.length > 10 * 1024 * 1024) {
      console.warn('Uploaded image exceeds 10MB limit, skipping file save.');
      return '';
    }

    const uniqueName = `profile_${Date.now()}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const filePath = path.join(uploadsDir, uniqueName);

    fs.writeFileSync(filePath, buffer);
    const publicUrl = `/uploads/${uniqueName}`;
    return publicUrl;
  } catch (err) {
    console.error('Error saving base64 image to disk:', err);
    return '';
  }
};

/**
 * One-time non-destructive startup helper that migrates any legacy 'http://localhost:5000/uploads/'
 * or localhost URLs in MongoDB (providers, users, customers, services) to clean relative '/uploads/' paths.
 */
export const normalizeDatabaseImages = async (mongooseInstance) => {
  try {
    const db = mongooseInstance?.connection?.db;
    if (!db) return;

    const localhostRegex = /http:\/\/localhost:\d+\/uploads\//;

    // 1. Providers
    const providersWithLocalhost = await db.collection('providers').find({ photo: { $regex: localhostRegex } }).toArray();
    for (const p of providersWithLocalhost) {
      const cleanPhoto = normalizeImageUrl(p.photo);
      await db.collection('providers').updateOne({ _id: p._id }, { $set: { photo: cleanPhoto } });
    }

    // 2. Users
    const usersWithLocalhost = await db.collection('users').find({ profileImage: { $regex: localhostRegex } }).toArray();
    for (const u of usersWithLocalhost) {
      const cleanImg = normalizeImageUrl(u.profileImage);
      await db.collection('users').updateOne({ _id: u._id }, { $set: { profileImage: cleanImg } });
    }

    // 3. Customers
    const customersWithLocalhost = await db.collection('customers').find({ photo: { $regex: localhostRegex } }).toArray();
    for (const c of customersWithLocalhost) {
      const cleanPhoto = normalizeImageUrl(c.photo);
      await db.collection('customers').updateOne({ _id: c._id }, { $set: { photo: cleanPhoto } });
    }

    // 4. Services
    const servicesWithLocalhost = await db.collection('services').find({ image: { $regex: localhostRegex } }).toArray();
    for (const s of servicesWithLocalhost) {
      const cleanImage = normalizeImageUrl(s.image);
      await db.collection('services').updateOne({ _id: s._id }, { $set: { image: cleanImage } });
    }

    if (providersWithLocalhost.length > 0 || usersWithLocalhost.length > 0) {
      console.log(`✓ Normalized legacy localhost image URLs in database (${providersWithLocalhost.length} providers, ${usersWithLocalhost.length} users updated).`);
    }
  } catch (err) {
    console.warn('normalizeDatabaseImages warning:', err.message);
  }
};
