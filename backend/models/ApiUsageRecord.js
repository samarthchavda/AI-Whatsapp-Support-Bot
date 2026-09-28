const mongoose = require('mongoose');

const apiUsageRecordSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  metric: {
    type: String,
    required: true,
    enum: [
      'api_requests',
      'webhook_deliveries',
      'automation_executions',
      'conversations',
      'messages',
      'crm_sync'
    ],
    index: true
  },
  quantity: {
    type: Number,
    default: 1
  },
  billingPeriod: {
    type: String, // 'YYYY-MM'
    required: true,
    index: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

apiUsageRecordSchema.index({ adminId: 1, metric: 1, billingPeriod: 1 });
apiUsageRecordSchema.index({ adminId: 1, createdAt: -1 });

module.exports = mongoose.model('ApiUsageRecord', apiUsageRecordSchema);
