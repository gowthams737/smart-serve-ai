// Server-Sent Events (SSE) notification connection and broadcast manager
const clients = new Map(); // normalized email -> Set of res objects

/**
 * Register an active SSE response stream for a user email.
 * @param {string} email - Authenticated user email
 * @param {object} res - Express response stream
 */
export const registerSSEClient = (email, res) => {
  const normEmail = (email || '').toLowerCase().trim();
  if (!normEmail) return;

  if (!clients.has(normEmail)) {
    clients.set(normEmail, new Set());
  }
  clients.get(normEmail).add(res);

  res.on('close', () => {
    const userClients = clients.get(normEmail);
    if (userClients) {
      userClients.delete(res);
      if (userClients.size === 0) {
        clients.delete(normEmail);
      }
    }
  });
};

/**
 * Broadcast a persisted notification to connected SSE clients.
 * Matches recipientEmail, or broadcasts to all clients if recipientRole is 'All' or matches role.
 * @param {object} notification - Mongoose Notification document or POJO
 */
export const broadcastNotification = (notification) => {
  if (!notification) return;

  const notifObj = typeof notification.toObject === 'function' ? notification.toObject() : notification;
  const payload = JSON.stringify(notifObj);
  const sseData = `data: ${payload}\n\n`;

  const targetEmail = (notifObj.recipientEmail || '').toLowerCase().trim();
  const targetRole = notifObj.recipientRole || '';

  // Direct recipient email delivery
  if (targetEmail && clients.has(targetEmail)) {
    const userClients = clients.get(targetEmail);
    for (const client of userClients) {
      try {
        client.write(sseData);
      } catch (err) {
        console.error('SSE client write error:', err);
      }
    }
  }

  // Broad broadcasts (e.g. role 'All' or admin notices)
  if (targetRole === 'All') {
    for (const [, userClients] of clients.entries()) {
      for (const client of userClients) {
        try {
          client.write(sseData);
        } catch (err) {
          console.error('SSE broad write error:', err);
        }
      }
    }
  }
};
