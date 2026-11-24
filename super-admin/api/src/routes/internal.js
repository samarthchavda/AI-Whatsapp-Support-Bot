const express = require('express');
const mongoose = require('mongoose');
const { PricingPlan, Admin } = require('../models');
const pricing = require('../services/pricing');

// Called only by the main backend's checkout hook (X-Internal-Key).
const router = express.Router();

// { planId, billingCycle, couponCode, adminId } → price quote
router.post('/quote', async (req, res, next) => {
  try {
    const { planId, billingCycle, couponCode, adminId } = req.body || {};
    if (!mongoose.isValidObjectId(planId)) return res.status(400).json({ success: false, error: 'planId is required' });
    const plan = await PricingPlan.findById(planId).lean();
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });
    const admin = mongoose.isValidObjectId(adminId)
      ? await Admin.findById(adminId).select('customDiscount').lean()
      : null;
    const cycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';
    const quote = await pricing.quote({ plan, cycle, couponCode, admin });
    res.json({ success: true, data: quote });
  } catch (error) {
    next(error);
  }
});

// { code, adminId } → can this merchant use this coupon code? (no plan yet)
router.post('/check-code', async (req, res, next) => {
  try {
    const { Coupon } = require('../models');
    const code = String(req.body?.code || '').toUpperCase().trim();
    const coupon = code ? await Coupon.findOne({ code, kind: { $ne: 'offer' } }).lean() : null;
    const adminId = mongoose.isValidObjectId(req.body?.adminId) ? req.body.adminId : null;
    const reason = pricing.staticIneligibility(coupon, {}) || await pricing.merchantIneligibility(coupon, adminId);
    if (reason) return res.json({ success: true, data: { ok: false, error: reason } });
    res.json({
      success: true,
      data: {
        ok: true,
        code: coupon.code,
        discountType: coupon.discountType || 'percent',
        discountPercent: coupon.discountType === 'fixed' ? null : coupon.discountPercent,
        amountOff: coupon.discountType === 'fixed' ? coupon.amountOff : null,
        detail: pricing.describeDiscount(coupon),
        appliesToPlans: coupon.appliesToPlans || []
      }
    });
  } catch (error) {
    next(error);
  }
});

// { code } → count one successful use
router.post('/redeem', async (req, res, next) => {
  try {
    await pricing.recordRedemption(req.body?.code);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
