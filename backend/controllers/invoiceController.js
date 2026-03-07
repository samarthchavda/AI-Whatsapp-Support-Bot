const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');

// Get all invoices
exports.getAllInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { invoiceNumber: new RegExp(search, 'i') },
        { customerName: new RegExp(search, 'i') },
        { customerPhone: new RegExp(search, 'i') },
        { customerEmail: new RegExp(search, 'i') }
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
    const invoice = await Invoice.findOne({ invoiceNumber: req.params.id });
    
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
    
    const invoices = await Invoice.find({ customerPhone: phone })
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
      dueDate: { $lt: today },
      status: { $ne: 'paid', $ne: 'cancelled' }
    }).sort({ dueDate: 1 });

    res.json({
      count: overdueInvoices.length,
      invoices: overdueInvoices
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get invoice statistics
exports.getInvoiceStats = async (req, res) => {
  try {
    const stats = await Invoice.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    const totalRevenue = await Invoice.aggregate([
      { $match: { status: 'paid' } },
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
