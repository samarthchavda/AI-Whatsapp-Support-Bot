const mongoose = require('mongoose');
const crypto = require('crypto');

const integrationSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },
  platform: {
    type: String,
    enum: ['shopify', 'woocommerce', 'custom'],
    required: true
  },
  storeUrl: {
    type: String,
    required: true
  },
  apiKey: {
    type: String,
    required: true
  },
  webhookSecret: {
    type: String,
    required: true,
    unique: true,
    default: () => crypto.randomBytes(32).toString('hex')
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastSyncedAt: {
    type: Date
  },
  metadata: {
    storeName: String,
    storeEmail: String,
    totalOrdersSynced: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Index for faster lookups
integrationSchema.index({ adminId: 1, platform: 1 });
integrationSchema.index({ webhookSecret: 1 });

// Generate webhook URL
integrationSchema.methods.getWebhookUrl = function() {
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:5001';
  return `${baseUrl}/api/webhooks/${this.platform}/${this.webhookSecret}`;
};

// Verify webhook secret
integrationSchema.statics.verifyWebhookSecret = async function(platform, secret) {
  return await this.findOne({ platform, webhookSecret: secret, isActive: true });
};

module.exports = mongoose.model('Integration', integrationSchema);
