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
  refreshTokens: [
    {
      hash: {
        type: String,
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      },
      expiresAt: {
        type: Date,
        required: true,
        index: true
      },
      userAgent: {
        type: String
      },
      ipAddress: {
        type: String
      }
    }
  ],
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
    default: 50000 // Default limit (Starter plan)
  },
  lastTokenReset: {
    type: Date,
    default: Date.now
  },
  totalMessagesProcessed: {
    type: Number,
    default: 0
  },
  limitNotificationSent: {
    type: Boolean,
    default: false
  },
  // Pricing
  monthlyPrice: {
    type: Number,
    default: 1499 // Starter plan default
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
  // Profile completion status
  profileCompleted: {
    type: Boolean,
    default: false
  },
  profileCompletedAt: {
    type: Date
  },
  trialStartedAt: {
    type: Date
  },
  whatsappAccessToken: {
    type: String,
    default: null
  },
  whatsappPhoneNumberId: {
    type: String,
    default: null
  },
  whatsappBusinessAccountId: {
    type: String,
    default: null
  },
  whatsappVerifyToken: {
    type: String,
    default: null
  },
  webBotEnabled: {
    type: Boolean,
    default: false
  },
  aiDraftMode: {
    type: Boolean,
    default: false
  },
  shopifyEnabled: {
    type: Boolean,
    default: true
  },
  woocommerceEnabled: {
    type: Boolean,
    default: true
  },
  // Business / Store info
  businessName: {
    type: String
  },
  businessPhone: {
    type: String
  },
  storeUrl: {
    type: String
  },
  storeCategory: {
    type: String
  },
  supportEmail: {
    type: String
  },
  currency: {
    type: String,
    default: 'USD'
  },
  timezone: {
    type: String,
    default: 'UTC'
  },
  // Theme settings
  theme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'light'
  },
  customBranding: {
    logoUrl: { type: String, default: null },
    brandName: { type: String, default: null },
    removeCredits: { type: Boolean, default: false }
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
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
