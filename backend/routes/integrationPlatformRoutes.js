const express = require('express');
const router = express.Router();
const integrationPlatformController = require('../controllers/integrationPlatform/integrationPlatformController');
const { verifyToken } = require('../middleware/auth');
const { requirePage, requirePermission, enforceUsageLimit } = require('../middleware/rbac');
const { CANONICAL_PAGES, CANONICAL_PERMISSIONS } = require('../constants/permissions');

// All integration platform routes require JWT authentication
router.use(verifyToken);

// 1. Overview Dashboard
router.get(
  '/overview',
  requirePage(CANONICAL_PAGES.INTEGRATION_DASHBOARD),
  requirePermission(CANONICAL_PERMISSIONS.INTEGRATION_DASHBOARD_VIEW),
  integrationPlatformController.getOverview
);

// 2. CRM Connections
router.get(
  '/connections',
  requirePage(CANONICAL_PAGES.CRM_CONNECTION),
  requirePermission(CANONICAL_PERMISSIONS.CRM_CONNECTION_VIEW),
  integrationPlatformController.getConnections
);

router.post(
  '/connections',
  requirePage(CANONICAL_PAGES.CRM_CONNECTION),
  requirePermission(CANONICAL_PERMISSIONS.CRM_CONNECTION_MANAGE),
  enforceUsageLimit('maxCrmConnections'),
  integrationPlatformController.createConnection
);

router.get(
  '/connections/:id',
  requirePage(CANONICAL_PAGES.CRM_CONNECTION),
  requirePermission(CANONICAL_PERMISSIONS.CRM_CONNECTION_VIEW),
  integrationPlatformController.getConnectionById
);

router.put(
  '/connections/:id',
  requirePage(CANONICAL_PAGES.CRM_CONNECTION),
  requirePermission(CANONICAL_PERMISSIONS.CRM_CONNECTION_MANAGE),
  integrationPlatformController.updateConnection
);

router.post(
  '/connections/:id/test',
  requirePage(CANONICAL_PAGES.CRM_CONNECTION),
  requirePermission(CANONICAL_PERMISSIONS.CRM_CONNECTION_MANAGE),
  integrationPlatformController.testConnection
);

router.post(
  '/connections/:id/disconnect',
  requirePage(CANONICAL_PAGES.CRM_CONNECTION),
  requirePermission(CANONICAL_PERMISSIONS.CRM_CONNECTION_MANAGE),
  integrationPlatformController.disconnectConnection
);

// 3. Field Mappings
router.get(
  '/connections/:id/mappings',
  requirePage(CANONICAL_PAGES.FIELD_MAPPING),
  requirePermission(CANONICAL_PERMISSIONS.FIELD_MAPPING_VIEW),
  integrationPlatformController.getFieldMappings
);

router.post(
  '/connections/:id/mappings',
  requirePage(CANONICAL_PAGES.FIELD_MAPPING),
  requirePermission(CANONICAL_PERMISSIONS.FIELD_MAPPING_MANAGE),
  integrationPlatformController.createFieldMapping
);

router.put(
  '/mappings/:id',
  requirePage(CANONICAL_PAGES.FIELD_MAPPING),
  requirePermission(CANONICAL_PERMISSIONS.FIELD_MAPPING_MANAGE),
  integrationPlatformController.updateFieldMapping
);

router.delete(
  '/mappings/:id',
  requirePage(CANONICAL_PAGES.FIELD_MAPPING),
  requirePermission(CANONICAL_PERMISSIONS.FIELD_MAPPING_MANAGE),
  integrationPlatformController.deleteFieldMapping
);

// 4. Automation Rules
router.get(
  '/automations',
  requirePage(CANONICAL_PAGES.AUTOMATION_RULES),
  requirePermission(CANONICAL_PERMISSIONS.AUTOMATION_RULES_VIEW),
  integrationPlatformController.getAutomations
);

router.post(
  '/automations',
  requirePage(CANONICAL_PAGES.AUTOMATION_RULES),
  requirePermission(CANONICAL_PERMISSIONS.AUTOMATION_RULES_MANAGE),
  enforceUsageLimit('maxActiveAutomations'),
  integrationPlatformController.createAutomation
);

router.put(
  '/automations/:id',
  requirePage(CANONICAL_PAGES.AUTOMATION_RULES),
  requirePermission(CANONICAL_PERMISSIONS.AUTOMATION_RULES_MANAGE),
  integrationPlatformController.updateAutomation
);

router.post(
  '/automations/:id/toggle',
  requirePage(CANONICAL_PAGES.AUTOMATION_RULES),
  requirePermission(CANONICAL_PERMISSIONS.AUTOMATION_RULES_MANAGE),
  integrationPlatformController.toggleAutomation
);

router.delete(
  '/automations/:id',
  requirePage(CANONICAL_PAGES.AUTOMATION_RULES),
  requirePermission(CANONICAL_PERMISSIONS.AUTOMATION_RULES_MANAGE),
  integrationPlatformController.deleteAutomation
);

// 5. Integration Logs & Events
router.get(
  '/events',
  requirePage(CANONICAL_PAGES.INTEGRATION_LOGS),
  requirePermission(CANONICAL_PERMISSIONS.INTEGRATION_LOGS_VIEW),
  integrationPlatformController.getEvents
);

router.get(
  '/events/:id',
  requirePage(CANONICAL_PAGES.INTEGRATION_LOGS),
  requirePermission(CANONICAL_PERMISSIONS.INTEGRATION_LOGS_VIEW),
  integrationPlatformController.getEventById
);

router.post(
  '/events/:id/retry',
  requirePermission(CANONICAL_PERMISSIONS.FAILED_EVENTS_RETRY),
  integrationPlatformController.retryEvent
);

module.exports = router;
