const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verifyToken } = require('../middleware/auth');

// Dashboard routes - all require authentication
router.get('/stats', verifyToken, dashboardController.getDashboardStats);
router.get('/escalations', verifyToken, dashboardController.getEscalations);
router.patch('/escalations/:id', verifyToken, dashboardController.updateEscalation);

module.exports = router;
