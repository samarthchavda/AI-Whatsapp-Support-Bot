const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'manager', 'agent'],
    default: 'admin'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  // Subscription fields
  subscriptionPlan: {
    type: String,
    enum: ['starter', 'professional', 'enterprise', 'custom'],
    default: 'starter'
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'inactive', 'trial', 'cancelled'],
    default: 'trial'
  },
  subscriptionStartDate: {
    type: Date,
    default: Date.now
  },
  subscriptionEndDate: {
    type: Date
  },
  // Usage tracking
  geminiTokensUsed: {
    type: Number,
    default: 0
  },
  geminiTokensLimit: {
    type: Number,
    default: 10000 // Default limit
  },
  lastTokenReset: {
    type: Date,
    default: Date.now
  },
  totalMessagesProcessed: {
    type: Number,
    default: 0
  },
  // Pricing
  monthlyPrice: {
    type: Number,
    default: 29 // Starter plan default
  },
  customDiscount: {
    type: Number,
    default: 0 // Percentage discount
  },
  // WhatsApp connection
  whatsappConnected: {
    type: Boolean,
    default: false
  },
  whatsappConnectedAt: {
    type: Date
  },
  // Business info
  businessName: {
    type: String
  },
  businessPhone: {
    type: String
  }
}, {
  timestamps: true
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);
