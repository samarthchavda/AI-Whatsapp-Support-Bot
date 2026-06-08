const mongoose = require('mongoose');

const clientUsageSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  year: {
    type: Number,
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  // Gemini API usage
  geminiTokensUsed: {
    type: Number,
    default: 0
  },
  geminiTokensLimit: {
    type: Number,
    required: true,
    default: 10000
  },
  geminiCallCount: {
    type: Number,
    default: 0
  },
  // Message statistics
  totalMessages: {
    type: Number,
    default: 0
  },
  incomingMessages: {
    type: Number,
    default: 0
  },
  outgoingMessages: {
    type: Number,
    default: 0
  },
  aiResponses: {
    type: Number,
    default: 0
  },
  // WhatsApp metrics
  whatsappConnected: {
    type: Boolean,
    default: false
  },
  connectionUptime: {
    type: Number, // in hours
    default: 0
  },
  conversationCount: {
    type: Number,
    default: 0
  },
  escalationCount: {
    type: Number,
    default: 0
  },
  // Tracking
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index for unique month tracking per user
clientUsageSchema.index({ adminId: 1, year: 1, month: 1 }, { unique: true });

// Update lastUpdated on save
clientUsageSchema.pre('save', function(next) {
  this.lastUpdated = Date.now();
  next();
});

module.exports = mongoose.model('ClientUsage', clientUsageSchema);
