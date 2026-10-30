/**
 * Normalizes any image URL (e.g. http://localhost:5000/uploads/xyz.png,
 * http://127.0.0.1:5000/uploads/xyz.png, or /uploads/xyz.png)
 * into a clean relative path (/uploads/xyz.png) so it resolves directly
 * from the active host origin in both local development and production.
 */
export const cleanImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Reject transient blob: URLs
  if (trimmed.startsWith('blob:')) return '';

  // Reject hardcoded sample Unsplash placeholders
  if (trimmed.includes('images.unsplash.com/photo-1566492031773-4f4e44671857')) {
    return '';
  }

  // If URL references /uploads/, extract filename and return relative /uploads/ path
  if (trimmed.includes('/uploads/')) {
    const parts = trimmed.split('/uploads/');
    const fileName = parts[parts.length - 1].split('?')[0];
    if (!fileName) return '';
    return `/uploads/${fileName}`;
  }

  return trimmed;
};
