const mongoose = require('mongoose');

const escalationSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
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
  reason: {
    type: String,
    enum: ['refund_request', 'high_priority', 'unresolved', 'customer_request', 'complaint', 'other'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'resolved', 'closed'],
    default: 'pending'
  },
  assignedTo: {
    type: String
  },
  relatedOrderIds: [String],
  resolution: {
    type: String
  },
  resolvedAt: {
    type: Date
  },
  notificationSent: {
    type: Boolean,
    default: false
  },
  notificationMethod: {
    type: String,
    enum: ['email', 'whatsapp', 'both'],
    default: 'email'
  }
}, { 
  timestamps: true 
});

// Index for faster queries
escalationSchema.index({ status: 1, priority: -1 });
escalationSchema.index({ customerPhone: 1 });
escalationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Escalation', escalationSchema);
