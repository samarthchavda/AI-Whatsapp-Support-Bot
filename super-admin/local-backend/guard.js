// Preloaded into the local backend (node -r guard.js). Stops the process if
// anything tries to connect to a MongoDB that is not on this Mac, whatever any
// .env file says. This is the last line of defence for "nothing reaches production".
const path = require('path');

// The app whose mongoose to guard: the main backend by default, or super-admin/api
const moduleDir = process.env.GUARD_MODULE_DIR || path.resolve(__dirname, '../../backend');
const mongoose = require(require.resolve('mongoose', { paths: [moduleDir] }));
const LOCAL = /^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//;

function check(uri) {
  if (typeof uri !== 'string' || !LOCAL.test(uri)) {
    const shown = String(uri).replace(/\/\/[^@/]*@/, '//***@').replace(/\?.*/, '');
    console.error(`\n🛑 Blocked: the local backend tried to connect to ${shown}. Only a local MongoDB is allowed.\n`);
    process.exit(1);
  }
}

for (const method of ['connect', 'createConnection', 'openUri']) {
  const original = mongoose[method];
  if (typeof original !== 'function') continue;
  mongoose[method] = function guarded(uri, ...rest) {
    check(uri);
    return original.call(this, uri, ...rest);
  };
}

// Block every outbound connection that is not to this Mac: email (SMTP),
// WhatsApp/Meta, Razorpay, Gemini, Shopify, Atlas. Anything that tries gets a
// connection error instead of reaching a real service.
const net = require('net');
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '::ffff:127.0.0.1']);
const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function guardedConnect(...args) {
  const first = args[0];
  const opts = Array.isArray(first) ? first[0] : first;
  let host;
  if (opts && typeof opts === 'object') host = opts.path ? 'unix-socket' : (opts.host || opts.hostname || 'localhost');
  else if (typeof first === 'number' || /^\d+$/.test(String(first))) host = typeof args[1] === 'string' ? args[1] : 'localhost';
  else host = 'unix-socket';
  if (host !== 'unix-socket' && !LOCAL_HOSTS.has(String(host).replace(/^\[|\]$/g, ''))) {
    console.warn(`🛑 Blocked outbound connection to ${host} (local backend is offline by design)`);
    process.nextTick(() => this.destroy(new Error(`Blocked outbound connection to ${host}`)));
    return this;
  }
  return originalConnect.apply(this, args);
};

console.log('🔒 Local guard on: only 127.0.0.1 MongoDB, no outbound network');
