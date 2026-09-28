const mongoose = require('mongoose');

const pricingPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String,
    default: ''
  },
  detailedDescription: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    required: true,
    enum: ['kwickbot_crm', 'crm_integration', 'whatsapp_api', 'enterprise_custom'],
    default: 'kwickbot_crm'
  },
  currency: {
    type: String,
    default: 'INR',
    uppercase: true,
    trim: true
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
  setupFee: {
    type: Number,
    default: 0
  },
  connectorMaintenanceFee: {
    type: Number,
    default: 0
  },
  customPricing: {
    type: Boolean,
    default: false
  },
  contactSales: {
    type: Boolean,
    default: false
  },
  trialEnabled: {
    type: Boolean,
    default: false
  },
  trialDays: {
    type: Number,
    default: 0
  },
  badge: {
    type: String,
    default: null
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPublished: {
    type: Boolean,
    default: true
  },
  allowedBillingCycles: {
    type: [String],
    enum: ['monthly', 'yearly'],
    default: ['monthly', 'yearly']
  },
  permissionProfile: {
    type: String,
    default: 'default'
  },
  allowedPages: {
    type: [String],
    default: []
  },
  features: {
    dashboardAccess: { type: Boolean, default: true },
    conversations: { type: Boolean, default: true },
    internalOrders: { type: Boolean, default: false },
    internalInvoices: { type: Boolean, default: false },
    internalLeads: { type: Boolean, default: false },
    whatsappConnection: { type: Boolean, default: true },
    crmConnection: { type: Boolean, default: false },
    leadSync: { type: Boolean, default: false },
    contactSync: { type: Boolean, default: false },
    productLookup: { type: Boolean, default: false },
    quotationCreation: { type: Boolean, default: false },
    saleOrderCreation: { type: Boolean, default: false },
    orderStatusSync: { type: Boolean, default: false },
    fieldMapping: { type: Boolean, default: false },
    automationRules: { type: Boolean, default: false },
    customWebhooks: { type: Boolean, default: false },
    developerApi: { type: Boolean, default: false },
    apiKeys: { type: Boolean, default: false },
    integrationLogs: { type: Boolean, default: false },
    failedEventReplay: { type: Boolean, default: false },
    aiAutomation: { type: Boolean, default: true },
    knowledgeBase: { type: Boolean, default: true },
    broadcasts: { type: Boolean, default: false },
    advancedAnalytics: { type: Boolean, default: false },
    humanHandoff: { type: Boolean, default: false },
    customBranding: { type: Boolean, default: false },
    prioritySupport: { type: Boolean, default: false },
    dedicatedSupport: { type: Boolean, default: false },
    customSla: { type: Boolean, default: false }
  },
  usageLimits: {
    monthlyConversations: { type: Number, default: 500 },
    monthlyMessages: { type: Number, default: 2000 },
    monthlyApiRequests: { type: Number, default: 10000 },
    monthlyWebhookDeliveries: { type: Number, default: 5000 },
    monthlyAutomationExecutions: { type: Number, default: 1000 },
    maxWhatsAppConnections: { type: Number, default: 1 },
    maxCrmConnections: { type: Number, default: 0 },
    maxActiveAutomations: { type: Number, default: 0 },
    maxApiKeys: { type: Number, default: 0 },
    maxTeamMembers: { type: Number, default: 1 },
    logRetentionDays: { type: Number, default: 30 },
    geminiTokensPerMonth: { type: Number, default: 50000 }
  },
  supportLevel: {
    type: String,
    default: 'Standard Email Support'
  },
  sla: {
    type: String,
    default: 'Best Effort'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PricingPlan', pricingPlanSchema);
