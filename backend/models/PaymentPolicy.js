const mongoose = require('mongoose');

const paymentPolicySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'credit_card', 'check', 'cash', 'other'],
    required: true
  },
  paymentTerms: {
    type: String,
    enum: ['Due on Receipt', 'Net 15', 'Net 30', 'Net 45', 'Net 60'],
    default: 'Net 30'
  },
  lateFeePercentage: {
    type: Number,
    default: 0
  },
  gracePeriodDays: {
    type: Number,
    default: 0
  },
  acceptedCurrencies: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  version: {
    type: String,
    default: '1.0'
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('PaymentPolicy', paymentPolicySchema);
