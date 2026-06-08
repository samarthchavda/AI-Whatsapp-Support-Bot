const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');

// All routes require authentication
router.use(verifyToken);

// Get conversations per day (last 7 days)
router.get('/conversations-per-day', analyticsController.getConversationsPerDay);

// Get resolution rate (AI vs Human)
router.get('/resolution-rate', analyticsController.getResolutionRate);

// Get sentiment analysis
router.get('/sentiment', analyticsController.getSentimentAnalysis);

// Get dashboard stats
router.get('/stats', analyticsController.getDashboardStats);

module.exports = router;
