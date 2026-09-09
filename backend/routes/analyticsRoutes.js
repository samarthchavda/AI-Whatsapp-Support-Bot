const express = require('express');
const router = express.Router();
const { verifyToken, requireFeature } = require('../middleware/auth');
const analyticsController = require('../controllers/merchant/analyticsController');

// All routes require authentication & Advanced Analytics feature entitlement
router.use(verifyToken);
router.use(requireFeature('advancedAnalytics'));

// Get conversations per day (last 7 days)
router.get('/conversations-per-day', analyticsController.getConversationsPerDay);

// Get resolution rate (AI vs Human)
router.get('/resolution-rate', analyticsController.getResolutionRate);

// Get sentiment analysis
router.get('/sentiment', analyticsController.getSentimentAnalysis);

// Get dashboard stats
router.get('/stats', analyticsController.getDashboardStats);

module.exports = router;
