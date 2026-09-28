const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

/**
 * Get or derive a 32-byte (256-bit) encryption key
 */
function getMasterKey() {
  const secret = process.env.ENCRYPTION_KEY || process.env.JWT_ACCESS_SECRET || 'kwickbot_secure_integration_key_fallback_32b!';
  // Hash to ensure exact 32 bytes
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt arbitrary plain text or JSON object
 * @param {string|object} data 
 * @returns {string} Encrypted string in format enc:v1:<iv>:<authTag>:<cipherText>
 */
function encryptCredential(data) {
  if (data === null || data === undefined) return null;

  try {
    const text = typeof data === 'object' ? JSON.stringify(data) : String(data);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getMasterKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let cipherText = cipher.update(text, 'utf8', 'hex');
    cipherText += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return `enc:v1:${iv.toString('hex')}:${authTag.toString('hex')}:${cipherText}`;
  } catch (err) {
    throw new Error('Encryption operation failed');
  }
}

/**
 * Decrypt serialized encrypted string
 * @param {string} encryptedPayload 
 * @returns {string|object} Decrypted string or parsed object
 */
function decryptCredential(encryptedPayload) {
  if (!encryptedPayload) return null;

  try {
    // If not in encrypted format (e.g. legacy plain text), return safely or handle
    if (typeof encryptedPayload === 'string' && !encryptedPayload.startsWith('enc:v1:')) {
      return encryptedPayload;
    }

    const parts = encryptedPayload.split(':');
    if (parts.length !== 5 || parts[0] !== 'enc' || parts[1] !== 'v1') {
      throw new Error('Invalid encrypted payload format');
    }

    const iv = Buffer.from(parts[2], 'hex');
    const authTag = Buffer.from(parts[3], 'hex');
    const cipherText = parts[4];

    const key = getMasterKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  } catch (err) {
    throw new Error('Decryption operation failed');
  }
}

/**
 * Generate cryptographically secure random token / secret
 */
function generateRandomSecret(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Sign payload using HMAC-SHA256 for webhook signatures
 */
function generateHmacSignature(payload, secret) {
  const content = typeof payload === 'object' ? JSON.stringify(payload) : String(payload);
  return crypto.createHmac('sha256', secret).update(content).digest('hex');
}

module.exports = {
  encryptCredential,
  decryptCredential,
  generateRandomSecret,
  generateHmacSignature
};
