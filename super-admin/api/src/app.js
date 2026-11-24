const express = require('express');
const config = require('./config');
const requireSuperAdmin = require('./middleware/requireSuperAdmin');
const requireInternalKey = require('./middleware/requireInternalKey');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '200kb' }));

  const base = config.basePath;
  app.get(`${base}/health`, (req, res) => res.json({ success: true, service: 'super-admin-api' }));
  app.use(`${base}/public`, (req, res, next) => {
    // The website may be on another origin; this data is public and read-only
    res.set('Access-Control-Allow-Origin', '*');
    next();
  }, require('./routes/public'));
  app.use(`${base}/internal`, requireInternalKey, require('./routes/internal'));
  app.use(`${base}/plans`, requireSuperAdmin, require('./routes/plans'));
  app.use(`${base}/coupons`, requireSuperAdmin, require('./routes/coupons'));

  app.use((req, res) => res.status(404).json({ success: false, error: 'Not found' }));
  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    console.error('super-admin-api error:', error.message);
    const status = error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500;
    res.status(status).json({ success: false, error: status === 400 ? error.message : 'Something went wrong' });
  });
  return app;
}

module.exports = { createApp };
