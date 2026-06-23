const mongoose = require('mongoose');

const demoRequestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  businessName: {
    type: String,
    required: true,
    trim: true
  },
  businessDetails: {
    type: String,
    required: true
  },
  websiteUrl: {
    type: String,
    required: false,
    default: '',
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'contacted', 'scheduled', 'completed', 'cancelled'],
    default: 'pending'
  },
  approved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  approvedAt: {
    type: Date
  },
  adminCreated: {
    type: Boolean,
    default: false
  },
  createdAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  generatedPassword: {
    type: String
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  contactedAt: {
    type: Date
  }
});

// Index for faster queries
demoRequestSchema.index({ email: 1 });
demoRequestSchema.index({ status: 1 });
demoRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('DemoRequest', demoRequestSchema);
