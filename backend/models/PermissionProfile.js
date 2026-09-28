const mongoose = require('mongoose');

const permissionProfileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  key: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['kwickbot_crm', 'crm_integration', 'whatsapp_api', 'enterprise_custom', 'system'],
    default: 'system'
  },
  pages: {
    type: [String],
    default: []
  },
  permissions: {
    type: [String],
    default: []
  },
  features: {
    type: Map,
    of: Boolean,
    default: {}
  },
  usageLimitDefaults: {
    type: Map,
    of: Number,
    default: {}
  },
  isSystemDefault: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PermissionProfile', permissionProfileSchema);
