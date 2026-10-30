/**
 * Resolves the destination route for a given notification.
 * Routes each notification type to its exact destination based on recipient role:
 * Customer:
 * - Booking events -> /customer/bookings-and-saved?tab=bookings&id=<bookingId>
 * - Completed service / review -> /customer/bookings-and-saved?tab=bookings&rate=true
 * - Service events -> /customer/services
 * Provider:
 * - Booking / new_booking -> /provider/bookings?id=<bookingId>
 * - Availability / online / offline -> /provider/availability
 * - Review / new_review -> /provider/reviews
 * - Service / service_created -> /provider/services
 * @param {object} notif - Notification document or object
 * @param {string} [contextRole] - Optional fallback role ('Customer' or 'Provider')
 * @returns {string} - Destination URL path
 */
export const getNotificationDestination = (notif, contextRole) => {
  if (!notif) {
    return contextRole === 'Customer' ? '/customer/dashboard' : '/provider/dashboard';
  }

  // 1. Explicit targetRoute stored on notification
  if (notif.targetRoute && typeof notif.targetRoute === 'string') {
    return notif.targetRoute;
  }

  const role = notif.recipientRole || contextRole || 'Provider';
  const type = String(notif.type || '').toLowerCase();
  const title = String(notif.title || '').toLowerCase();
  const message = String(notif.message || '').toLowerCase();
  const bookingId = notif.bookingId;

  // Extract Booking ID from message text e.g. "Booking #01" or "Booking #671..."
  const bookingIdMatch = message.match(/booking\s*#?\s*([A-Za-z0-9_-]+)/i);
  const resolvedBookingId = bookingId || (bookingIdMatch ? bookingIdMatch[1] : null);

  // ── Customer Destinations ──
  if (role === 'Customer') {
    if (type.includes('completed') || title.includes('completed') || message.includes('review')) {
      return `/customer/bookings-and-saved?tab=bookings&rate=true${resolvedBookingId ? `&id=${encodeURIComponent(resolvedBookingId)}` : ''}`;
    }
    if (type.includes('booking') || title.includes('booking') || message.includes('booking')) {
      return `/customer/bookings-and-saved?tab=bookings${resolvedBookingId ? `&id=${encodeURIComponent(resolvedBookingId)}` : ''}`;
    }
    if (type.includes('service') || title.includes('service') || message.includes('service')) {
      return '/customer/services';
    }
    return '/customer/dashboard';
  }

  // ── Provider Destinations ──
  if (resolvedBookingId) {
    return `/provider/bookings?id=${encodeURIComponent(resolvedBookingId)}`;
  }

  if (type.includes('booking') || title.includes('booking') || message.includes('booking')) {
    return '/provider/bookings';
  }

  if (
    type.includes('availability') ||
    title.includes('online') ||
    title.includes('offline') ||
    title.includes('availability') ||
    title.includes('status: online') ||
    title.includes('status: offline') ||
    message.includes('working hours') ||
    message.includes('holiday')
  ) {
    return '/provider/availability';
  }

  if (type.includes('review') || title.includes('review') || message.includes('review')) {
    return '/provider/reviews';
  }

  if (type.includes('service') || title.includes('service')) {
    return '/provider/services';
  }

  return '/provider/dashboard';
};
