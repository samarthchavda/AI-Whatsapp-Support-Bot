// Labels for the plan fields in backend/models/PricingPlan.js.
// Keys must match the model exactly.

export const CATEGORIES = [
  { value: 'kwickbot_crm', label: 'E-commerce' },
  { value: 'crm_integration', label: 'CRM' },
  { value: 'whatsapp_api', label: 'WhatsApp API' },
  { value: 'enterprise_custom', label: 'Enterprise' }
];

export const categoryLabel = (value) => CATEGORIES.find((c) => c.value === value)?.label || value;

export const FEATURE_GROUPS = [
  {
    label: 'Inbox and AI',
    items: [
      ['conversations', 'Conversations inbox'],
      ['aiAutomation', 'AI auto-replies'],
      ['aiTopupAvailable', 'AI reply top-up available after limit'],
      ['knowledgeBase', 'Knowledge base'],
      ['humanHandoff', 'Hand-off to a person'],
      ['whatsappConnection', 'WhatsApp connection'],
      ['whatsappContactSync', 'Automatic WhatsApp Business App contacts'],
      ['dashboardAccess', 'Dashboard']
    ]
  },
  {
    label: 'Commerce',
    items: [
      ['abandonedCartRecovery', 'Abandoned-cart reminders'],
      ['productCatalogSync', 'Product catalog sync'],
      ['productCatalogAi', 'AI answers from the product catalog'],
      ['internalOrders', 'Orders'],
      ['internalInvoices', 'Invoices'],
      ['internalLeads', 'Leads']
    ]
  },
  {
    label: 'Broadcasting',
    items: [
      ['broadcasts', 'Broadcast campaigns'],
      ['broadcastingAccess', 'Broadcasting page'],
      ['scheduledBroadcasts', 'Scheduled broadcasts'],
      ['audienceSegmentation', 'Audience segments'],
      ['advancedAnalytics', 'Advanced analytics']
    ]
  },
  {
    label: 'Developer',
    items: [
      ['developerApi', 'Developer API'],
      ['apiKeys', 'API keys'],
      ['customWebhooks', 'Custom webhooks'],
      ['failedEventReplay', 'Retry failed events']
    ]
  },
  {
    label: 'Support and branding',
    items: [
      ['customBranding', 'Custom branding'],
      ['prioritySupport', 'Priority support'],
      ['dedicatedSupport', 'Dedicated support'],
      ['customSla', 'Custom SLA']
    ]
  }
];

export const LIMIT_GROUPS = [
  {
    label: 'Messaging',
    items: [
      ['monthlyConversations', 'Conversations / month'],
      ['monthlyMessages', 'Messages / month'],
      ['maxAiRepliesPerMonth', 'AI replies / month', '-1 for unlimited'],
      ['geminiTokensPerMonth', 'Internal AI safety cap', 'Tokens (-1 unlimited)'],
      ['maxWhatsAppConnections', 'WhatsApp numbers']
    ]
  },
  {
    label: 'Stores and knowledge base',
    items: [
      ['maxIntegrations', 'Stores'],
      ['maxKbUploads', 'Knowledge base PDFs'],
      ['maxKbPdfPages', 'Pages per PDF', '0 means no page limit']
    ]
  },
  {
    label: 'Broadcasting',
    items: [
      ['maxBroadcastCampaigns', 'Campaigns / month'],
      ['maxBroadcastMessages', 'Broadcast messages / month']
    ]
  },
  {
    label: 'API and automation',
    items: [
      ['monthlyApiRequests', 'API requests / month'],
      ['monthlyWebhookDeliveries', 'Webhook deliveries / month'],
      ['maxApiKeys', 'API keys'],
      ['monthlyAutomationExecutions', 'Automation runs / month'],
      ['maxActiveAutomations', 'Active automations']
    ]
  },
  {
    label: 'Account',
    items: [
      ['maxTeamMembers', 'Team members'],
      ['logRetentionDays', 'Log history (days)']
    ]
  }
];

// Defaults for a new plan, matching the model defaults
export function emptyPlan() {
  const features = {};
  FEATURE_GROUPS.forEach((g) => g.items.forEach(([key]) => { features[key] = false; }));
  Object.assign(features, { dashboardAccess: true, conversations: true, whatsappConnection: true, aiAutomation: true, knowledgeBase: true });
  return {
    name: '',
    displayName: '',
    shortDescription: '',
    detailedDescription: '',
    category: 'kwickbot_crm',
    currency: 'INR',
    monthlyPrice: 0,
    yearlyPrice: null,
    setupFee: 0,
    connectorMaintenanceFee: 0,
    contactSales: false,
    trialEnabled: false,
    trialDays: 0,
    badge: '',
    isPopular: false,
    isActive: true,
    isPublished: false,
    allowedBillingCycles: ['monthly', 'yearly'],
    permissionProfile: 'default',
    allowedPages: [],
    features,
    usageLimits: {
      monthlyConversations: 500,
      monthlyMessages: 2000,
      monthlyApiRequests: 10000,
      monthlyWebhookDeliveries: 5000,
      monthlyAutomationExecutions: 1000,
      maxWhatsAppConnections: 1,
      maxKbUploads: 1,
      maxKbPdfPages: 0,
      maxIntegrations: 1,
      maxActiveAutomations: 0,
      maxApiKeys: 0,
      maxTeamMembers: 1,
      maxBroadcastCampaigns: 0,
      maxBroadcastMessages: 0,
      logRetentionDays: 30,
      maxAiRepliesPerMonth: 2000,
      geminiTokensPerMonth: 50000
    },
    supportLevel: 'Standard Email Support',
    sla: 'Best Effort'
  };
}

export const yearlySaving = (monthly, yearly) => {
  if (!(monthly > 0) || !(yearly > 0)) return 0;
  const full = monthly * 12;
  return yearly < full ? Math.round(((full - yearly) / full) * 100) : 0;
};
