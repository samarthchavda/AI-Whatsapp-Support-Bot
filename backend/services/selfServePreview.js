const TEST_BROADCAST_LIMIT = 2;
const TEST_RECIPIENT_LIMIT = 5;

function isSelfServePreview(admin, now = new Date()) {
  if (!admin || admin.role === 'super_admin' || admin.selfSignupTrial !== true) return false;
  return admin.subscriptionStatus !== 'active' || Boolean(
    admin.subscriptionEndDate && new Date(admin.subscriptionEndDate) <= now
  );
}

const PREVIEW_WRITE_PATHS = {
  PUT: new Set(['/api/auth/profile']),
  POST: new Set([
    '/api/auth/change-password',
    '/api/auth/verify-coupon',
    '/api/auth/razorpay/create-order',
    '/api/auth/razorpay/verify-payment',
    '/api/webhook/embedded-signup',
    '/api/webhook/connect',
    '/api/webhook/disconnect',
    '/api/webhook/settings',
    '/api/whatsapp/templates',
    '/api/whatsapp/templates/sync',
    '/api/broadcasts'
  ])
};

function previewWriteAllowed(method, path) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true;
  if (PREVIEW_WRITE_PATHS[method]?.has(path)) return true;
  return method === 'POST' && /^\/api\/broadcasts\/[^/]+\/send$/.test(path);
}

module.exports = { TEST_BROADCAST_LIMIT, TEST_RECIPIENT_LIMIT, isSelfServePreview, previewWriteAllowed };
