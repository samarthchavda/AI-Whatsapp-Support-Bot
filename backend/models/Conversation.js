const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  customerPhone: {
    type: String,
    required: true,
    index: true
  },
  customerName: {
    type: String,
    required: true
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true
    },
    content: {
      type: String,
      required: false,
      default: ''
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    intent: {
      type: String,
      enum: ['order_status', 'cancel_order', 'return_policy', 'refund_request', 'complaint', 'general_inquiry', 'other'],
      default: 'other'
    }
  }],
  status: {
    type: String,
    enum: ['active', 'resolved', 'escalated', 'closed'],
    default: 'active'
  },
  escalated: {
    type: Boolean,
    default: false
  },
  escalationReason: {
    type: String,
    enum: [null, 'refund_request', 'complaint', 'high_priority', 'unresolved', 'customer_request', 'system_error', 'other'],
    default: null
  },
  escalatedAt: {
    type: Date
  },
  resolvedAt: {
    type: Date
  },
  satisfaction: {
    type: Number,
    min: 1,
    max: 5
  },
  tags: [String],
  relatedOrderIds: [String],
  metadata: {
    aiModel: String,
    totalTokens: Number,
    responseTime: Number
  }
}, { 
  timestamps: true 
});

// Index for faster queries
conversationSchema.index({ customerPhone: 1, createdAt: -1 });
conversationSchema.index({ status: 1 });
conversationSchema.index({ escalated: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);
