/**
 * Helper to get the correct frontend base URL from a comma-separated list
 * @param {Object} req - Express request object
 * @returns {string} - The resolved frontend URL
 */
exports.getFrontendUrl = (req) => {
  if (!process.env.FRONTEND_URL) return 'http://localhost:3000';
  const urls = process.env.FRONTEND_URL.split(',').map(u => u.trim());
  if (urls.length === 1) return urls[0];

  // Try to find matching origin
  let clientOrigin = req ? req.get('origin') : null;
  if (!clientOrigin && req && req.get('referer')) {
    try {
      clientOrigin = new URL(req.get('referer')).origin;
    } catch (e) {
      // ignore invalid URL referers
    }
  }

  if (clientOrigin && urls.includes(clientOrigin)) {
    return clientOrigin;
  }

  // Fallback: look for the first HTTPS production URL in the list
  const productionUrl = urls.find(u => u.startsWith('https://'));
  return productionUrl || urls[0];
};
