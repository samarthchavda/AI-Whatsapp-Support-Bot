const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String
  },
  items: [{
    description: String,
    quantity: Number,
    unitPrice: Number,
    amount: Number
  }],
  subtotal: {
    type: Number,
    required: true
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled'],
    default: 'issued'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'completed', 'failed'],
    default: 'pending'
  },
  paymentTerms: {
    type: String,
    enum: ['Due on Receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60'],
    default: 'Net 30'
  },
  dueDate: {
    type: Date,
    required: true
  },
  issuedDate: {
    type: Date,
    default: Date.now
  },
  paidDate: {
    type: Date
  },
  billingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  notes: String,
  attachments: [{
    fileName: String,
    fileUrl: String,
    uploadedDate: Date
  }],
  amountPaid: {
    type: Number,
    default: 0
  },
  remainingAmount: {
    type: Number
  }
}, { 
  timestamps: true 
});

// Index for faster queries
invoiceSchema.index({ customerPhone: 1, issuedDate: -1 });
invoiceSchema.index({ status: 1, dueDate: 1 });

// Calculate remaining amount before saving
invoiceSchema.pre('save', function(next) {
  this.remainingAmount = this.totalAmount - (this.amountPaid || 0);
  next();
});

module.exports = mongoose.model('Invoice', invoiceSchema);
