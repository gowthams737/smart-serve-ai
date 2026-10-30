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
 * Validates and sanitizes an image URL.
 * If the image points to a local /uploads/ URL that is missing from disk,
 * returns an empty string '' (never a random placeholder or broken URL).
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
    const publicUrl = `http://localhost:5000/uploads/${uniqueName}`;
    return publicUrl;
  } catch (err) {
    console.error('Error saving base64 image to disk:', err);
    return '';
  }
};
