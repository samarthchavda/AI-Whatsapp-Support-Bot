const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const analyticsController = require('../controllers/merchant/analyticsController');

// All routes require authentication
router.use(verifyToken);

// Plan restriction: Advanced Analytics is not available on the Starter plan
const verifyAdvancedAnalytics = (req, res, next) => {
  const plan = (req.admin.subscriptionPlan || 'starter').toLowerCase();
  if (plan === 'starter') {
    return res.status(403).json({
      success: false,
      error: 'Advanced Analytics is not available on your current plan. Please upgrade to Professional or Enterprise to unlock.'
    });
  }
  next();
};

router.use(verifyAdvancedAnalytics);

// Get conversations per day (last 7 days)
router.get('/conversations-per-day', analyticsController.getConversationsPerDay);

// Get resolution rate (AI vs Human)
router.get('/resolution-rate', analyticsController.getResolutionRate);

// Get sentiment analysis
router.get('/sentiment', analyticsController.getSentimentAnalysis);

// Get dashboard stats
router.get('/stats', analyticsController.getDashboardStats);

module.exports = router;
