const express = require('express');
const router = express.Router();
const developerController = require('../controllers/developer/developerController');
const { verifyToken } = require('../middleware/auth');
const { requirePage, requirePermission, enforceUsageLimit } = require('../middleware/rbac');
const { CANONICAL_PAGES, CANONICAL_PERMISSIONS } = require('../constants/permissions');

// All developer routes require JWT authentication
router.use(verifyToken);

// 1. Webhook Endpoints
router.get(
  '/webhooks',
  requirePage(CANONICAL_PAGES.WEBHOOK_CONFIGURATION),
  requirePermission(CANONICAL_PERMISSIONS.WEBHOOK_CONFIGURATION_VIEW),
  developerController.getWebhooks
);

router.post(
  '/webhooks',
  requirePage(CANONICAL_PAGES.WEBHOOK_CONFIGURATION),
  requirePermission(CANONICAL_PERMISSIONS.WEBHOOK_CONFIGURATION_MANAGE),
  developerController.createWebhook
);

router.put(
  '/webhooks/:id',
  requirePage(CANONICAL_PAGES.WEBHOOK_CONFIGURATION),
  requirePermission(CANONICAL_PERMISSIONS.WEBHOOK_CONFIGURATION_MANAGE),
  developerController.updateWebhook
);

router.post(
  '/webhooks/:id/rotate-secret',
  requirePage(CANONICAL_PAGES.WEBHOOK_CONFIGURATION),
  requirePermission(CANONICAL_PERMISSIONS.WEBHOOK_CONFIGURATION_MANAGE),
  developerController.rotateWebhookSecret
);

router.post(
  '/webhooks/:id/test',
  requirePage(CANONICAL_PAGES.WEBHOOK_CONFIGURATION),
  requirePermission(CANONICAL_PERMISSIONS.WEBHOOK_CONFIGURATION_MANAGE),
  developerController.testWebhook
);

router.delete(
  '/webhooks/:id',
  requirePage(CANONICAL_PAGES.WEBHOOK_CONFIGURATION),
  requirePermission(CANONICAL_PERMISSIONS.WEBHOOK_CONFIGURATION_MANAGE),
  developerController.deleteWebhook
);

// 2. API Usage & Metrics
router.get(
  '/usage',
  requirePage(CANONICAL_PAGES.API_USAGE),
  requirePermission(CANONICAL_PERMISSIONS.API_USAGE_VIEW),
  developerController.getUsage
);

router.get(
  '/logs',
  requirePage(CANONICAL_PAGES.API_LOGS),
  requirePermission(CANONICAL_PERMISSIONS.API_LOGS_VIEW),
  developerController.getLogs
);

router.get(
  '/failed-webhooks',
  requirePage(CANONICAL_PAGES.FAILED_WEBHOOKS),
  requirePermission(CANONICAL_PERMISSIONS.FAILED_WEBHOOKS_VIEW),
  developerController.getFailedWebhooks
);

router.post(
  '/failed-webhooks/:id/retry',
  requirePermission(CANONICAL_PERMISSIONS.FAILED_WEBHOOKS_RETRY),
  developerController.retryFailedWebhook
);

module.exports = router;
