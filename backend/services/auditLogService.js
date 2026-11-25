const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');

const SENSITIVE_KEY_PARTS = [
  'password',
  'token',
  'secret',
  'apikey',
  'api_key',
  'credentials',
  'auth',
  'pass',
  'privatekey'
];

const SKIP_AUTO_PREFIXES = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/refresh-token',
  '/api/auth/register',
  '/api/webhook',
  '/api/webhooks',
  '/api/traffic'
];

function sanitizeAuditValue(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (depth > 3) return '[TRUNCATED]';
  if (Array.isArray(value)) {
    return value.slice(0, 15).map((item) => sanitizeAuditValue(item, depth + 1));
  }
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const lower = String(k).toLowerCase();
      if (SENSITIVE_KEY_PARTS.some((part) => lower.includes(part))) {
        out[k] = '[REDACTED]';
      } else {
        out[k] = sanitizeAuditValue(v, depth + 1);
      }
    }
    return out;
  }
  if (typeof value === 'string' && value.length > 300) {
    return `${value.slice(0, 300)}...`;
  }
  return value;
}

function inferPanel({ panel, actor, req }) {
  if (panel === 'super_admin' || panel === 'admin' || panel === 'system') {
    return panel;
  }
  const role = actor?.role;
  const url = req?.originalUrl || '';
  if (url.startsWith('/api/super-admin')) {
    return 'super_admin';
  }
  if (role === 'super_admin') {
    return 'super_admin';
  }
  if (role === 'admin') {
    return 'admin';
  }
  return 'system';
}

function buildAutoActionName(method, originalUrl) {
  const cleanPath = String(originalUrl || '')
    .split('?')[0]
    .replace(/^\/api\/?/, '')
    .replace(/\/[0-9a-fA-F]{24}(?=\/|$)/g, '')
    .replace(/\/\d+(?=\/|$)/g, '')
    .replace(/\/+$/g, '');

  const segments = cleanPath
    .split('/')
    .filter(Boolean)
    .filter((seg) => seg !== 'super-admin' && seg !== 'v1');

  const verbMap = {
    POST: 'create',
    PUT: 'update',
    PATCH: 'update',
    DELETE: 'delete'
  };
  const verb = verbMap[String(method).toUpperCase()] || String(method).toLowerCase();
  const resource = segments.slice(0, 3).join('_').replace(/-/g, '_') || 'resource';
  return `${verb}_${resource}`;
}

function extractAutoTarget(req) {
  const body = req?.body && typeof req.body === 'object' ? req.body : {};
  const candidates = [
    req?.params?.id,
    req?.params?.userId,
    req?.params?.planId,
    body.email,
    body.invoiceNumber,
    body.name,
    body.title,
    body.businessName,
    body.customerId,
    body.planName,
    body.code
  ].filter(Boolean);

  if (candidates.length > 0) {
    return String(candidates[0]).slice(0, 140);
  }
  const cleanUrl = String(req?.originalUrl || '').split('?')[0];
  return cleanUrl || null;
}

/**
 * Log a system action to MongoDB and emit via Socket.IO.
 */
async function logAction({ action, actor, panel = null, target = null, details = {}, req = null }) {
  try {
    if (!actor || !actor._id) {
      return null;
    }

    if (req) {
      req._auditLogged = true;
    }

    if (mongoose.connection.readyState !== 1) {
      return null;
    }

    const resolvedPanel = inferPanel({ panel, actor, req });
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null) : null;
    const userAgent = req ? (req.headers['user-agent'] || null) : null;
    const cleanDetails = sanitizeAuditValue(details || {});

    const auditEntry = new AuditLog({
      action,
      panel: resolvedPanel,
      actor: actor._id,
      actorEmail: actor.email || 'system@kwickbot.in',
      actorRole: actor.role || null,
      target,
      details: cleanDetails,
      ipAddress,
      userAgent
    });

    await auditEntry.save();
    console.log(`📋 [AUDIT LOG] [${resolvedPanel}] Actor: ${auditEntry.actorEmail} | Action: ${action} | Target: ${target}`);

    if (global.io) {
      global.io.to('super_admin_room').emit('audit_log', {
        _id: auditEntry._id,
        action,
        panel: resolvedPanel,
        actorEmail: auditEntry.actorEmail,
        actorRole: auditEntry.actorRole,
        target,
        details: cleanDetails,
        ipAddress,
        createdAt: auditEntry.createdAt
      });
    }

    return auditEntry;
  } catch (error) {
    console.error('❌ Failed to save audit log:', error);
    return null;
  }
}

/**
 * Global Express middleware: automatically records every authenticated mutation
 * (POST, PUT, PATCH, DELETE) in both Admin and Super Admin panels if the route
 * handler did not already call logAction().
 */
function createAuditMiddleware() {
  return (req, res, next) => {
    const method = String(req.method || '').toUpperCase();
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next();
    }

    const path = String(req.originalUrl || '').split('?')[0];
    if (SKIP_AUTO_PREFIXES.some((prefix) => path.startsWith(prefix))) {
      return next();
    }

    res.on('finish', () => {
      if (req._auditLogged) return;
      if (!req.admin || !req.admin._id) return;
      if (res.statusCode >= 400) return;

      const action = buildAutoActionName(method, req.originalUrl);
      const target = extractAutoTarget(req);
      const bodyKeys = req.body && typeof req.body === 'object' ? Object.keys(req.body).slice(0, 20) : [];

      logAction({
        action,
        actor: req.admin,
        target,
        details: {
          method,
          path,
          statusCode: res.statusCode,
          ...(bodyKeys.length > 0 ? { fields: bodyKeys } : {}),
          ...(req.body && typeof req.body === 'object' ? { payload: sanitizeAuditValue(req.body) } : {})
        },
        req
      }).catch(() => {});
    });

    return next();
  };
}

module.exports = {
  logAction,
  createAuditMiddleware,
  sanitizeAuditValue,
  inferPanel
};
