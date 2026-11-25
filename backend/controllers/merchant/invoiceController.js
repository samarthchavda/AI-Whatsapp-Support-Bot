const mongoose = require('mongoose');
const Invoice = require('../../models/Invoice');
const Admin = require('../../models/Admin');
const Customer = require('../../models/Customer');
const { verifyResourceSignature } = require('../../utils/signedUrl');
const { renderInvoicePdf } = require('../../services/invoicePdfService');
const billing = require('../../services/billingService');

// Merchants only ever see their own invoices; super admins see all.
const tenantScope = (req) => (
  req.admin && req.admin.role === 'super_admin' ? {} : { customerId: req.admin._id }
);

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Invoices are addressed by database id (GST numbers like KB/26-27/0001 contain slashes)
const byIdOrNumber = (id) => (
  mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { invoiceNumber: String(id) }
);

const sendInvoicePdf = async (res, invoice, disposition = 'inline') => {
  const pdf = await renderInvoicePdf(invoice);
  const fileName = `Kwickbot-Invoice-${String(invoice.invoiceNumber).replace(/[^A-Za-z0-9-]+/g, '-')}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Length', pdf.length);
  return res.end(pdf);
};

// Get all invoices
exports.getAllInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    
    let query = { ...tenantScope(req) };
    
    if (status) {
      query.status = String(status);
    }
    
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        { invoiceNumber: pattern },
        { customerName: pattern },
        { customerPhone: pattern },
        { customerEmail: pattern }
      ];
    }

    const invoices = await Invoice.find(query)
      .sort({ issuedDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Invoice.countDocuments(query);

    res.json({
      invoices,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get invoice by ID
exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ ...byIdOrNumber(req.params.id), ...tenantScope(req) });
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get invoice by customer phone
exports.getInvoiceByPhone = async (req, res) => {
  try {
    const { phone } = req.params;
    
    const invoices = await Invoice.find({ customerPhone: String(phone), ...tenantScope(req) })
      .sort({ issuedDate: -1 });

    res.json(invoices);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new invoice (supports manual Super Admin invoice creation or explicit payload)
exports.createInvoice = async (req, res) => {
  try {
    const {
      invoiceNumber,
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      items,
      subtotal,
      taxAmount = 0,
      totalAmount,
      amount,
      description,
      cycle = 'monthly',
      status = 'issued',
      paymentMethod = '',
      dueDate,
      paymentTerms = 'Net 30',
      billingAddress,
      notes,
      periodStart,
      periodEnd
    } = req.body;

    // Simplified Super Admin subscription/service invoice flow
    if (customerId && !invoiceNumber && (amount !== undefined || totalAmount !== undefined)) {
      const targetAdmin = await Admin.findById(customerId).lean();
      if (!targetAdmin) {
        return res.status(404).json({ error: 'Merchant account not found' });
      }
      const resolvedAmount = Number(amount !== undefined ? amount : totalAmount);
      if (!Number.isFinite(resolvedAmount) || resolvedAmount <= 0) {
        return res.status(400).json({ error: 'Amount must be greater than zero' });
      }
      const created = await billing.createManualInvoice({
        admin: targetAdmin,
        description,
        amount: resolvedAmount,
        cycle,
        dueDate,
        status: status === 'paid' ? 'paid' : 'issued',
        paymentMethod,
        notes,
        periodStart,
        periodEnd
      });
      return res.status(201).json({
        success: true,
        message: 'Invoice created successfully',
        invoice: created
      });
    }

    // Legacy explicit payload path
    if (!invoiceNumber || !customerId || !items || !totalAmount || !dueDate) {
      return res.status(400).json({ 
        error: 'Missing required fields: customerId and amount (or invoiceNumber, customerId, items, totalAmount, dueDate)' 
      });
    }

    const newInvoice = new Invoice({
      invoiceNumber,
      customerId,
      customerName,
      customerPhone,
      customerEmail,
      items,
      subtotal,
      taxAmount,
      totalAmount,
      dueDate,
      paymentTerms,
      billingAddress,
      notes
    });

    await newInvoice.save();
    
    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      invoice: newInvoice
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update invoice
exports.updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const allowedFields = ['status', 'paymentStatus', 'dueDate', 'notes', 'paymentTerms', 'paymentMethod'];
    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (updates.status === 'cancelled') {
      updates.paymentStatus = 'failed';
    }

    const invoice = await Invoice.findOneAndUpdate(
      byIdOrNumber(id),
      { $set: updates },
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      invoice
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Record payment
exports.recordPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { amountPaid, paymentMethod } = req.body;

    const invoice = await Invoice.findOne(byIdOrNumber(id));

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const paymentAmount = amountPaid !== undefined ? Number(amountPaid) : Math.max(0, invoice.totalAmount - (invoice.amountPaid || 0));
    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount' });
    }

    invoice.amountPaid = billing.round2((invoice.amountPaid || 0) + paymentAmount);
    invoice.remainingAmount = Math.max(0, billing.round2(invoice.totalAmount - invoice.amountPaid));
    if (paymentMethod) {
      invoice.paymentMethod = String(paymentMethod).trim().slice(0, 60);
    }

    if (invoice.amountPaid >= invoice.totalAmount) {
      invoice.status = 'paid';
      invoice.paymentStatus = 'completed';
      invoice.paidDate = new Date();
    } else if (invoice.amountPaid > 0) {
      invoice.status = 'partially_paid';
      invoice.paymentStatus = 'partial';
    }

    await invoice.save();

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      invoice
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get overdue invoices
exports.getOverdueInvoices = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueInvoices = await Invoice.find({
      ...tenantScope(req),
      dueDate: { $lt: today },
      status: { $nin: ['paid', 'cancelled'] }
    }).sort({ dueDate: 1 });

    res.json({
      count: overdueInvoices.length,
      invoices: overdueInvoices
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Download invoice PDF (authenticated: owner or super admin)
exports.downloadInvoicePdf = async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ ...byIdOrNumber(req.params.id), ...tenantScope(req) });
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    return await sendInvoicePdf(res, invoice, req.query.download ? 'attachment' : 'inline');
  } catch (error) {
    console.error('Invoice PDF error:', error);
    res.status(500).json({ error: 'Failed to generate invoice PDF' });
  }
};

// Download invoice PDF via short-lived signed link (used by WhatsApp document delivery)
exports.downloadSignedInvoicePdf = async (req, res) => {
  const id = String(req.params.id);
  const { exp, sig } = req.query;
  if (!verifyResourceSignature(`invoice:${id}`, exp, sig)) {
    return res.status(403).json({ error: 'Link invalid or expired' });
  }
  try {
    const invoice = await Invoice.findOne(byIdOrNumber(id));
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    return await sendInvoicePdf(res, invoice, 'inline');
  } catch (error) {
    console.error('Signed invoice PDF error:', error);
    res.status(500).json({ error: 'Failed to generate invoice PDF' });
  }
};

// Super admin: preview the invoice design with current or previewed billing style
exports.previewSampleInvoice = async (req, res) => {
  try {
    const savedSeller = await billing.getBusinessProfile();
    const q = req.query || {};
    const seller = billing.sanitizeProfile({
      ...savedSeller,
      ...(q.templateStyle ? { templateStyle: q.templateStyle } : {}),
      ...(q.headerLayout ? { headerLayout: q.headerLayout } : {}),
      ...(q.brandTagline !== undefined ? { brandTagline: q.brandTagline } : {}),
      ...(q.invoicePrefix ? { invoicePrefix: q.invoicePrefix } : {}),
      ...(q.footerNote !== undefined ? { footerNote: q.footerNote } : {})
    });
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const buyerState = seller.state && seller.state !== 'Maharashtra' ? 'Maharashtra' : 'Karnataka';
    const total = 2999;
    const sample = {
      invoiceNumber: `${seller.invoicePrefix || 'KB'}/${billing.financialYear(now)}/SAMPLE`,
      items: [{ description: 'Kwickbot Growth plan · Monthly subscription', quantity: 1, unitPrice: total, amount: total }],
      subtotal: total, totalAmount: total, amountPaid: total, discountAmount: 0,
      status: 'paid', paymentStatus: 'completed', issuedDate: now, paidDate: now, periodStart: now, periodEnd: end,
      razorpayPaymentId: 'pay_SAMPLE0000000', razorpayOrderId: 'order_SAMPLE000000', paymentMethod: 'upi', currency: 'INR',
      seller,
      buyer: { name: 'Sample Store Pvt Ltd', email: 'accounts@example.com', phone: '+91 98765 43210', addressLine: '12 Example Road', city: 'Sample City', state: buyerState, pincode: '400001' },
      tax: billing.computeTax(total, seller, buyerState)
    };
    return await sendInvoicePdf(res, sample, 'inline');
  } catch (error) {
    console.error('Sample invoice error:', error);
    res.status(500).json({ error: 'Failed to generate sample invoice' });
  }
};

// Merchant billing details printed on their invoices
exports.getBillingDetails = async (req, res) => {
  const admin = await Admin.findById(req.admin._id).select('billingDetails businessName name email').lean();
  res.json({
    success: true,
    data: { ...(admin?.billingDetails || {}) },
    defaults: { legalName: admin?.businessName || admin?.name || '' },
    states: billing.INDIAN_STATES
  });
};

exports.updateBillingDetails = async (req, res) => {
  try {
    const input = req.body || {};
    const clean = (v, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
    const details = {
      legalName: clean(input.legalName),
      gstin: clean(input.gstin, 15).toUpperCase(),
      addressLine: clean(input.addressLine, 300),
      city: clean(input.city, 120),
      state: clean(input.state, 120),
      pincode: clean(input.pincode, 12)
    };
    if (details.gstin && !billing.GSTIN_RE.test(details.gstin)) {
      return res.status(400).json({ success: false, error: 'GSTIN format looks invalid (15 characters, e.g. 27ABCDE1234F1Z5)' });
    }
    if (details.state && !billing.INDIAN_STATES.includes(details.state)) {
      return res.status(400).json({ success: false, error: 'Choose a valid Indian state' });
    }
    if (details.pincode && !/^[1-9][0-9]{5}$/.test(details.pincode)) {
      return res.status(400).json({ success: false, error: 'PIN code must be 6 digits' });
    }
    await Admin.updateOne({ _id: req.admin._id }, { $set: { billingDetails: details } });
    res.json({ success: true, data: details, message: 'Billing details saved. They will appear on your next invoice.' });
  } catch (error) {
    console.error('Billing details error:', error);
    res.status(500).json({ success: false, error: 'Failed to save billing details' });
  }
};

// Get invoice statistics
exports.getInvoiceStats = async (req, res) => {
  try {
    const scopeMatch = tenantScope(req);
    const stats = await Invoice.aggregate([
      { $match: scopeMatch },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalRevenue = await Invoice.aggregate([
      { $match: { ...scopeMatch, status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    res.json({
      byStatus: stats,
      totalPaidRevenue: totalRevenue[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = exports;
