const mongoose = require('mongoose');
const { encryptCredential, decryptCredential } = require('../utils/cryptoUtil');

const crmConnectionSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  provider: {
    type: String,
    required: true,
    enum: ['odoo', 'zoho', 'salesforce', 'hubspot', 'custom'],
    lowercase: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  baseUrl: {
    type: String,
    required: true,
    trim: true
  },
  databaseName: {
    type: String,
    trim: true,
    default: null
  },
  tenantIdentifier: {
    type: String,
    trim: true,
    default: null
  },
  encryptedCredentials: {
    type: String,
    required: true
  },
  credentialVersion: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ['connected', 'disconnected', 'error', 'configuring'],
    default: 'configuring',
    index: true
  },
  lastConnectionTestAt: {
    type: Date,
    default: null
  },
  lastSuccessfulSyncAt: {
    type: Date,
    default: null
  },
  lastErrorCode: {
    type: String,
    default: null
  },
  lastErrorMessageSanitized: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  configuration: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Helper method to set credentials encrypted
crmConnectionSchema.methods.setCredentials = function(credentialsObj) {
  this.encryptedCredentials = encryptCredential(credentialsObj);
  this.credentialVersion = (this.credentialVersion || 0) + 1;
};

// Helper method to get credentials safely (server-side only)
crmConnectionSchema.methods.getCredentials = function() {
  return decryptCredential(this.encryptedCredentials);
};

// Ensure sanitized JSON transformation never leaks encryptedCredentials
crmConnectionSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.encryptedCredentials;
  obj.hasCredentials = Boolean(this.encryptedCredentials);
  return obj;
};

crmConnectionSchema.index({ adminId: 1, provider: 1 });

module.exports = mongoose.model('CRMConnection', crmConnectionSchema);
