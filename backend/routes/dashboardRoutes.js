const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');

// Dashboard routes
router.get('/stats', dashboardController.getDashboardStats);
router.get('/escalations', dashboardController.getEscalations);
router.patch('/escalations/:id', dashboardController.updateEscalation);

module.exports = router;
