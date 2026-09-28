const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const PricingPlan = require('../models/PricingPlan');

const defaultPlans = [
  // 1. Kwickbot CRM (Active & Published)
  {
    name: 'starter',
    slug: 'starter',
    displayName: 'Starter',
    shortDescription: 'For small stores validating AI support.',
    detailedDescription: 'Essential AI WhatsApp automation and support desk features for small merchants.',
    category: 'kwickbot_crm',
    currency: 'INR',
    monthlyPrice: 1499,
    yearlyPrice: 14990,
    setupFee: 0,
    connectorMaintenanceFee: 0,
    customPricing: false,
    contactSales: false,
    trialEnabled: true,
    trialDays: 14,
    badge: null,
    displayOrder: 1,
    isPopular: false,
    isActive: true,
    isPublished: true,
    allowedBillingCycles: ['monthly', 'yearly'],
    permissionProfile: 'starter',
    allowedPages: ['dashboard', 'conversations', 'knowledge-base', 'integrations', 'profile', 'billing'],
    features: {
      dashboardAccess: true,
      conversations: true,
      internalOrders: false,
      internalInvoices: false,
      internalLeads: false,
      whatsappConnection: true,
      crmConnection: false,
      leadSync: false,
      contactSync: false,
      productLookup: false,
      quotationCreation: false,
      saleOrderCreation: false,
      orderStatusSync: false,
      fieldMapping: false,
      automationRules: false,
      customWebhooks: false,
      developerApi: false,
      apiKeys: false,
      integrationLogs: false,
      failedEventReplay: false,
      aiAutomation: true,
      knowledgeBase: true,
      broadcasts: false,
      advancedAnalytics: false,
      humanHandoff: false,
      customBranding: false,
      prioritySupport: false,
      dedicatedSupport: false,
      customSla: false
    },
    usageLimits: {
      monthlyConversations: 500,
      monthlyMessages: 2000,
      monthlyApiRequests: 10000,
      monthlyWebhookDeliveries: 5000,
      monthlyAutomationExecutions: 1000,
      maxWhatsAppConnections: 1,
      maxCrmConnections: 0,
      maxActiveAutomations: 0,
      maxApiKeys: 0,
      maxTeamMembers: 1,
      logRetentionDays: 30,
      geminiTokensPerMonth: 50000
    },
    supportLevel: 'Standard Email Support',
    sla: 'Best Effort'
  },
  {
    name: 'growth',
    slug: 'growth',
    displayName: 'Growth',
    shortDescription: 'For stores managing regular order and support volume.',
    detailedDescription: 'Full-featured AI WhatsApp automation, broadcasts, live chat handoff, and analytics.',
    category: 'kwickbot_crm',
    currency: 'INR',
    monthlyPrice: 2999,
    yearlyPrice: 29990,
    setupFee: 0,
    connectorMaintenanceFee: 0,
    customPricing: false,
    contactSales: false,
    trialEnabled: false,
    trialDays: 0,
    badge: 'BEST FIT',
    displayOrder: 2,
    isPopular: true,
    isActive: true,
    isPublished: true,
    allowedBillingCycles: ['monthly', 'yearly'],
    permissionProfile: 'growth',
    allowedPages: ['dashboard', 'conversations', 'knowledge-base', 'broadcast', 'analytics', 'escalations', 'integrations', 'profile', 'billing'],
    features: {
      dashboardAccess: true,
      conversations: true,
      internalOrders: true,
      internalInvoices: false,
      internalLeads: true,
      whatsappConnection: true,
      crmConnection: false,
      leadSync: true,
      contactSync: true,
      productLookup: true,
      quotationCreation: false,
      saleOrderCreation: false,
      orderStatusSync: true,
      fieldMapping: false,
      automationRules: true,
      customWebhooks: false,
      developerApi: false,
      apiKeys: false,
      integrationLogs: true,
      failedEventReplay: false,
      aiAutomation: true,
      knowledgeBase: true,
      broadcasts: true,
      advancedAnalytics: true,
      humanHandoff: true,
      customBranding: false,
      prioritySupport: true,
      dedicatedSupport: false,
      customSla: false
    },
    usageLimits: {
      monthlyConversations: 3000,
      monthlyMessages: 15000,
      monthlyApiRequests: 50000,
      monthlyWebhookDeliveries: 25000,
      monthlyAutomationExecutions: 10000,
      maxWhatsAppConnections: 2,
      maxCrmConnections: 1,
      maxActiveAutomations: 5,
      maxApiKeys: 1,
      maxTeamMembers: 3,
      logRetentionDays: 60,
      geminiTokensPerMonth: 200000
    },
    supportLevel: 'Priority Email & Chat Support (under 4h)',
    sla: '4-hour Response SLA'
  },
  {
    name: 'scale',
    slug: 'scale',
    displayName: 'Scale',
    shortDescription: 'For teams needing higher limits and custom workflows.',
    detailedDescription: 'High-capacity AI automation with custom branding, developer APIs, and premium support.',
    category: 'kwickbot_crm',
    currency: 'INR',
    monthlyPrice: 9999,
    yearlyPrice: 99990,
    setupFee: 0,
    connectorMaintenanceFee: 0,
    customPricing: false,
    contactSales: false,
    trialEnabled: false,
    trialDays: 0,
    badge: 'ENTERPRISE',
    displayOrder: 3,
    isPopular: false,
    isActive: true,
    isPublished: true,
    allowedBillingCycles: ['monthly', 'yearly'],
    permissionProfile: 'scale',
    allowedPages: ['dashboard', 'conversations', 'knowledge-base', 'broadcast', 'analytics', 'escalations', 'templates', 'integrations', 'orders', 'leads', 'api-keys', 'profile', 'billing'],
    features: {
      dashboardAccess: true,
      conversations: true,
      internalOrders: true,
      internalInvoices: true,
      internalLeads: true,
      whatsappConnection: true,
      crmConnection: true,
      leadSync: true,
      contactSync: true,
      productLookup: true,
      quotationCreation: true,
      saleOrderCreation: true,
      orderStatusSync: true,
      fieldMapping: true,
      automationRules: true,
      customWebhooks: true,
      developerApi: true,
      apiKeys: true,
      integrationLogs: true,
      failedEventReplay: true,
      aiAutomation: true,
      knowledgeBase: true,
      broadcasts: true,
      advancedAnalytics: true,
      humanHandoff: true,
      customBranding: true,
      prioritySupport: true,
      dedicatedSupport: true,
      customSla: true
    },
    usageLimits: {
      monthlyConversations: -1,
      monthlyMessages: -1,
      monthlyApiRequests: -1,
      monthlyWebhookDeliveries: -1,
      monthlyAutomationExecutions: -1,
      maxWhatsAppConnections: 5,
      maxCrmConnections: 3,
      maxActiveAutomations: -1,
      maxApiKeys: 5,
      maxTeamMembers: 10,
      logRetentionDays: 180,
      geminiTokensPerMonth: -1
    },
    supportLevel: 'Dedicated Account Manager & 24/7 Phone',
    sla: '99.9% Uptime & 1-hour Response SLA'
  },

  // 2. CRM Integration (Draft / Unpublished)
  {
    name: 'crm_connect',
    slug: 'crm-connect',
    displayName: 'CRM Connect',
    shortDescription: 'Connect WhatsApp support with your existing CRM.',
    detailedDescription: 'Bi-directional lead and contact synchronization with custom field mapping.',
    category: 'crm_integration',
    currency: 'INR',
    monthlyPrice: 3499,
    yearlyPrice: 34990,
    setupFee: 1499,
    connectorMaintenanceFee: 499,
    customPricing: false,
    contactSales: false,
    trialEnabled: false,
    trialDays: 0,
    badge: 'DRAFT',
    displayOrder: 1,
    isPopular: false,
    isActive: true,
    isPublished: false,
    allowedBillingCycles: ['monthly', 'yearly'],
    permissionProfile: 'crm_connect',
    allowedPages: [
      'integration-dashboard',
      'crm-connection',
      'field-mapping',
      'whatsapp-templates',
      'integration-logs',
      'whatsapp-connection',
      'usage',
      'billing',
      'settings'
    ],
    features: {
      dashboardAccess: true,
      conversations: true,
      crmConnection: true,
      leadSync: true,
      contactSync: true,
      fieldMapping: true,
      orderStatusSync: true
    },
    usageLimits: {
      monthlyConversations: 2000,
      monthlyMessages: 10000,
      maxCrmConnections: 1,
      maxWhatsAppConnections: 1
    },
    supportLevel: 'Email Support',
    sla: '12-hour Response SLA'
  },
  {
    name: 'crm_automation',
    slug: 'crm-automation',
    displayName: 'CRM Automation',
    shortDescription: 'Advanced automated sales & support workflow triggers for CRM.',
    detailedDescription: 'Automatic sale order creation, quotation creation, and failed event replays.',
    category: 'crm_integration',
    currency: 'INR',
    monthlyPrice: 6999,
    yearlyPrice: 69990,
    setupFee: 2999,
    connectorMaintenanceFee: 999,
    customPricing: false,
    contactSales: false,
    trialEnabled: false,
    trialDays: 0,
    badge: 'DRAFT',
    displayOrder: 2,
    isPopular: false,
    isActive: true,
    isPublished: false,
    allowedBillingCycles: ['monthly', 'yearly'],
    permissionProfile: 'crm_automation',
    allowedPages: [
      'integration-dashboard',
      'crm-connection',
      'field-mapping',
      'automation-rules',
      'whatsapp-templates',
      'integration-logs',
      'failed-events',
      'whatsapp-connection',
      'usage',
      'billing',
      'settings'
    ],
    features: {
      dashboardAccess: true,
      conversations: true,
      crmConnection: true,
      leadSync: true,
      contactSync: true,
      quotationCreation: true,
      saleOrderCreation: true,
      orderStatusSync: true,
      fieldMapping: true,
      automationRules: true,
      failedEventReplay: true
    },
    usageLimits: {
      monthlyConversations: 5000,
      monthlyMessages: 25000,
      maxCrmConnections: 2,
      maxWhatsAppConnections: 2
    },
    supportLevel: 'Priority Email & Chat Support',
    sla: '4-hour Response SLA'
  },
  {
    name: 'crm_enterprise',
    slug: 'crm-enterprise',
    displayName: 'CRM Enterprise',
    shortDescription: 'Tailored enterprise CRM synchronization & Odoo ERP integration.',
    detailedDescription: 'Custom integration architecture, unlimited sync operations, and custom SLA.',
    category: 'crm_integration',
    currency: 'INR',
    monthlyPrice: 0,
    yearlyPrice: 0,
    setupFee: 0,
    connectorMaintenanceFee: 0,
    customPricing: true,
    contactSales: true,
    trialEnabled: false,
    trialDays: 0,
    badge: 'ENTERPRISE',
    displayOrder: 3,
    isPopular: false,
    isActive: true,
    isPublished: false,
    allowedBillingCycles: ['monthly', 'yearly'],
    permissionProfile: 'crm_enterprise',
    allowedPages: [
      'integration-dashboard',
      'crm-connection',
      'field-mapping',
      'automation-rules',
      'webhook-configuration',
      'whatsapp-templates',
      'integration-logs',
      'failed-events',
      'whatsapp-connection',
      'usage',
      'billing',
      'settings'
    ],
    features: {
      dashboardAccess: true,
      conversations: true,
      crmConnection: true,
      leadSync: true,
      contactSync: true,
      quotationCreation: true,
      saleOrderCreation: true,
      orderStatusSync: true,
      fieldMapping: true,
      automationRules: true,
      customWebhooks: true,
      developerApi: true,
      apiKeys: true,
      integrationLogs: true,
      failedEventReplay: true,
      customSla: true
    },
    usageLimits: {
      monthlyConversations: -1,
      monthlyMessages: -1,
      maxCrmConnections: -1,
      maxWhatsAppConnections: -1
    },
    supportLevel: 'Dedicated Account Manager',
    sla: 'Custom Enterprise SLA'
  },

  // 3. WhatsApp API (Draft / Unpublished)
  {
    name: 'api_starter',
    slug: 'api-starter',
    displayName: 'API Starter',
    shortDescription: 'Official WhatsApp Cloud API endpoint access for developers.',
    detailedDescription: 'Developer API access, webhook subscriptions, and key management.',
    category: 'whatsapp_api',
    currency: 'INR',
    monthlyPrice: 1999,
    yearlyPrice: 19990,
    setupFee: 0,
    connectorMaintenanceFee: 0,
    customPricing: false,
    contactSales: false,
    trialEnabled: false,
    trialDays: 0,
    badge: 'DRAFT',
    displayOrder: 1,
    isPopular: false,
    isActive: true,
    isPublished: false,
    allowedBillingCycles: ['monthly', 'yearly'],
    permissionProfile: 'api_starter',
    allowedPages: [
      'api-dashboard',
      'api-keys',
      'api-documentation',
      'webhook-configuration',
      'whatsapp-templates',
      'api-logs',
      'api-usage',
      'billing',
      'settings'
    ],
    features: {
      dashboardAccess: true,
      conversations: true,
      whatsappConnection: true,
      developerApi: true,
      apiKeys: true,
      customWebhooks: true
    },
    usageLimits: {
      monthlyApiRequests: 50000,
      monthlyWebhookDeliveries: 25000,
      maxApiKeys: 2,
      maxWhatsAppConnections: 1
    },
    supportLevel: 'Developer Forum & Email',
    sla: 'Best Effort'
  },
  {
    name: 'api_growth',
    slug: 'api-growth',
    displayName: 'API Growth',
    shortDescription: 'High-throughput WhatsApp Cloud API infrastructure.',
    detailedDescription: 'Higher API rate limits, webhooks, failed event replays, and integration logs.',
    category: 'whatsapp_api',
    currency: 'INR',
    monthlyPrice: 4999,
    yearlyPrice: 49990,
    setupFee: 0,
    connectorMaintenanceFee: 0,
    customPricing: false,
    contactSales: false,
    trialEnabled: false,
    trialDays: 0,
    badge: 'DRAFT',
    displayOrder: 2,
    isPopular: false,
    isActive: true,
    isPublished: false,
    allowedBillingCycles: ['monthly', 'yearly'],
    permissionProfile: 'api_growth',
    allowedPages: [
      'api-dashboard',
      'api-keys',
      'api-documentation',
      'webhook-configuration',
      'whatsapp-templates',
      'api-logs',
      'failed-webhooks',
      'api-usage',
      'billing',
      'settings'
    ],
    features: {
      dashboardAccess: true,
      conversations: true,
      whatsappConnection: true,
      developerApi: true,
      apiKeys: true,
      customWebhooks: true,
      integrationLogs: true,
      failedEventReplay: true
    },
    usageLimits: {
      monthlyApiRequests: 250000,
      monthlyWebhookDeliveries: 100000,
      maxApiKeys: 5,
      maxWhatsAppConnections: 3
    },
    supportLevel: 'Priority Technical Support',
    sla: '4-hour Response SLA'
  },
  {
    name: 'api_enterprise',
    slug: 'api-enterprise',
    displayName: 'API Enterprise',
    shortDescription: 'Custom high-throughput WhatsApp Cloud API pipeline for heavy enterprise loads.',
    detailedDescription: 'Unlimited API throughput, custom webhook endpoints, and dedicated throughput pipeline.',
    category: 'whatsapp_api',
    currency: 'INR',
    monthlyPrice: 0,
    yearlyPrice: 0,
    setupFee: 0,
    connectorMaintenanceFee: 0,
    customPricing: true,
    contactSales: true,
    trialEnabled: false,
    trialDays: 0,
    badge: 'ENTERPRISE',
    displayOrder: 3,
    isPopular: false,
    isActive: true,
    isPublished: false,
    allowedBillingCycles: ['monthly', 'yearly'],
    permissionProfile: 'api_enterprise',
    allowedPages: [
      'api-dashboard',
      'api-keys',
      'api-documentation',
      'webhook-configuration',
      'whatsapp-templates',
      'api-logs',
      'failed-webhooks',
      'api-usage',
      'billing',
      'settings'
    ],
    features: {
      dashboardAccess: true,
      conversations: true,
      whatsappConnection: true,
      developerApi: true,
      apiKeys: true,
      customWebhooks: true,
      integrationLogs: true,
      failedEventReplay: true,
      dedicatedSupport: true,
      customSla: true
    },
    usageLimits: {
      monthlyApiRequests: -1,
      monthlyWebhookDeliveries: -1,
      maxApiKeys: -1,
      maxWhatsAppConnections: -1
    },
    supportLevel: 'Dedicated Technical Account Manager',
    sla: '99.99% Uptime & 1-hour SLA'
  },

  // 4. Enterprise Custom (Draft / Unpublished)
  {
    name: 'custom_automation',
    slug: 'custom-automation',
    displayName: 'Custom Automation',
    shortDescription: 'Fully tailored multi-channel AI and CRM automation solution.',
    detailedDescription: 'Bespoke AI logic, custom ERP integrations, dedicated server deployment, and custom SLA.',
    category: 'enterprise_custom',
    currency: 'INR',
    monthlyPrice: 0,
    yearlyPrice: 0,
    setupFee: 0,
    connectorMaintenanceFee: 0,
    customPricing: true,
    contactSales: true,
    trialEnabled: false,
    trialDays: 0,
    badge: 'CUSTOM',
    displayOrder: 1,
    isPopular: false,
    isActive: true,
    isPublished: false,
    allowedBillingCycles: ['monthly', 'yearly'],
    permissionProfile: 'custom_automation',
    allowedPages: [],
    features: {
      dashboardAccess: true,
      conversations: true,
      internalOrders: true,
      internalInvoices: true,
      internalLeads: true,
      whatsappConnection: true,
      crmConnection: true,
      leadSync: true,
      contactSync: true,
      productLookup: true,
      quotationCreation: true,
      saleOrderCreation: true,
      orderStatusSync: true,
      fieldMapping: true,
      automationRules: true,
      customWebhooks: true,
      developerApi: true,
      apiKeys: true,
      integrationLogs: true,
      failedEventReplay: true,
      aiAutomation: true,
      knowledgeBase: true,
      broadcasts: true,
      advancedAnalytics: true,
      humanHandoff: true,
      customBranding: true,
      prioritySupport: true,
      dedicatedSupport: true,
      customSla: true
    },
    usageLimits: {
      monthlyConversations: -1,
      monthlyMessages: -1,
      monthlyApiRequests: -1,
      monthlyWebhookDeliveries: -1,
      monthlyAutomationExecutions: -1,
      maxWhatsAppConnections: -1,
      maxCrmConnections: -1,
      maxActiveAutomations: -1,
      maxApiKeys: -1,
      maxTeamMembers: -1,
      logRetentionDays: 365,
      geminiTokensPerMonth: -1
    },
    supportLevel: 'Dedicated Solutions Architect & 24/7 Line',
    sla: 'Custom Dedicated SLA'
  }
];

const LEGACY_PROFILE_KEYS_BY_PLAN = {
  crm_connect: ['crm_basic'],
  crm_automation: ['crm_advanced'],
  crm_enterprise: ['enterprise'],
  api_starter: ['api_basic'],
  api_growth: ['api_advanced'],
  api_enterprise: ['enterprise'],
  custom_automation: ['enterprise']
};

function requiresCanonicalAccessUpgrade(existingPlan, canonicalPlan) {
  const legacyKeys = LEGACY_PROFILE_KEYS_BY_PLAN[canonicalPlan.name] || [];
  return legacyKeys.includes(existingPlan.permissionProfile);
}

async function runMigration(options = {}) {
  const isDryRun = options.dryRun || process.argv.includes('--dry-run') || process.argv.includes('-d');
  const isQuiet = options.quiet || false;

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp_ai_db';
    if (mongoose.connection.readyState === 0) {
      if (!isQuiet) console.log('🔄 Connecting to MongoDB for pricing plan migration...');
      try {
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
        if (!isQuiet) console.log('✅ Connected to MongoDB.');
      } catch (connErr) {
        if (!isQuiet) console.warn('⚠️ MongoDB not available for pricing plan migration:', connErr.message);
        return { totalPlanCount: defaultPlans.length, isOffline: true };
      }
    }

    if (mongoose.connection.readyState !== 1) {
      return { totalPlanCount: defaultPlans.length, isOffline: true };
    }

    let createdCount = 0;
    let preservedCount = 0;

    for (const planData of defaultPlans) {
      // Primary match by stable slug, secondary fallback by name
      let existing = await PricingPlan.findOne({ slug: planData.slug });
      if (!existing) {
        existing = await PricingPlan.findOne({ name: planData.name });
      }

      if (!existing) {
        if (isDryRun) {
          if (!isQuiet) console.log(`[WOULD CREATE DRAFT] ${planData.displayName} (${planData.slug}) - Cat: ${planData.category}`);
        } else {
          await PricingPlan.create(planData);
          if (!isQuiet) console.log(`[CREATED DRAFT] ${planData.displayName} (${planData.slug}) - Cat: ${planData.category}`);
        }
        createdCount++;
      } else {
        // Record exists: preserve existing prices, features, limits, permissions, and publication status untouched
        let needsSave = false;

        if (!existing.slug) {
          existing.slug = planData.slug;
          needsSave = true;
        }
        if (!existing.category) {
          existing.category = planData.category;
          needsSave = true;
        }
        if (!existing.permissionProfile) {
          existing.permissionProfile = planData.permissionProfile;
          needsSave = true;
        }

        // Upgrade known legacy access definitions even after a standard plan was published.
        // Arbitrary Super Admin profile customizations remain untouched.
        const legacyAccessDefinition = requiresCanonicalAccessUpgrade(existing, planData);
        const incompleteDraftDefinition = !existing.isPublished && planData.permissionProfile && (
          existing.permissionProfile !== planData.permissionProfile ||
          !Array.isArray(existing.allowedPages) ||
          ((planData.allowedPages || []).length > 0 && existing.allowedPages.length === 0)
        );

        if (legacyAccessDefinition || incompleteDraftDefinition) {
          existing.permissionProfile = planData.permissionProfile;
          existing.allowedPages = [...(planData.allowedPages || [])];
          needsSave = true;
        }

        if (needsSave && !isDryRun) {
          await existing.save();
        }

        if (!isQuiet) console.log(`[PRESERVED] ${existing.displayName} (${existing.slug}) - Published: ${existing.isPublished}`);
        preservedCount++;
      }
    }

    // Post-migration stats verification & audit reporting
    const allPlans = await PricingPlan.find({});
    const Admin = require('../models/Admin');
    
    const categoryCounts = {
      kwickbot_crm: 0,
      crm_integration: 0,
      whatsapp_api: 0,
      enterprise_custom: 0
    };

    let publishedCount = 0;
    let draftCount = 0;
    const slugMap = {};
    let duplicateSlugCount = 0;

    allPlans.forEach(p => {
      const cat = p.category || 'kwickbot_crm';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

      if (p.isPublished) {
        publishedCount++;
      } else {
        draftCount++;
      }

      if (p.slug) {
        if (slugMap[p.slug]) {
          duplicateSlugCount++;
        } else {
          slugMap[p.slug] = true;
        }
      }
    });

    const activeSubscribersCount = await Admin.countDocuments({
      role: { $ne: 'super_admin' },
      subscriptionStatus: 'active'
    });

    const report = {
      totalPlanCount: allPlans.length,
      categoryCounts,
      publishedCount,
      draftCount,
      duplicateSlugCount,
      createdCount,
      preservedCount,
      activeSubscribersCount,
      isDryRun
    };

    if (!isQuiet) {
      console.log(`\n🎉 Pricing plan migration completed! (${isDryRun ? 'DRY-RUN MODE' : 'LIVE MODE'})`);
      console.log(` ── Total Plans: ${report.totalPlanCount}`);
      console.log(` ── Published: ${report.publishedCount} | Draft/Unpublished: ${report.draftCount}`);
      console.log(` ── Created: ${report.createdCount} | Preserved: ${report.preservedCount}`);
      console.log(` ── Category Breakdown:`, categoryCounts);
      console.log(` ── Duplicate Slugs: ${report.duplicateSlugCount}`);
      console.log(` ── Active Subscriber References Valid: ${report.activeSubscribersCount} active subscribers\n`);
    }

    return report;
  } catch (error) {
    console.error('❌ Error running pricing plan migration:', error);
    throw error;
  }
}

if (require.main === module) {
  runMigration()
    .then(() => {
      mongoose.disconnect();
      process.exit(0);
    })
    .catch(() => process.exit(1));
}

module.exports = { defaultPlans, runMigration, requiresCanonicalAccessUpgrade };
