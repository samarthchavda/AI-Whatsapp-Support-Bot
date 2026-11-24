const crypto = require('crypto');
const express = require('express');
const { Coupon, PricingPlan } = require('../models');
const { audit } = require('../services/audit');

const router = express.Router();

/**
 * Validate and normalise coupon/offer input. Returns { error } or { data }.
 * `existing` is the saved coupon when editing.
 */
async function buildCouponData(body, existing) {
  const kind = (existing && existing.kind) || (body.kind === 'offer' ? 'offer' : 'coupon');
  const data = { kind };

  if (kind === 'coupon') {
    const code = String(body.code ?? existing?.code ?? '').toUpperCase().trim();
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) {
      return { error: 'Coupon code must be 3 to 30 letters, numbers, - or _' };
    }
    data.code = code;
  } else {
    if (!String(body.name ?? existing?.name ?? '').trim()) {
      return { error: 'Give the offer a name merchants will see, like "Diwali offer"' };
    }
    data.code = existing?.code || `OFFER-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  }

  data.name = String(body.name ?? existing?.name ?? '').trim().slice(0, 80);
  data.description = String(body.description ?? existing?.description ?? '').trim().slice(0, 300);

  data.discountType = (body.discountType ?? existing?.discountType) === 'fixed' ? 'fixed' : 'percent';
  if (data.discountType === 'percent') {
    const pct = Number(body.discountPercent ?? existing?.discountPercent);
    if (!Number.isFinite(pct) || pct < 1 || pct > 100) return { error: 'Discount must be between 1% and 100%' };
    data.discountPercent = Math.round(pct * 100) / 100;
    data.amountOff = undefined;
  } else {
    const amount = Number(body.amountOff ?? existing?.amountOff);
    if (!Number.isFinite(amount) || amount < 1) return { error: 'Discount amount must be at least ₹1' };
    data.amountOff = Math.round(amount * 100) / 100;
    data.discountPercent = undefined;
  }

  const plans = Array.isArray(body.appliesToPlans) ? body.appliesToPlans : (existing?.appliesToPlans || []);
  const planNames = [...new Set(plans.map((p) => String(p).toLowerCase().trim()).filter(Boolean))];
  if (planNames.length) {
    const found = await PricingPlan.find({ name: { $in: planNames } }).select('name').lean();
    const missing = planNames.filter((n) => !found.some((f) => f.name === n));
    if (missing.length) return { error: `Unknown plan: ${missing.join(', ')}` };
  }
  data.appliesToPlans = planNames;

  const cycles = Array.isArray(body.billingCycles) ? body.billingCycles : (existing?.billingCycles || []);
  data.billingCycles = [...new Set(cycles.filter((c) => c === 'monthly' || c === 'yearly'))];

  const toDate = (v, fallback) => (v === undefined ? fallback : v ? new Date(v) : null);
  data.startsAt = toDate(body.startsAt, existing?.startsAt ?? null);
  data.expiresAt = toDate(body.expiresAt, existing?.expiresAt ?? null);
  if ((data.startsAt && Number.isNaN(data.startsAt.getTime())) || (data.expiresAt && Number.isNaN(data.expiresAt.getTime()))) {
    return { error: 'Start or end date is not a valid date' };
  }
  if (data.startsAt && data.expiresAt && data.expiresAt <= data.startsAt) {
    return { error: 'The end date must be after the start date' };
  }

  const toLimit = (v, fallback) => {
    if (v === undefined) return fallback;
    if (v === null || v === '' || Number(v) === 0) return null;
    return Math.floor(Number(v));
  };
  data.maxRedemptions = toLimit(body.maxRedemptions, existing?.maxRedemptions ?? null);
  data.perMerchantLimit = toLimit(body.perMerchantLimit, existing?.perMerchantLimit ?? (kind === 'coupon' && !existing ? 1 : null));
  if ([data.maxRedemptions, data.perMerchantLimit].some((v) => v !== null && (!Number.isFinite(v) || v < 1))) {
    return { error: 'Usage limits must be empty (no limit) or a whole number of at least 1' };
  }
  data.firstPurchaseOnly = Boolean(body.firstPurchaseOnly ?? existing?.firstPurchaseOnly ?? false);
  data.showOnWebsite = Boolean(body.showOnWebsite ?? existing?.showOnWebsite ?? false);
  data.bannerText = String(body.bannerText ?? existing?.bannerText ?? '').trim().slice(0, 120);
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
  data.updatedAt = new Date();
  return { data };
}

router.get('/', async (req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: coupons });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { error, data } = await buildCouponData(req.body || {});
    if (error) return res.status(400).json({ success: false, error });
    if (await Coupon.exists({ code: data.code })) {
      return res.status(400).json({ success: false, error: 'A coupon with this code already exists' });
    }
    const coupon = await Coupon.create({ ...data, createdBy: req.admin.email });
    await audit(req, `${data.kind}_create`, coupon.code, { couponId: coupon._id });
    res.status(201).json({ success: true, message: data.kind === 'offer' ? 'Offer created' : 'Coupon created', data: coupon });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, error: 'Coupon not found' });
    const { error, data } = await buildCouponData(req.body || {}, coupon.toObject());
    if (error) return res.status(400).json({ success: false, error });
    if (data.code !== coupon.code) {
      if (coupon.redemptionCount > 0) {
        return res.status(400).json({ success: false, error: 'This coupon has been used, so its code can no longer change' });
      }
      if (await Coupon.exists({ code: data.code, _id: { $ne: coupon._id } })) {
        return res.status(400).json({ success: false, error: 'A coupon with this code already exists' });
      }
    }
    coupon.set(data);
    await coupon.save();
    await audit(req, `${coupon.kind}_update`, coupon.code, { couponId: coupon._id });
    res.json({ success: true, message: coupon.kind === 'offer' ? 'Offer saved' : 'Coupon saved', data: coupon });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/toggle', async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, error: 'Coupon not found' });
    coupon.isActive = !coupon.isActive;
    coupon.updatedAt = new Date();
    await coupon.save();
    await audit(req, `${coupon.kind}_${coupon.isActive ? 'enable' : 'disable'}`, coupon.code);
    res.json({ success: true, data: coupon });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, error: 'Coupon not found' });
    await audit(req, `${coupon.kind}_delete`, coupon.code);
    res.json({ success: true, message: 'Deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
module.exports.buildCouponData = buildCouponData;
