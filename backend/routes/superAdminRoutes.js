const express = require('express');
const router = express.Router();
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
router.delete('/users/:id', superAdminController.deleteUser);

// Plan management
router.post('/plans/custom', superAdminController.createCustomPlan);
router.get('/plans', superAdminController.getAllPlans);
router.post('/plans', superAdminController.createOrUpdatePlan);
router.put('/plans/:id', superAdminController.createOrUpdatePlan);
router.delete('/plans/:id', superAdminController.deletePlan);

// Global analytics
router.get('/analytics', superAdminController.getGlobalAnalytics);

// Global settings
router.get('/settings', superAdminController.getGlobalSettings);
router.post('/settings', superAdminController.updateGlobalSettings);

module.exports = router;
