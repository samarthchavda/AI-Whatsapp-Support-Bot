const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/merchant/dashboardController');
const { verifyToken } = require('../middleware/auth');

// Dashboard routes - all require authentication
// Plan restriction: Escalations are not available on the Starter plan
const verifyEscalationsAccess = (req, res, next) => {
  const plan = (req.admin.subscriptionPlan || 'starter').toLowerCase();
  if (plan === 'starter') {
    return res.status(403).json({
      success: false,
      error: 'Live Chat Handoff Escalations is not available on your current plan. Please upgrade to Professional or Enterprise to unlock.'
    });
  }
  next();
};

router.get('/stats', verifyToken, dashboardController.getDashboardStats);
router.get('/escalations', verifyToken, verifyEscalationsAccess, dashboardController.getEscalations);
router.patch('/escalations/:id', verifyToken, verifyEscalationsAccess, dashboardController.updateEscalation);
router.get('/announcements', verifyToken, dashboardController.getActiveAnnouncements);

module.exports = router;
