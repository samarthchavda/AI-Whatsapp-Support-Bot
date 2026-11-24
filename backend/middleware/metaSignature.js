/**
 * Verifies Meta's X-Hub-Signature-256 on incoming WhatsApp webhook POSTs.
 *
 * Meta signs every webhook body with the app secret (HMAC-SHA256). Without this
 * check anyone who knows the URL can post fake customer messages.
 *
 * Rollout safety: merchants who connected their own Meta app (manual setup) have
 * webhooks signed with *their* app secret. So by default this runs in "monitor"
 * mode: mismatches are logged, not blocked. Set META_WEBHOOK_SIGNATURE_MODE=enforce
 * once the logs are clean. Extra app secrets can be listed (comma separated) in
 * META_WEBHOOK_EXTRA_APP_SECRETS.
 */
const crypto = require('crypto');

function getSecrets() {
  const secrets = [process.env.META_APP_SECRET, process.env.META_CLIENT_SECRET]
    .concat(String(process.env.META_WEBHOOK_EXTRA_APP_SECRETS || '').split(','))
    .map((s) => (s || '').trim())
    .filter(Boolean);
  return [...new Set(secrets)];
}

function isValidSignature(rawBody, header, secrets) {
  if (!rawBody || !header || typeof header !== 'string' || !header.startsWith('sha256=')) return false;
  const provided = Buffer.from(header.slice(7), 'hex');
  if (provided.length !== 32) return false;
  return secrets.some((secret) => {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest();
    return crypto.timingSafeEqual(expected, provided);
  });
}

function verifyMetaSignature(req, res, next) {
  if (req.method !== 'POST') return next();

  const mode = (process.env.META_WEBHOOK_SIGNATURE_MODE || 'monitor').toLowerCase();
  if (mode === 'off') return next();

  const secrets = getSecrets();
  if (!secrets.length) {
    if (mode === 'enforce') {
      console.error('❌ Meta webhook rejected: no app secret configured (META_APP_SECRET / META_CLIENT_SECRET)');
      return res.sendStatus(500);
    }
    return next();
  }

  const header = req.get('x-hub-signature-256');
  if (isValidSignature(req.rawBody, header, secrets)) {
    req.metaSignatureVerified = true;
    return next();
  }

  const reason = header ? 'signature mismatch' : 'missing X-Hub-Signature-256';
  if (mode === 'enforce') {
    console.warn(`🚫 Meta webhook rejected (${reason}) from ${req.ip}`);
    return res.sendStatus(401);
  }
  console.warn(`⚠️  Meta webhook ${reason} from ${req.ip} (monitor mode: allowed). Set META_WEBHOOK_SIGNATURE_MODE=enforce once no legitimate traffic shows this.`);
  return next();
}

module.exports = { verifyMetaSignature, isValidSignature };
