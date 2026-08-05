const mongoose = require('mongoose');

const merchantProductLeadSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  customerPhone: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  customerName: {
    type: String,
    default: 'WhatsApp User',
    trim: true
  },
  productName: {
    type: String,
    default: 'General Product Inquiry',
    trim: true
  },
  userMessage: {
    type: String,
    required: true
  },
  aiResponse: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'converted', 'closed'],
    default: 'new'
  },
  source: {
    type: String,
    default: 'whatsapp'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

merchantProductLeadSchema.index({ adminId: 1, createdAt: -1 });

module.exports = mongoose.model('MerchantProductLead', merchantProductLeadSchema);
