const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const { verifyToken } = require('../middleware/auth');
const superAdminController = require('../controllers/superAdminController');

// All routes require authentication and super admin role
router.use(verifyToken);
router.use(superAdminController.requireSuperAdmin);

// User management
router.post('/users', superAdminController.createUser);
router.get('/users', superAdminController.getAllUsers);
router.get('/users/:id', superAdminController.getUserDetails);
router.put('/users/:id/subscription', superAdminController.updateUserSubscription);
router.post('/users/:id/reset-tokens', superAdminController.resetUserTokens);
router.post('/users/:id/toggle-status', superAdminController.toggleUserStatus);
router.post('/users/:id/toggle-web-bot', superAdminController.toggleUserWebBot);
router.post('/users/:id/toggle-shopify', superAdminController.toggleUserShopify);
router.post('/users/:id/toggle-woocommerce', superAdminController.toggleUserWooCommerce);
router.post('/users/:id/apply-discount', superAdminController.applyDiscount);
router.post('/users/:id/impersonate', superAdminController.impersonateUser);
router.delete('/users/:id', superAdminController.deleteUser);

// Plan management
router.post('/plans/custom', superAdminController.createCustomPlan);
router.get('/plans', superAdminController.getAllPlans);
router.post('/plans', superAdminController.createOrUpdatePlan);
router.put('/plans/:id', superAdminController.createOrUpdatePlan);
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
router.post('/users/:id/verify-whatsapp', superAdminController.verifyUserWhatsAppConnection);
router.post('/users/:id/alert-health-offline', superAdminController.alertUserConnectionOffline);

// System Announcements management
router.get('/announcements', superAdminController.getAllAnnouncements);
router.post('/announcements', superAdminController.createAnnouncement);
router.post('/announcements/:id/toggle', superAdminController.toggleAnnouncementStatus);
router.delete('/announcements/:id', superAdminController.deleteAnnouncement);

module.exports = router;
