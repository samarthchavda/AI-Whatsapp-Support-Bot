const mongoose = require('mongoose');

const ticketMessageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['merchant', 'support_agent', 'system'],
    default: 'merchant'
  },
  senderName: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  attachments: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const supportTicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  merchantName: {
    type: String,
    required: true
  },
  merchantEmail: {
    type: String,
    required: true,
    index: true
  },
  merchantPhone: {
    type: String,
    default: ''
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'technical',
      'shopify_integration',
      'whatsapp_api',
      'billing',
      'bot_training',
      'feature_request',
      'other'
    ],
    default: 'technical',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index: true
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open',
    index: true
  },
  description: {
    type: String,
    required: true
  },
  attachments: [{
    type: String
  }],
  messages: [ticketMessageSchema],
  assignedTo: {
    type: String,
    default: 'Unassigned'
  },
  resolutionNote: {
    type: String,
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound indexes for fast tenant and super admin lookups
supportTicketSchema.index({ admin: 1, createdAt: -1 });
supportTicketSchema.index({ admin: 1, status: 1 });
supportTicketSchema.index({ status: 1, priority: -1, createdAt: -1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
