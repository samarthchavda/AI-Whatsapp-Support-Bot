const mongoose = require('mongoose');

const crmFieldMappingSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  connectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CRMConnection',
    required: true,
    index: true
  },
  entityType: {
    type: String,
    required: true,
    enum: ['contact', 'lead', 'product', 'quotation', 'order'],
    lowercase: true,
    trim: true,
    index: true
  },
  sourceField: {
    type: String,
    required: true,
    trim: true
  },
  destinationField: {
    type: String,
    required: true,
    trim: true
  },
  transformation: {
    type: String,
    enum: ['none', 'uppercase', 'lowercase', 'trim', 'number', 'boolean', 'date', 'custom_regex'],
    default: 'none'
  },
  required: {
    type: Boolean,
    default: false
  },
  defaultValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

crmFieldMappingSchema.index({ adminId: 1, connectionId: 1, entityType: 1 });
crmFieldMappingSchema.index({ adminId: 1, connectionId: 1, entityType: 1, sourceField: 1 });

module.exports = mongoose.model('CRMFieldMapping', crmFieldMappingSchema);
