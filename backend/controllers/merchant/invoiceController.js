const fs = require('fs');
const path = require('path');
const Invoice = require('../../models/Invoice');
const Customer = require('../../models/Customer');
const { verifyResourceSignature } = require('../../utils/signedUrl');

const INVOICES_DIR = path.join(__dirname, '../../uploads/invoices');
const INVOICE_NUMBER_RE = /^[A-Za-z0-9_-]{1,64}$/;

// Merchants only ever see their own invoices; super admins see all.
const tenantScope = (req) => (
  req.admin && req.admin.role === 'super_admin' ? {} : { customerId: req.admin._id }
);

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const streamInvoicePdf = (res, invoiceNumber) => {
  if (!INVOICE_NUMBER_RE.test(invoiceNumber)) {
    return res.status(400).json({ error: 'Invalid invoice number' });
  }
  const filePath = path.join(INVOICES_DIR, `${invoiceNumber}.pdf`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Invoice PDF not found' });
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="Invoice-${invoiceNumber}.pdf"`);
  res.setHeader('Cache-Control', 'private, no-store');
  return res.sendFile(filePath);
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
    const invoice = await Invoice.findOne({ invoiceNumber: String(req.params.id), ...tenantScope(req) });
    
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

// Create new invoice
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
      dueDate,
      paymentTerms = 'Net 30',
      billingAddress,
      notes
    } = req.body;

    // Validate required fields
    if (!invoiceNumber || !customerId || !items || !totalAmount || !dueDate) {
      return res.status(400).json({ 
        error: 'Missing required fields: invoiceNumber, customerId, items, totalAmount, dueDate' 
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
    const updates = req.body;

    const invoice = await Invoice.findOneAndUpdate(
      { invoiceNumber: id },
      updates,
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({
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

    if (!amountPaid || amountPaid <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const invoice = await Invoice.findOne({ invoiceNumber: id });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    invoice.amountPaid = (invoice.amountPaid || 0) + amountPaid;
    invoice.remainingAmount = invoice.totalAmount - invoice.amountPaid;

    // Update status based on payment
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
    const invoiceNumber = String(req.params.id);
    const invoice = await Invoice.findOne({ invoiceNumber, ...tenantScope(req) }).select('invoiceNumber');
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    return streamInvoicePdf(res, invoice.invoiceNumber);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load invoice PDF' });
  }
};

// Download invoice PDF via short-lived signed link (used by WhatsApp document delivery)
exports.downloadSignedInvoicePdf = async (req, res) => {
  const invoiceNumber = String(req.params.id);
  const { exp, sig } = req.query;
  if (!verifyResourceSignature(`invoice:${invoiceNumber}`, exp, sig)) {
    return res.status(403).json({ error: 'Link invalid or expired' });
  }
  return streamInvoicePdf(res, invoiceNumber);
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
