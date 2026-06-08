const mongoose = require('mongoose');

const webhookLogSchema = new mongoose.Schema({
  source: {
    type: String,
    required: true,
    enum: ['shopify', 'woocommerce', 'custom', 'other']
  },
  eventType: {
    type: String,
    required: true
  },
  orderId: {
    type: String,
    index: true
  },
  externalOrderId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'pending'
  },
  requestPayload: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  responsePayload: {
    type: mongoose.Schema.Types.Mixed
  },
  errorMessage: {
    type: String
  },
  whatsappSent: {
    type: Boolean,
    default: false
  },
  whatsappError: {
    type: String
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  },
  processingTime: {
    type: Number // in milliseconds
  }
}, {
  timestamps: true
});

// Index for faster queries
webhookLogSchema.index({ source: 1, createdAt: -1 });
webhookLogSchema.index({ externalOrderId: 1 });
webhookLogSchema.index({ status: 1 });

module.exports = mongoose.model('WebhookLog', webhookLogSchema);
