const express = require('express');
const router = express.Router();
const externalWebhookController = require('../controllers/externalWebhookController');
const WebhookAuth = require('../middleware/webhookAuth');

// Rate limiter for webhooks
const webhookRateLimiter = WebhookAuth.createRateLimiter(100, 60000); // 100 requests per minute

/**
 * @route   POST /api/webhooks/external-orders/:source
 * @desc    Receive external order webhooks
 * @access  Protected (requires secret token)
 * @params  source: shopify | woocommerce | custom
 */
router.post(
  '/external-orders/:source',
  webhookRateLimiter,
  WebhookAuth.logRequest,
  WebhookAuth.verifySecretToken,
  externalWebhookController.handleExternalOrder
);

/**
 * @route   POST /api/webhooks/shopify/orders
 * @desc    Shopify-specific webhook endpoint with HMAC verification
 * @access  Protected (HMAC signature)
 */
router.post(
  '/shopify/orders',
  webhookRateLimiter,
  WebhookAuth.logRequest,
  WebhookAuth.verifyShopifyHMAC,
  (req, res) => {
    req.params.source = 'shopify';
    return externalWebhookController.handleExternalOrder(req, res);
  }
);

/**
 * @route   POST /api/webhooks/woocommerce/orders
 * @desc    WooCommerce-specific webhook endpoint with signature verification
 * @access  Protected (WC signature)
 */
router.post(
  '/woocommerce/orders',
  webhookRateLimiter,
  WebhookAuth.logRequest,
  WebhookAuth.verifyWooCommerceSignature,
  (req, res) => {
    req.params.source = 'woocommerce';
    return externalWebhookController.handleExternalOrder(req, res);
  }
);

/**
 * @route   POST /api/webhooks/shopify/fulfillments
 * @desc    Shopify-specific fulfillment webhook endpoint with HMAC verification
 * @access  Protected (HMAC signature)
 */
router.post(
  '/shopify/fulfillments',
  webhookRateLimiter,
  WebhookAuth.logRequest,
  WebhookAuth.verifyShopifyHMAC,
  externalWebhookController.handleShopifyFulfillment
);

/**
 * @route   POST /api/webhooks/external-orders/:source/fulfillment
 * @desc    Receive external order fulfillment updates
 * @access  Protected (requires secret token)
 * @params  source: shopify | woocommerce | custom
 */
router.post(
  '/external-orders/:source/fulfillment',
  webhookRateLimiter,
  WebhookAuth.logRequest,
  WebhookAuth.verifySecretToken,
  externalWebhookController.handleGenericFulfillment
);

/**
 * @route   GET /api/webhooks/logs
 * @desc    Get webhook logs
 * @access  Private (add auth middleware if needed)
 */
router.get('/logs', externalWebhookController.getWebhookLogs);

/**
 * @route   GET /api/webhooks/logs/:id
 * @desc    Get webhook log by ID
 * @access  Private
 */
router.get('/logs/:id', externalWebhookController.getWebhookLogById);

/**
 * @route   GET /api/webhooks/stats
 * @desc    Get webhook statistics
 * @access  Private
 */
router.get('/stats', externalWebhookController.getWebhookStats);

/**
 * @route   POST /api/webhooks/test/:source
 * @desc    Test webhook endpoint (development only)
 * @access  Public (disable in production)
 */
if (process.env.NODE_ENV !== 'production') {
  router.post('/test/:source', externalWebhookController.testWebhook);
}

module.exports = router;
