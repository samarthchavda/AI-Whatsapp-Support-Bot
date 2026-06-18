const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    trim: true
  },
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  websiteUrl: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'proposal_sent', 'followed_up', 'converted', 'lost'],
    default: 'new'
  },
  source: {
    type: String,
    enum: ['instagram', 'linkedin', 'builtwith', 'google_maps', 'other'],
    default: 'other'
  },
  notes: {
    type: String,
    default: ''
  },
  remindAt: {
    type: Date
  },
  convertedAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
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

// Indexes for fast querying
leadSchema.index({ status: 1 });
leadSchema.index({ email: 1 });
leadSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Lead', leadSchema);
