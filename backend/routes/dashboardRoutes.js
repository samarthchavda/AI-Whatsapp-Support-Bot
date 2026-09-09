const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/merchant/dashboardController');
const { verifyToken, requireFeature } = require('../middleware/auth');

// Dashboard routes - all require authentication
router.get('/stats', verifyToken, dashboardController.getDashboardStats);
router.get('/escalations', verifyToken, requireFeature('escalations'), dashboardController.getEscalations);
router.patch('/escalations/:id', verifyToken, requireFeature('escalations'), dashboardController.updateEscalation);
router.get('/announcements', verifyToken, dashboardController.getActiveAnnouncements);

module.exports = router;
