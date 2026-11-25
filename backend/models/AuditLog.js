const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    index: true
  },
  panel: {
    type: String,
    enum: ['super_admin', 'admin', 'system'],
    default: 'system',
    index: true
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  actorEmail: {
    type: String,
    required: true
  },
  actorRole: {
    type: String,
    default: null,
    index: true
  },
  target: {
    type: String,
    default: null
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

auditLogSchema.index({ panel: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
