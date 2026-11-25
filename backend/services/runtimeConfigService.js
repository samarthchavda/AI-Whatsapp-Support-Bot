/**
 * Dynamic Runtime Configuration Service
 *
 * Resolves platform integrations with priority:
 *   1. MongoDB GlobalSettings (encrypted at rest for secrets via AES-256)
 *   2. process.env fallback (so existing .env deployments never break)
 *   3. Built-in safe default
 *
 * Uses a 60s TTL in-memory cache across PM2 workers (matching planCache.js)
 * with immediate invalidation on Super Admin updates and safe readyState
 * guards for offline unit tests.
 */
const mongoose = require('mongoose');
const GlobalSettings = require('../models/GlobalSettings');
const { encrypt, decrypt } = require('./whatsappCredentialService');

const PLACEHOLDER_VALUES = new Set([
  'your_gemini_api_key_here',
  'your_openai_api_key_here',
  'sk-test-key',
  'your_resend_api_key',
  'your_email@gmail.com'
]);

const CONFIG_DEFINITIONS = {
  // AI Engine
  gemini_api_key: { env: 'GEMINI_API_KEY', secret: true, group: 'ai' },
  gemini_model: { env: 'GEMINI_MODEL', defaultValue: 'gemini-2.5-flash', group: 'ai' },
  openai_api_key: { env: 'OPENAI_API_KEY', secret: true, group: 'ai' },
  openai_model: { env: 'OPENAI_MODEL', defaultValue: 'gpt-3.5-turbo', group: 'ai' },
  ai_max_output_tokens: { env: 'AI_MAX_OUTPUT_TOKENS', defaultValue: '1000', group: 'ai' },
  ai_max_messages_per_minute: { env: 'AI_MAX_MESSAGES_PER_MINUTE', defaultValue: '10', group: 'ai' },
  high_priority_keywords: {
    env: 'HIGH_PRIORITY_KEYWORDS',
    defaultValue: 'urgent,critical,emergency,refund,complaint,angry,frustrated,unacceptable',
    group: 'ai'
  },
  usd_to_inr_rate: { env: 'USD_TO_INR_RATE', defaultValue: '85', group: 'ai' },

  // Email & SMTP
  smtp_host: { env: 'SMTP_HOST', defaultValue: 'smtp.gmail.com', group: 'smtp' },
  smtp_port: { env: 'SMTP_PORT', defaultValue: '587', group: 'smtp' },
  smtp_secure: { env: 'SMTP_SECURE', defaultValue: 'false', group: 'smtp' },
  smtp_user: { env: 'SMTP_USER', defaultValue: '', group: 'smtp' },
  smtp_pass: { env: 'SMTP_PASS', secret: true, group: 'smtp' },
  resend_api_key: { env: 'RESEND_API_KEY', secret: true, group: 'smtp' },
  from_email: { env: 'FROM_EMAIL', defaultValue: '', group: 'smtp' },
  admin_email: { env: 'ADMIN_EMAIL', defaultValue: '', group: 'smtp' },
  escalation_email: { env: 'ESCALATION_EMAIL', defaultValue: '', group: 'smtp' },

  // Meta & Webhooks
  meta_app_id: { env: 'META_APP_ID', defaultValue: '2242808243238982', group: 'meta' },
  meta_config_id: { env: 'META_CONFIG_ID', defaultValue: '', group: 'meta' },
  meta_client_secret: {
    env: 'META_CLIENT_SECRET',
    extraEnv: ['META_APP_SECRET', 'FACEBOOK_CLIENT_SECRET'],
    secret: true,
    group: 'meta'
  },
  meta_webhook_signature_mode: {
    env: 'META_WEBHOOK_SIGNATURE_MODE',
    defaultValue: 'monitor',
    group: 'meta'
  },
  meta_webhook_extra_app_secrets: {
    env: 'META_WEBHOOK_EXTRA_APP_SECRETS',
    secret: true,
    group: 'meta'
  },
  whatsapp_webhook_verify_token: {
    env: 'WEBHOOK_VERIFY_TOKEN',
    secret: true,
    group: 'meta'
  },
  whatsapp_access_token: {
    env: 'WHATSAPP_ACCESS_TOKEN',
    secret: true,
    group: 'meta'
  },
  whatsapp_phone_number_id: {
    env: 'WHATSAPP_PHONE_NUMBER_ID',
    defaultValue: '',
    group: 'meta'
  },
  whatsapp_business_account_id: {
    env: 'WHATSAPP_BUSINESS_ACCOUNT_ID',
    defaultValue: '',
    group: 'meta'
  },
  webhook_url: {
    env: 'WEBHOOK_URL',
    defaultValue: '',
    group: 'meta'
  },
  webhook_secret_token: {
    env: 'WEBHOOK_SECRET_TOKEN',
    secret: true,
    group: 'meta'
  },
  shopify_webhook_secret: {
    env: 'SHOPIFY_WEBHOOK_SECRET',
    secret: true,
    group: 'meta'
  },
  woocommerce_webhook_secret: {
    env: 'WOOCOMMERCE_WEBHOOK_SECRET',
    secret: true,
    group: 'meta'
  },

  // Payments
  razorpay_key_id: {
    env: 'RAZORPAY_KEY_ID',
    defaultValue: '',
    group: 'payments'
  },
  razorpay_key_secret: {
    env: 'RAZORPAY_KEY_SECRET',
    secret: true,
    group: 'payments'
  }
};

// Reverse lookup by ENV name (e.g. 'GEMINI_API_KEY' -> 'gemini_api_key')
const ENV_TO_KEY = {};
for (const [key, def] of Object.entries(CONFIG_DEFINITIONS)) {
  if (def.env) ENV_TO_KEY[def.env] = key;
  if (Array.isArray(def.extraEnv)) {
    for (const alias of def.extraEnv) {
      if (!ENV_TO_KEY[alias]) ENV_TO_KEY[alias] = key;
    }
  }
}

const LEGACY_KEYS = ['geminiApiFundsAdded', 'webBotEnabled', 'invoice_business_profile'];
const ALL_INTEGRATION_KEYS = [...Object.keys(CONFIG_DEFINITIONS), ...LEGACY_KEYS];

const CACHE_TTL_MS = 60 * 1000;
let cache = new Map();
let lastLoadedAt = 0;
let refreshPromise = null;
let refreshTimer = null;

function isMeaningful(val) {
  if (val === undefined || val === null) return false;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return false;
    if (PLACEHOLDER_VALUES.has(trimmed)) return false;
    return true;
  }
  return true;
}

function getEnvFallback(def) {
  if (!def) return undefined;
  const candidates = [def.env, ...(def.extraEnv || [])].filter(Boolean);
  for (const envName of candidates) {
    const val = process.env[envName];
    if (isMeaningful(val)) {
      return typeof val === 'string' ? val.trim() : val;
    }
  }
  return undefined;
}

function decodeStoredValue(def, storedValue) {
  if (storedValue === undefined || storedValue === null || storedValue === '') return undefined;
  if (def?.secret && typeof storedValue === 'string') {
    try {
      return decrypt(storedValue);
    } catch (_) {
      return storedValue;
    }
  }
  return storedValue;
}

function encodeValueForStorage(key, rawValue) {
  const def = CONFIG_DEFINITIONS[key];
  if (rawValue === undefined || rawValue === null) return rawValue;
  const normalized = typeof rawValue === 'string' ? rawValue.trim() : rawValue;
  if (def?.secret && typeof normalized === 'string' && normalized.length > 0) {
    return encrypt(normalized, false);
  }
  return normalized;
}

function isSensitiveKey(key) {
  if (CONFIG_DEFINITIONS[key]?.secret) return true;
  const sensitiveWords = ['password', 'secret', 'token', 'key', 'credential', 'pass'];
  return sensitiveWords.some((word) => String(key).toLowerCase().includes(word));
}

async function refreshCache(force = false) {
  if (!force && lastLoadedAt && Date.now() - lastLoadedAt < CACHE_TTL_MS) {
    return cache.size;
  }
  if (mongoose.connection.readyState !== 1) {
    return cache.size;
  }
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const docs = await GlobalSettings.find({
        key: { $in: ALL_INTEGRATION_KEYS }
      }).lean();

      const next = new Map();
      for (const doc of docs) {
        if (doc && doc.key) {
          next.set(doc.key, doc.value);
        }
      }
      cache = next;
      lastLoadedAt = Date.now();
    } catch (err) {
      console.error('Runtime config cache refresh failed (keeping previous values):', err.message);
    } finally {
      refreshPromise = null;
    }
    return cache.size;
  })();

  return refreshPromise;
}

function invalidateCache() {
  lastLoadedAt = 0;
}

function startConfigRefresh(intervalMs = CACHE_TTL_MS) {
  refreshCache(true);
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    refreshCache(true);
  }, intervalMs);
  if (typeof refreshTimer.unref === 'function') {
    refreshTimer.unref();
  }
}

function resolveKeyFromCache(keyOrEnv) {
  const canonicalKey = CONFIG_DEFINITIONS[keyOrEnv] ? keyOrEnv : (ENV_TO_KEY[keyOrEnv] || keyOrEnv);
  const def = CONFIG_DEFINITIONS[canonicalKey];

  if (cache.has(canonicalKey)) {
    const decoded = decodeStoredValue(def, cache.get(canonicalKey));
    if (isMeaningful(decoded)) {
      return { value: decoded, source: 'db', key: canonicalKey };
    }
  }

  const envVal = getEnvFallback(def || { env: keyOrEnv });
  if (isMeaningful(envVal)) {
    return { value: envVal, source: 'env', key: canonicalKey };
  }

  if (def && def.defaultValue !== undefined && def.defaultValue !== '') {
    return { value: def.defaultValue, source: 'default', key: canonicalKey };
  }

  return { value: undefined, source: 'unset', key: canonicalKey };
}

function getSync(keyOrEnv, fallback = undefined) {
  const resolved = resolveKeyFromCache(keyOrEnv);
  return resolved.value !== undefined ? resolved.value : fallback;
}

async function get(keyOrEnv, fallback = undefined) {
  await refreshCache(false);
  return getSync(keyOrEnv, fallback);
}

async function getMany(keysOrEnvs = []) {
  await refreshCache(false);
  const result = {};
  for (const item of keysOrEnvs) {
    result[item] = getSync(item);
  }
  return result;
}

/**
 * Build sanitized integration metadata for Super Admin Settings UI.
 * Never returns raw secrets (neither from DB nor from .env).
 */
async function getIntegrationsSnapshot() {
  await refreshCache(true);
  const values = {};
  const sources = {};
  const envDefaults = {};

  for (const [key, def] of Object.entries(CONFIG_DEFINITIONS)) {
    const dbRaw = cache.has(key) ? decodeStoredValue(def, cache.get(key)) : undefined;
    const hasDb = isMeaningful(dbRaw);
    const envVal = getEnvFallback(def);
    const hasEnv = isMeaningful(envVal);

    if (def.secret) {
      values[key] = hasDb ? '******' : '';
      envDefaults[key] = '';
    } else {
      values[key] = hasDb ? String(dbRaw) : '';
      envDefaults[key] = hasEnv ? String(envVal) : (def.defaultValue || '');
    }

    if (hasDb) {
      sources[key] = 'db';
    } else if (hasEnv) {
      sources[key] = 'env';
    } else if (def.defaultValue) {
      sources[key] = 'default';
    } else {
      sources[key] = 'unset';
    }
  }

  return { values, sources, envDefaults };
}

function __setCacheForTests(entries = {}) {
  const next = new Map();
  for (const [k, v] of Object.entries(entries)) {
    next.set(k, v);
  }
  cache = next;
  lastLoadedAt = Date.now();
}

function __resetForTests() {
  cache = new Map();
  lastLoadedAt = 0;
  refreshPromise = null;
}

module.exports = {
  CONFIG_DEFINITIONS,
  ALL_INTEGRATION_KEYS,
  isSensitiveKey,
  isMeaningful,
  encodeValueForStorage,
  decodeStoredValue,
  refreshCache,
  invalidateCache,
  startConfigRefresh,
  get,
  getSync,
  getMany,
  getIntegrationsSnapshot,
  __setCacheForTests,
  __resetForTests
};
