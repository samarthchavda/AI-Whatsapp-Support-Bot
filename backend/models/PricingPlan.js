const mongoose = require('mongoose');

const pricingPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['starter', 'professional', 'enterprise', 'custom']
  },
  displayName: {
    type: String,
    required: true // e.g., "Starter Plan", "Pro Plan"
  },
  description: {
    type: String,
    default: ''
  },
  monthlyPrice: {
    type: Number,
    required: true,
    default: 0
  },
  yearlyPrice: {
    type: Number,
    default: null
  },
  // Plan features
  features: {
    maxConversations: {
      type: Number,
      default: -1 // -1 means unlimited
    },
    maxMessages: {
      type: Number,
      default: -1 // -1 means unlimited
    },
    geminiTokensPerMonth: {
      type: Number,
      required: true,
      default: 10000
    },
    maxWhatsAppConnections: {
      type: Number,
      default: 1
    },
    maxKbUploads: {
      type: Number,
      default: -1 // -1 means unlimited
    },
    maxIntegrations: {
      type: Number,
      default: -1 // -1 means unlimited
    },
    advancedAnalytics: {
      type: Boolean,
      default: false
    },
    customBranding: {
      type: Boolean,
      default: false
    },
    liveChat: {
      type: Boolean,
      default: false
    },
    knowledgeBase: {
      type: Boolean,
      default: false
    },
    integrations: {
      type: Boolean,
      default: false
    },
    apiAccess: {
      type: Boolean,
      default: false
    },
    prioritySupport: {
      type: Boolean,
      default: false
    },
    customDiscounts: [String] // Array of feature descriptions
  },
  badge: {
    type: String,
    default: null // e.g., "POPULAR" for professional plan
  },
  isActive: {
    type: Boolean,
    default: true
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

// Update updatedAt on save
pricingPlanSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('PricingPlan', pricingPlanSchema);
