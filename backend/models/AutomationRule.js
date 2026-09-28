const mongoose = require('mongoose');

const conditionSchema = new mongoose.Schema({
  field: { type: String, required: true },
  operator: { 
    type: String, 
    required: true,
    enum: ['equals', 'not_equals', 'contains', 'greater_than', 'less_than', 'exists', 'is_empty', 'matches_regex']
  },
  value: { type: mongoose.Schema.Types.Mixed, default: null }
}, { _id: false });

const actionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['send_whatsapp_template', 'send_whatsapp_text', 'sync_crm_lead', 'create_crm_quotation', 'update_crm_order', 'trigger_webhook', 'notify_admin']
  },
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { _id: false });

const automationRuleSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  connectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CRMConnection',
    default: null,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  trigger: {
    type: String,
    required: true,
    enum: ['whatsapp_lead_received', 'order_status_updated', 'quotation_requested', 'cart_abandoned', 'custom_event'],
    index: true
  },
  conditions: {
    type: [conditionSchema],
    default: []
  },
  actions: {
    type: [actionSchema],
    default: []
  },
  approvalRequired: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'draft'],
    default: 'active',
    index: true
  },
  executionCount: {
    type: Number,
    default: 0
  },
  lastExecutedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

automationRuleSchema.index({ adminId: 1, status: 1 });
automationRuleSchema.index({ adminId: 1, trigger: 1 });

module.exports = mongoose.model('AutomationRule', automationRuleSchema);
