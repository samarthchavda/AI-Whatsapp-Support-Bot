/**
 * Billing helpers: seller business profile, invoice numbering, GST split,
 * theme configuration, and invoice creation (Razorpay + Super Admin manual).
 *
 * Plan prices are treated as GST-inclusive. Tax is calculated out of the amount
 * actually charged/billed, so the invoice total always matches the payment.
 */
const GlobalSettings = require('../models/GlobalSettings');
const Counter = require('../models/Counter');
const Invoice = require('../models/Invoice');

const PROFILE_KEY = 'invoice_business_profile';

const TEMPLATE_STYLES = ['pista', 'midnight', 'indigo', 'minimal'];
const HEADER_LAYOUTS = ['banner', 'clean'];

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
  footerNote: 'Thank you for choosing Kwickbot.',
  templateStyle: 'pista',
  headerLayout: 'banner',
  brandTagline: 'AI WhatsApp support for e-commerce',
  invoicePrefix: 'KB',
  showPaymentRef: true,
  showTaxNote: true
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
  for (const k of ['legalName', 'tradeName', 'city', 'state', 'pincode', 'country', 'email', 'phone', 'website', 'sacCode', 'pan', 'brandTagline']) {
    if (input[k] !== undefined) p[k] = clean(input[k], 120);
  }
  if (input.addressLine !== undefined) p.addressLine = clean(input.addressLine, 300);
  if (input.footerNote !== undefined) p.footerNote = clean(input.footerNote, 300);
  if (input.gstin !== undefined) p.gstin = clean(input.gstin, 15).toUpperCase();

  if (input.templateStyle !== undefined && TEMPLATE_STYLES.includes(String(input.templateStyle))) {
    p.templateStyle = String(input.templateStyle);
  }
  if (input.headerLayout !== undefined && HEADER_LAYOUTS.includes(String(input.headerLayout))) {
    p.headerLayout = String(input.headerLayout);
  }
  if (input.invoicePrefix !== undefined) {
    const cleanedPrefix = clean(input.invoicePrefix, 6).replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (cleanedPrefix.length >= 2) p.invoicePrefix = cleanedPrefix;
  }
  if (input.showPaymentRef !== undefined) p.showPaymentRef = Boolean(input.showPaymentRef);
  if (input.showTaxNote !== undefined) p.showTaxNote = Boolean(input.showTaxNote);

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
async function nextInvoiceNumber(date = new Date(), prefix = DEFAULT_PROFILE.invoicePrefix) {
  const fy = financialYear(date);
  const safePrefix = clean(String(prefix || 'KB'), 6).replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'KB';
  const counter = await Counter.findOneAndUpdate(
    { _id: `invoice-${fy}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return `${safePrefix}/${fy}/${String(counter.seq).padStart(4, '0')}`;
}

/**
 * Split a GST-inclusive total into taxable value and tax.
 * Intra-state (same state as seller) -> CGST + SGST; otherwise IGST.
 * Returns unregistered summary when the seller has no GSTIN.
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

function validateBuyerBillingDetails(input = {}, { strict = false } = {}) {
  const details = {
    legalName: clean(input.legalName),
    gstin: clean(input.gstin, 15).toUpperCase().replace(/[^A-Z0-9]/g, ''),
    addressLine: clean(input.addressLine, 300),
    city: clean(input.city, 120),
    state: clean(input.state, 120),
    pincode: clean(input.pincode, 12)
  };
  const errors = [];
  const missingFields = [];

  if (strict) {
    if (details.legalName.length < 2) {
      missingFields.push('legalName');
      errors.push('Legal business name is required (at least 2 characters)');
    }
    if (details.addressLine.length < 5) {
      missingFields.push('addressLine');
      errors.push('Registered billing address is required (at least 5 characters)');
    }
    if (details.city.length < 2) {
      missingFields.push('city');
      errors.push('Billing city is required');
    }
    if (!details.state || !INDIAN_STATES.includes(details.state)) {
      missingFields.push('state');
      errors.push('Select a valid billing state');
    }
    if (!/^[1-9][0-9]{5}$/.test(details.pincode)) {
      missingFields.push('pincode');
      errors.push('Enter a valid 6-digit Indian PIN code');
    }
  } else {
    if (details.state && !INDIAN_STATES.includes(details.state)) {
      errors.push('Choose a valid Indian state');
    }
    if (details.pincode && !/^[1-9][0-9]{5}$/.test(details.pincode)) {
      errors.push('PIN code must be 6 digits');
    }
  }

  if (details.gstin) {
    if (!GSTIN_RE.test(details.gstin)) {
      errors.push('GSTIN format looks invalid (15 characters, e.g. 27ABCDE1234F1Z5)');
    } else if (details.state && STATE_CODES[details.gstin.slice(0, 2)] && STATE_CODES[details.gstin.slice(0, 2)] !== details.state) {
      errors.push(`GSTIN state code ${details.gstin.slice(0, 2)} is ${STATE_CODES[details.gstin.slice(0, 2)]}, but the selected state is ${details.state}`);
    }
  }

  return { details, errors, missingFields };
}

/**
 * Create the invoice for a verified Razorpay payment.
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
    invoiceNumber: await nextInvoiceNumber(now, seller.invoicePrefix),
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

/**
 * Create a manual subscription or service invoice from Super Admin Billing & Revenue.
 */
async function createManualInvoice({
  admin,
  description,
  amount,
  cycle = 'monthly',
  dueDate,
  status = 'issued',
  paymentMethod = '',
  notes = '',
  periodStart = null,
  periodEnd = null
}) {
  const now = new Date();
  const seller = await getBusinessProfile();
  const buyer = buyerSnapshot(admin);
  const total = round2(amount);
  const tax = computeTax(total, seller, buyer.state);
  const isPaid = status === 'paid';
  const planName = admin.subscriptionPlan || 'starter';
  const resolvedPeriodStart = periodStart ? new Date(periodStart) : admin.subscriptionStartDate || now;
  const resolvedPeriodEnd = periodEnd
    ? new Date(periodEnd)
    : admin.subscriptionEndDate || new Date(resolvedPeriodStart.getTime() + (cycle === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000);

  const invoice = new Invoice({
    invoiceNumber: await nextInvoiceNumber(now, seller.invoicePrefix),
    customerId: admin._id,
    customerPhone: buyer.phone || 'not provided',
    customerName: buyer.name,
    customerEmail: buyer.email,
    items: [{
      description: clean(description, 240) || `Kwickbot ${planName} plan · ${cycle === 'yearly' ? 'Yearly' : 'Monthly'} subscription`,
      quantity: 1,
      unitPrice: total,
      amount: total
    }],
    subtotal: total,
    taxAmount: round2(tax.cgst + tax.sgst + tax.igst),
    totalAmount: total,
    amountPaid: isPaid ? total : 0,
    status: isPaid ? 'paid' : 'issued',
    paymentStatus: isPaid ? 'completed' : 'pending',
    paymentTerms: isPaid ? 'Due on Receipt' : 'Net 15',
    issuedDate: now,
    dueDate: dueDate ? new Date(dueDate) : now,
    paidDate: isPaid ? now : undefined,
    paymentMethod: clean(paymentMethod, 60),
    notes: clean(notes, 400),
    currency: 'INR',
    planName,
    billingCycle: cycle,
    periodStart: resolvedPeriodStart,
    periodEnd: resolvedPeriodEnd,
    discountAmount: 0,
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
  TEMPLATE_STYLES,
  HEADER_LAYOUTS,
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
  validateBuyerBillingDetails,
  createInvoiceForPayment,
  createManualInvoice,
  round2
};
