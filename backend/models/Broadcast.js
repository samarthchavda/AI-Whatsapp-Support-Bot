const mongoose = require('mongoose');

const broadcastSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true
  },
  recipients: [{
    phone: {
      type: String,
      required: true
    },
    name: String,
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'queued'],
      default: 'pending'
    },
    sentAt: Date,
    error: String
  }],
  totalRecipients: {
    type: Number,
    default: 0
  },
  sentCount: {
    type: Number,
    default: 0
  },
  failedCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled'],
    default: 'draft'
  },
  scheduledFor: {
    type: Date
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  createdByName: {
    type: String,
    required: true
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  csvFileName: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
broadcastSchema.index({ status: 1 });
broadcastSchema.index({ scheduledFor: 1 });
broadcastSchema.index({ createdAt: -1 });
broadcastSchema.index({ admin: 1, createdAt: -1 });

// Update the updatedAt timestamp before saving
broadcastSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Broadcast', broadcastSchema);
