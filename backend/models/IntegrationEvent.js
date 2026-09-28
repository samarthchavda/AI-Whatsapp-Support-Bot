const mongoose = require('mongoose');

const integrationEventSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  connectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CRMConnection',
    default: null,
    index: true
  },
  provider: {
    type: String,
    lowercase: true,
    trim: true,
    default: 'custom'
  },
  eventType: {
    type: String,
    required: true,
    index: true
  },
  direction: {
    type: String,
    enum: ['inbound', 'outbound'],
    default: 'outbound'
  },
  idempotencyKey: {
    type: String,
    index: true,
    sparse: true
  },
  externalRecordId: {
    type: String,
    default: null
  },
  internalRecordId: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'dead_letter'],
    default: 'pending',
    index: true
  },
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 5
  },
  nextRetryAt: {
    type: Date,
    default: null,
    index: true
  },
  requestSummary: {
    type: String,
    default: null,
    maxlength: 2000
  },
  responseSummary: {
    type: String,
    default: null,
    maxlength: 2000
  },
  errorCode: {
    type: String,
    default: null
  },
  errorMessageSanitized: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  processedAt: {
    type: Date,
    default: null
  }
});

// Compound indexes
integrationEventSchema.index({ adminId: 1, idempotencyKey: 1 }, { unique: true, sparse: true });
integrationEventSchema.index({ adminId: 1, status: 1, createdAt: -1 });
integrationEventSchema.index({ status: 1, nextRetryAt: 1 });

module.exports = mongoose.model('IntegrationEvent', integrationEventSchema);
