/**
 * Billing helpers: seller business profile, invoice numbering, GST split and
 * invoice creation for a verified Razorpay payment.
 *
 * Plan prices are treated as GST-inclusive. Tax is calculated out of the amount
 * Razorpay actually charged, so the invoice total always equals what was paid.
 */
const GlobalSettings = require('../models/GlobalSettings');
const Counter = require('../models/Counter');
const Invoice = require('../models/Invoice');

const PROFILE_KEY = 'invoice_business_profile';

const DEFAULT_PROFILE = {
  legalName: 'Kwickbot',
  tradeName: 'Kwickbot',
  addressLine: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  gstin: '',
  pan: '',
  email: 'hello@kwickbot.in',
  phone: '',
  website: 'kwickbot.in',
  sacCode: '',
  gstRate: 18,
  footerNote: 'Thank you for choosing Kwickbot.'
};

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const STATE_CODES = {
  '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh', '05': 'Uttarakhand',
  '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh', '10': 'Bihar', '11': 'Sikkim',
  '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya',
  '18': 'Assam', '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh',
  '24': 'Gujarat', '26': 'Dadra and Nagar Haveli and Daman and Diu', '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa',
  '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh'
};
const INDIAN_STATES = Object.values(STATE_CODES).sort();

const clean = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

function sanitizeProfile(input = {}) {
  const p = { ...DEFAULT_PROFILE };
  for (const k of ['legalName', 'tradeName', 'city', 'state', 'pincode', 'country', 'email', 'phone', 'website', 'sacCode', 'pan']) {
    if (input[k] !== undefined) p[k] = clean(input[k], 120);
  }
  if (input.addressLine !== undefined) p.addressLine = clean(input.addressLine, 300);
  if (input.footerNote !== undefined) p.footerNote = clean(input.footerNote, 300);
  if (input.gstin !== undefined) p.gstin = clean(input.gstin, 15).toUpperCase();
  const rate = Number(input.gstRate);
  if (!Number.isNaN(rate) && rate >= 0 && rate <= 28) p.gstRate = rate;
  return p;
}

function validateProfile(p) {
  const errors = [];
  if (!p.legalName) errors.push('Legal business name is required');
  if (p.gstin && !GSTIN_RE.test(p.gstin)) errors.push('GSTIN format looks invalid (15 characters, e.g. 24ABCDE1234F1Z5)');
  if (p.state && !INDIAN_STATES.includes(p.state)) errors.push('Choose a valid Indian state');
  if (p.gstin && p.state && STATE_CODES[p.gstin.slice(0, 2)] && STATE_CODES[p.gstin.slice(0, 2)] !== p.state) {
    errors.push(`GSTIN state code ${p.gstin.slice(0, 2)} is ${STATE_CODES[p.gstin.slice(0, 2)]}, but the selected state is ${p.state}`);
  }
  return errors;
}

async function getBusinessProfile() {
  const row = await GlobalSettings.findOne({ key: PROFILE_KEY }).lean();
  return sanitizeProfile(row && typeof row.value === 'object' ? row.value : {});
}

/** Indian financial year label, e.g. "26-27" for Apr 2026 – Mar 2027 */
function financialYear(date = new Date()) {
  const y = date.getFullYear();
  const start = date.getMonth() >= 3 ? y : y - 1;
  return `${String(start).slice(-2)}-${String(start + 1).slice(-2)}`;
}

/** Sequential per financial year, e.g. KB/26-27/0001 (GST allows max 16 chars) */
async function nextInvoiceNumber(date = new Date()) {
  const fy = financialYear(date);
  const counter = await Counter.findOneAndUpdate(
    { _id: `invoice-${fy}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `KB/${fy}/${String(counter.seq).padStart(4, '0')}`;
}

/**
 * Split a GST-inclusive total into taxable value and tax.
 * Intra-state (same state as seller) → CGST + SGST; otherwise IGST.
 * Returns null tax when the seller has no GSTIN (non-GST invoice).
 */
function computeTax(total, seller, buyerState) {
  if (!seller.gstin || !seller.gstRate) {
    return { registered: false, taxable: round2(total), rate: 0, cgst: 0, sgst: 0, igst: 0, total: round2(total) };
  }
  const rate = seller.gstRate;
  const taxable = round2(total / (1 + rate / 100));
  const taxTotal = round2(total - taxable);
  const placeOfSupply = buyerState || seller.state;
  const intra = !!seller.state && placeOfSupply === seller.state;
  const half = round2(taxTotal / 2);
  return {
    registered: true,
    rate,
    taxable,
    cgst: intra ? half : 0,
    sgst: intra ? round2(taxTotal - half) : 0,
    igst: intra ? 0 : taxTotal,
    total: round2(total),
    intra,
    placeOfSupply: placeOfSupply || ''
  };
}

function buyerSnapshot(admin) {
  const b = admin.billingDetails || {};
  return {
    name: clean(b.legalName) || admin.businessName || admin.name || 'Merchant',
    contactName: admin.name || '',
    email: admin.email || '',
    phone: admin.phone || admin.businessPhone || '',
    gstin: clean(b.gstin, 15).toUpperCase(),
    addressLine: clean(b.addressLine, 300),
    city: clean(b.city),
    state: clean(b.state),
    pincode: clean(b.pincode)
  };
}

/**
 * Create the invoice for a verified Razorpay payment.
 * @param {object} p
 * @param {object} p.admin        Admin document (after the plan upgrade)
 * @param {object} p.plan         PricingPlan document
 * @param {'monthly'|'yearly'} p.cycle
 * @param {number} p.listPrice    Plan price before any coupon
 * @param {object} p.order        Razorpay order (amount in paise)
 * @param {object} p.payment      Razorpay payment
 */
async function createInvoiceForPayment({ admin, plan, cycle, listPrice, order, payment }) {
  const now = new Date();
  const seller = await getBusinessProfile();
  const buyer = buyerSnapshot(admin);
  const paid = round2(Number(payment.amount || order.amount) / 100);
  const list = round2(Number(listPrice) || paid);
  const discount = list > paid ? round2(list - paid) : 0;
  const tax = computeTax(paid, seller, buyer.state);
  const couponCode = (order.notes && order.notes.couponCode) || '';
  const planName = plan.displayName || plan.name;

  const invoice = new Invoice({
    invoiceNumber: await nextInvoiceNumber(now),
    customerId: admin._id,
    customerPhone: buyer.phone || 'not provided',
    customerName: buyer.name,
    customerEmail: buyer.email,
    items: [{
      description: `Kwickbot ${planName} plan · ${cycle === 'yearly' ? 'Yearly' : 'Monthly'} subscription`,
      quantity: 1,
      unitPrice: list,
      amount: list
    }],
    subtotal: list,
    taxAmount: round2(tax.cgst + tax.sgst + tax.igst),
    totalAmount: paid,
    amountPaid: paid,
    status: 'paid',
    paymentStatus: 'completed',
    paymentTerms: 'Due on Receipt',
    issuedDate: now,
    dueDate: now,
    paidDate: now,
    razorpayPaymentId: String(payment.id),
    razorpayOrderId: String(order.id),
    paymentMethod: payment.method || '',
    currency: (order.currency || 'INR').toUpperCase(),
    planName,
    billingCycle: cycle,
    periodStart: admin.subscriptionStartDate,
    periodEnd: admin.subscriptionEndDate,
    couponCode,
    discountAmount: discount,
    tax,
    seller,
    buyer
  });
  await invoice.save();
  return invoice;
}

module.exports = {
  PROFILE_KEY,
  DEFAULT_PROFILE,
  INDIAN_STATES,
  STATE_CODES,
  GSTIN_RE,
  sanitizeProfile,
  validateProfile,
  getBusinessProfile,
  financialYear,
  nextInvoiceNumber,
  computeTax,
  buyerSnapshot,
  createInvoiceForPayment,
  round2
};
