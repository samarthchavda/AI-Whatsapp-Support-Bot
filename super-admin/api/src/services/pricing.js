/**
 * One place that decides what a merchant pays for a plan.
 *
 * Price = plan price for the billing cycle + one-time setup fee.
 * Discount = the single best of:
 *   - the coupon the merchant entered (kind 'coupon')
 *   - any running offer for this plan (kind 'offer', applied automatically)
 *   - the merchant's personal discount set by the Super Admin (customDiscount %)
 * Discounts never stack and apply to the plan price only, not the setup fee.
 *
 * Used by the main backend's checkout hook (/internal/quote), coupon checks
 * and the website promotions banner.
 */
const { Coupon, Invoice } = require('../models');

const round2 = (n) => Math.round(Number(n || 0) * 100) / 100;

function planPriceFor(plan, cycle) {
  if (cycle === 'yearly' && plan.yearlyPrice) return Number(plan.yearlyPrice);
  return Number(plan.monthlyPrice) || 0;
}

/** Amount a coupon or offer takes off `price` (never more than the price) */
function discountAmount(coupon, price) {
  if (!coupon || !(price > 0)) return 0;
  const raw = coupon.discountType === 'fixed'
    ? Number(coupon.amountOff) || 0
    : (price * (Number(coupon.discountPercent) || 0)) / 100;
  return round2(Math.min(Math.max(raw, 0), price));
}

/** Human description, e.g. "20% off" or "₹500 off" */
function describeDiscount(coupon) {
  if (!coupon) return '';
  return coupon.discountType === 'fixed'
    ? `₹${Number(coupon.amountOff).toLocaleString('en-IN')} off`
    : `${coupon.discountPercent}% off`;
}

/**
 * Rules that don't need the database.
 * @returns {string|null} reason it can't be used, or null when it can
 */
function staticIneligibility(coupon, { plan, cycle, now = new Date() }) {
  if (!coupon) return 'Invalid coupon code';
  if (!coupon.isActive) return coupon.kind === 'offer' ? 'This offer has ended' : 'This coupon is no longer active';
  if (coupon.startsAt && new Date(coupon.startsAt) > now) return coupon.kind === 'offer' ? 'This offer has not started yet' : 'This coupon is not active yet';
  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) return coupon.kind === 'offer' ? 'This offer has ended' : 'This coupon has expired';
  if (coupon.maxRedemptions && (coupon.redemptionCount || 0) >= coupon.maxRedemptions) return 'This coupon has been fully used';
  if (plan && Array.isArray(coupon.appliesToPlans) && coupon.appliesToPlans.length > 0 && !coupon.appliesToPlans.includes(plan.name)) {
    return 'This coupon does not apply to the selected plan';
  }
  if (cycle && Array.isArray(coupon.billingCycles) && coupon.billingCycles.length > 0 && !coupon.billingCycles.includes(cycle)) {
    return `This coupon does not apply to ${cycle} billing`;
  }
  return null;
}

/** Rules that depend on the merchant's payment history */
async function merchantIneligibility(coupon, adminId) {
  if (!coupon || !adminId) return null;
  if (coupon.firstPurchaseOnly) {
    const paidBefore = await Invoice.exists({ customerId: adminId, status: 'paid' });
    if (paidBefore) return 'This coupon is only for a first purchase';
  }
  if (coupon.perMerchantLimit) {
    const used = await Invoice.countDocuments({ customerId: adminId, status: 'paid', couponCode: coupon.code });
    if (used >= coupon.perMerchantLimit) return 'You have already used this coupon';
  }
  return null;
}

/** Running offers that apply to this plan and cycle (no merchant checks) */
async function activeOffersFor(plan, cycle, now = new Date()) {
  const offers = await Coupon.find({ kind: 'offer', isActive: true }).lean();
  return offers.filter((offer) => !staticIneligibility(offer, { plan, cycle, now }));
}

/**
 * Price quote for a merchant buying `plan` on `cycle`.
 * @param {object} p
 * @param {object} p.plan        PricingPlan document or object
 * @param {'monthly'|'yearly'} p.cycle
 * @param {string} [p.couponCode]
 * @param {object} [p.admin]     merchant (for personal discount and usage limits)
 * @returns {Promise<{cycle, planPrice, setupFee, subtotal, discount, total, couponError}>}
 *   discount: { source: 'coupon'|'offer'|'merchant', code, label, amount } or null
 *   couponError: why the entered coupon could not be used (null when it was fine or none was entered)
 */
async function quote({ plan, cycle, couponCode, admin, now = new Date() }) {
  const planPrice = planPriceFor(plan, cycle);
  const setupFee = Number(plan.setupFee) || 0;
  const candidates = [];
  let couponError = null;

  if (couponCode) {
    const coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase().trim(), kind: { $ne: 'offer' } }).lean();
    couponError = staticIneligibility(coupon, { plan, cycle, now }) || await merchantIneligibility(coupon, admin?._id);
    if (!couponError) {
      candidates.push({ source: 'coupon', code: coupon.code, label: coupon.name || coupon.code, detail: describeDiscount(coupon), amount: discountAmount(coupon, planPrice) });
    }
  }

  for (const offer of await activeOffersFor(plan, cycle, now)) {
    if (await merchantIneligibility(offer, admin?._id)) continue;
    candidates.push({ source: 'offer', code: offer.code, label: offer.name || 'Offer', detail: describeDiscount(offer), amount: discountAmount(offer, planPrice) });
  }

  const personal = Number(admin?.customDiscount) || 0;
  if (personal > 0) {
    candidates.push({
      source: 'merchant',
      code: '',
      label: 'Your discount',
      detail: `${personal}% off`,
      amount: discountAmount({ discountType: 'percent', discountPercent: Math.min(personal, 100) }, planPrice)
    });
  }

  const best = candidates.filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount)[0] || null;
  const subtotal = round2(planPrice + setupFee);
  const total = round2(subtotal - (best ? best.amount : 0));
  return { cycle, planPrice: round2(planPrice), setupFee: round2(setupFee), subtotal, discount: best, total, couponError };
}

/** Count one successful use; called after a verified payment */
async function recordRedemption(code) {
  if (!code) return;
  await Coupon.updateOne({ code: String(code).toUpperCase() }, { $inc: { redemptionCount: 1 } });
}

/**
 * Coupons and offers marked "Show on website" that are running right now,
 * as short banner lines, e.g. "Use code SAVE20 to get 20% off Growth".
 * @param {Array} plans  PricingPlan objects (for display names)
 */
async function websitePromotions(plans = [], now = new Date()) {
  const items = await Coupon.find({ showOnWebsite: true, isActive: true }).lean();
  const nameOf = (n) => plans.find((p) => p.name === n)?.displayName || n;
  return items
    .filter((c) => !staticIneligibility(c, { now }))
    .map((c) => {
      const off = describeDiscount(c);
      const planPart = c.appliesToPlans?.length ? ` ${c.appliesToPlans.map(nameOf).join(', ')}` : ' any plan';
      const cyclePart = c.billingCycles?.length === 1 ? ` (${c.billingCycles[0]} billing)` : '';
      const text = c.bannerText || (c.kind === 'offer'
        ? `${c.name || 'Offer'}: ${off}${planPart}${cyclePart}, no code needed`
        : `Use code ${c.code} to get ${off}${planPart}${cyclePart}`);
      return {
        kind: c.kind || 'coupon',
        code: c.kind === 'offer' ? null : c.code,
        text,
        discount: off,
        endsAt: c.expiresAt || null,
        newCustomersOnly: Boolean(c.firstPurchaseOnly)
      };
    });
}

module.exports = {
  quote,
  recordRedemption,
  websitePromotions,
  discountAmount,
  describeDiscount,
  staticIneligibility,
  merchantIneligibility,
  planPriceFor
};
