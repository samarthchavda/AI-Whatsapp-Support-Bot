const express = require('express');
const router = express.Router();
const demoRequestController = require('../controllers/superAdmin/demoRequestController');
const superAdminController = require('../controllers/superAdmin/superAdminController');
const { verifyToken } = require('../middleware/auth');

// Legacy endpoint: existing integrations receive an explicit migration response.
router.post('/', (_req, res) => res.status(410).json({ success: false, message: 'Demo requests are closed. Create an account at /signup or contact us at /contact.' }));

// Protected management routes - super admin only
router.get('/', verifyToken, superAdminController.requireSuperAdmin, demoRequestController.getAllDemoRequests);

module.exports = router;
