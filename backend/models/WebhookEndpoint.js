const mongoose = require('mongoose');
const { encryptCredential, decryptCredential } = require('../utils/cryptoUtil');

const webhookEndpointSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    required: true,
    trim: true
  },
  encryptedSigningSecret: {
    type: String,
    required: true
  },
  subscribedEvents: {
    type: [String],
    default: ['*']
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  lastDeliveryAt: {
    type: Date,
    default: null
  },
  failureCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

webhookEndpointSchema.methods.setSigningSecret = function(secret) {
  this.encryptedSigningSecret = encryptCredential(secret);
};

webhookEndpointSchema.methods.getSigningSecret = function() {
  return decryptCredential(this.encryptedSigningSecret);
};

webhookEndpointSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.encryptedSigningSecret;
  obj.hasSecret = Boolean(this.encryptedSigningSecret);
  return obj;
};

webhookEndpointSchema.index({ adminId: 1, isActive: 1 });

module.exports = mongoose.model('WebhookEndpoint', webhookEndpointSchema);
