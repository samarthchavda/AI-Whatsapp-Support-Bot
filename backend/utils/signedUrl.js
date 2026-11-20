const crypto = require('crypto');

/**
 * Short-lived HMAC-signed links for private files that an external party
 * (e.g. Meta's WhatsApp servers fetching an invoice PDF) must download
 * without a user session.
 */
function getSigningSecret() {
  const secret = process.env.FILE_SIGNING_SECRET || process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error('FILE_SIGNING_SECRET (or JWT_ACCESS_SECRET) environment variable is missing');
  }
  return secret;
}

function computeSignature(resource, expiresAt) {
  return crypto
    .createHmac('sha256', getSigningSecret())
    .update(`${resource}:${expiresAt}`)
    .digest('hex');
}

/**
 * @param {string} resource - Identifier being signed (e.g. "invoice:INV-1001")
 * @param {number} ttlSeconds - Lifetime of the link
 * @returns {{ exp: number, sig: string }}
 */
function signResource(resource, ttlSeconds = 24 * 60 * 60) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return { exp, sig: computeSignature(resource, exp) };
}

function verifyResourceSignature(resource, exp, sig) {
  const expiresAt = parseInt(exp, 10);
  if (!expiresAt || !sig || typeof sig !== 'string') return false;
  if (expiresAt < Math.floor(Date.now() / 1000)) return false;

  const expected = Buffer.from(computeSignature(resource, expiresAt), 'hex');
  const provided = Buffer.from(sig, 'hex');
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}

module.exports = { signResource, verifyResourceSignature };
