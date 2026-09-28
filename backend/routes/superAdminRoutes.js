const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { verifyToken } = require('../middleware/auth');
const superAdminController = require('../controllers/superAdmin/superAdminController');
const permissionProfileController = require('../controllers/superAdmin/permissionProfileController');
const onboardingWizardController = require('../controllers/superAdmin/onboardingWizardController');

// All routes require authentication and super admin role
router.use(verifyToken);
router.use(superAdminController.requireSuperAdmin);

// User management & Effective Access Diagnostics
router.post('/users', superAdminController.createUser);
router.get('/users', superAdminController.getAllUsers);
router.get('/users/:id', superAdminController.getUserDetails);
router.get('/users/:id/effective-access', superAdminController.getUserEffectiveAccess);
router.put('/users/:id/effective-access', superAdminController.updateUserEffectiveAccess);
router.post('/users/:id/revoke-sessions', superAdminController.revokeUserSessions);
router.put('/users/:id/subscription', superAdminController.updateUserSubscription);
router.post('/users/:id/reset-tokens', superAdminController.resetUserTokens);
router.post('/users/:id/toggle-status', superAdminController.toggleUserStatus);
router.post('/users/:id/toggle-web-bot', superAdminController.toggleUserWebBot);
router.post('/users/:id/toggle-shopify', superAdminController.toggleUserShopify);
router.post('/users/:id/toggle-woocommerce', superAdminController.toggleUserWooCommerce);
router.post('/users/:id/apply-discount', superAdminController.applyDiscount);
router.post('/users/:id/impersonate', superAdminController.impersonateUser);
router.put('/users/:id/allowed-pages', superAdminController.updateAllowedPages);
router.delete('/users/:id', superAdminController.deleteUser);

// Customer Onboarding Wizard
router.post('/customers/onboard', onboardingWizardController.onboardCustomer);

// Permission Profiles management
router.get('/permission-profiles/metadata/canonical', permissionProfileController.getCanonicalMetadata);
router.get('/permission-profiles', permissionProfileController.getAllPermissionProfiles);
router.get('/permission-profiles/:id', permissionProfileController.getPermissionProfileById);
router.post('/permission-profiles', permissionProfileController.createPermissionProfile);
router.put('/permission-profiles/:id', permissionProfileController.updatePermissionProfile);
router.post('/permission-profiles/:id/duplicate', permissionProfileController.duplicatePermissionProfile);
router.delete('/permission-profiles/:id', permissionProfileController.archivePermissionProfile);

// Plan management
router.post('/plans/custom', superAdminController.createCustomPlan);
router.get('/plans', superAdminController.getAllPlans);
router.post('/plans', superAdminController.createOrUpdatePlan);
router.put('/plans/:id', superAdminController.createOrUpdatePlan);
router.post('/plans/reorder', superAdminController.reorderPlans);
router.post('/plans/:id/duplicate', superAdminController.duplicatePlan);
router.post('/plans/:id/toggle-publish', superAdminController.togglePublishPlan);
router.delete('/plans/:id', superAdminController.deletePlan);

// Coupon management
router.get('/coupons', superAdminController.getAllCoupons);
router.post('/coupons', superAdminController.createCoupon);
router.post('/coupons/:id/toggle', superAdminController.toggleCouponStatus);
router.delete('/coupons/:id', superAdminController.deleteCoupon);

// CRM Lead management
router.post('/leads', superAdminController.createLead);
router.get('/leads', superAdminController.getAllLeads);
router.get('/leads/:id', superAdminController.getLeadDetails);
router.put('/leads/:id', superAdminController.updateLead);
router.delete('/leads/:id', superAdminController.deleteLead);
router.post('/leads/:id/convert', superAdminController.convertLeadToClient);

// Global analytics
router.get('/analytics', superAdminController.getGlobalAnalytics);
router.get('/traffic-analytics', superAdminController.getTrafficAnalytics);

// Global settings
router.get('/settings', superAdminController.getGlobalSettings);
router.post('/settings', superAdminController.updateGlobalSettings);

// Audit logs
router.get('/audit-logs', superAdminController.getAuditLogs);

// Database backup & restore
router.get('/db/backup', superAdminController.exportDatabase);
router.post('/db/restore', upload.single('file'), superAdminController.importDatabase);

// Connection health monitoring
router.get('/health/connections', superAdminController.getConnectionHealthStatus);
router.get('/system-health', superAdminController.getSystemHealthStatus);
router.get('/whatsapp-monitoring', superAdminController.getWhatsAppMonitoringStatus);
router.get('/live-operations', superAdminController.getLiveOperationsStatus);
router.get('/integration-health', superAdminController.getIntegrationHealthStatus);
router.get('/ai-usage', superAdminController.getAIUsageStatus);
router.get('/billing-revenue', superAdminController.getBillingRevenueStatus);
router.get('/feature-flags', superAdminController.getFeatureFlags);
router.post('/feature-flags/toggle', superAdminController.toggleFeatureFlag);
router.post('/users/:id/verify-whatsapp', superAdminController.verifyUserWhatsAppConnection);
router.post('/users/:id/alert-health-offline', superAdminController.alertUserConnectionOffline);

// System Announcements management
router.get('/announcements', superAdminController.getAllAnnouncements);
router.post('/announcements', superAdminController.createAnnouncement);
router.post('/announcements/:id/toggle', superAdminController.toggleAnnouncementStatus);
router.delete('/announcements/:id', superAdminController.deleteAnnouncement);

module.exports = router;
