const express = require('express');
const { PricingPlan } = require('../models');
const pricing = require('../services/pricing');

// Public, no login: what the website banner shows
const router = express.Router();

router.get('/promotions', async (req, res, next) => {
  try {
    const plans = await PricingPlan.find({ isActive: true }).select('name displayName').lean();
    const items = await pricing.websitePromotions(plans);
    res.set('Cache-Control', 'public, max-age=60');
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
