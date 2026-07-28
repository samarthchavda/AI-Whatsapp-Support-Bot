const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';

// Generate a secure 32-byte key from the environment variable or fallback
const getEncryptionKey = () => {
  const key = process.env.CREDENTIALS_ENCRYPTION_KEY || process.env.JWT_SECRET || 'fallback-secret-key-kwickbot-32';
  // Ensure the key is exactly 32 bytes by hashing it using SHA-256
  return crypto.createHash('sha256').update(key).digest();
};

/**
 * Encrypts a plaintext string using AES-256-CBC.
 * @param {string} text - The plaintext to encrypt.
 * @param {boolean} [deterministic=false] - If true, uses a derived deterministic IV to allow search matching.
 * @returns {string|null} The encrypted string in the format "iv:ciphertext".
 */
const encrypt = (text, deterministic = false) => {
  if (text === null || text === undefined || text === '') return null;
  
  try {
    const key = getEncryptionKey();
    let iv;

    if (deterministic) {
      // Derive a deterministic 16-byte IV using HMAC-SHA256 of the value and the key
      const hash = crypto.createHmac('sha256', key).update(String(text)).digest();
      iv = hash.subarray(0, 16);
    } else {
      // Standard secure randomized IV
      iv = crypto.randomBytes(16);
    }

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(String(text), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  } catch (err) {
    console.error('❌ Encryption error:', err.message);
    return null;
  }
};

/**
 * Decrypts an encrypted string in the format "iv:ciphertext" using AES-256-CBC.
 * Automatically detects and returns legacy unencrypted data to maintain compatibility.
 * @param {string} encryptedText - The encrypted string.
 * @returns {string|null} The decrypted plaintext string.
 */
const decrypt = (encryptedText) => {
  if (encryptedText === null || encryptedText === undefined || encryptedText === '') return null;

  try {
    const parts = String(encryptedText).split(':');
    
    // Legacy support: If the data is not in "iv:ciphertext" format, it is unencrypted
    if (parts.length !== 2) {
      return encryptedText;
    }

    const key = getEncryptionKey();
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    // Safety validation for IV size
    if (iv.length !== 16) {
      return encryptedText; // Fallback to raw if IV format is corrupt
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    // If decryption fails, return the raw value as fallback to prevent app crashes
    console.warn('⚠️ Decryption failed or input was unencrypted legacy data:', err.message);
    return encryptedText;
  }
};

/**
 * Encrypts a credential object for an admin
 */
const encryptAdminCredentials = (creds) => {
  return {
    whatsappAccessToken: encrypt(creds.whatsappAccessToken, false), // Randomized
    whatsappPhoneNumberId: encrypt(creds.whatsappPhoneNumberId, true), // Deterministic lookup
    whatsappBusinessAccountId: encrypt(creds.whatsappBusinessAccountId, true), // Deterministic lookup
    whatsappDisplayPhoneNumber: encrypt(creds.whatsappDisplayPhoneNumber, false),
    businessName: encrypt(creds.businessName, false),
    whatsappAppId: encrypt(creds.whatsappAppId, false)
  };
};

module.exports = {
  encrypt,
  decrypt,
  encryptAdminCredentials
};
