// Dev server only: send the new super admin API calls (/sa-api) to
// super-admin/api on port 5003. The main API keeps using the "proxy" field
// and REACT_APP_API_URL as before.
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  app.use(
    '/sa-api',
    createProxyMiddleware({
      target: process.env.SA_API_PROXY || 'http://localhost:5003',
      changeOrigin: true
    })
  );
};
