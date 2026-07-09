const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const integrationController = require('../controllers/merchant/integrationController');

// All routes require authentication
router.use(verifyToken);

// Get all integrations for current admin
router.get('/', integrationController.getIntegrations);

// Create new integration
router.post('/', integrationController.createIntegration);

// Update integration
router.put('/:id', integrationController.updateIntegration);

// Delete integration
router.delete('/:id', integrationController.deleteIntegration);

// Regenerate webhook secret
router.post('/:id/regenerate-secret', integrationController.regenerateWebhookSecret);

// Test integration connection
router.post('/:id/test', integrationController.testIntegration);

// Manually sync Shopify orders for an integration
router.post('/:id/sync-shopify-orders', integrationController.syncShopifyOrders);

// Manually sync WooCommerce orders for an integration
router.post('/:id/sync-woocommerce-orders', integrationController.syncWooCommerceOrders);

module.exports = router;
