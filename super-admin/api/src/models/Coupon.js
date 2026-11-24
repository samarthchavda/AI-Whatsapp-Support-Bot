const mongoose = require('mongoose');

/**
 * Coupons and offers. Same "coupons" collection the main backend reads, so
 * old fields (code, discountPercent, isActive, expiresAt) keep their meaning.
 *
 *  kind 'coupon': merchants type the code at checkout
 *  kind 'offer':  applied automatically while it runs (code is generated)
 *  showOnWebsite: listed in the public website banner
 */
const couponSchema = new mongoose.Schema({
  kind: { type: String, enum: ['coupon', 'offer'], default: 'coupon' },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, trim: true, default: '' },
  description: { type: String, trim: true, default: '' },
  discountType: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
  discountPercent: {
    type: Number,
    min: 1,
    max: 100,
    required() { return this.discountType !== 'fixed'; }
  },
  amountOff: {
    type: Number,
    min: 1,
    required() { return this.discountType === 'fixed'; }
  },
  appliesToPlans: { type: [String], default: [] },
  billingCycles: { type: [{ type: String, enum: ['monthly', 'yearly'] }], default: [] },
  startsAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
  maxRedemptions: { type: Number, min: 1, default: null },
  perMerchantLimit: { type: Number, min: 1, default: null },
  firstPurchaseOnly: { type: Boolean, default: false },
  redemptionCount: { type: Number, default: 0, min: 0 },
  showOnWebsite: { type: Boolean, default: false },
  // Optional text for the website banner; a default is built when empty
  bannerText: { type: String, trim: true, default: '' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'coupons' });

module.exports = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);
