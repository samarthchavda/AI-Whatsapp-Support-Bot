const mongoose = require('mongoose');
const PermissionProfile = require('../models/PermissionProfile');
const { PERMISSION_PROFILES } = require('../constants/permissionProfiles');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const DEFAULT_PROFILES_META = [
  {
    key: 'starter',
    name: 'Starter CRM Profile',
    description: 'Basic access for Starter Plan merchants: Conversations, Knowledge Base, and Settings.',
    category: 'kwickbot_crm',
    isSystemDefault: true,
    pages: PERMISSION_PROFILES.starter.pages,
    permissions: PERMISSION_PROFILES.starter.permissions,
    features: { dashboardAccess: true, conversations: true, knowledgeBase: true, whatsappConnection: true }
  },
  {
    key: 'growth',
    name: 'Growth CRM Profile',
    description: 'Mid-tier access: Analytics, Broadcasts, Escalations, and WhatsApp Templates.',
    category: 'kwickbot_crm',
    isSystemDefault: true,
    pages: PERMISSION_PROFILES.growth.pages,
    permissions: PERMISSION_PROFILES.growth.permissions,
    features: { dashboardAccess: true, conversations: true, knowledgeBase: true, whatsappConnection: true, broadcasts: true, advancedAnalytics: true, humanHandoff: true }
  },
  {
    key: 'scale',
    name: 'Scale Enterprise CRM Profile',
    description: 'Full CRM access: Orders, Leads, Product catalog, and Developer API Keys.',
    category: 'kwickbot_crm',
    isSystemDefault: true,
    pages: PERMISSION_PROFILES.scale.pages,
    permissions: PERMISSION_PROFILES.scale.permissions,
    features: { dashboardAccess: true, conversations: true, knowledgeBase: true, whatsappConnection: true, broadcasts: true, advancedAnalytics: true, humanHandoff: true, internalOrders: true, internalLeads: true, developerApi: true, apiKeys: true }
  },
  {
    key: 'crm_connect',
    name: 'CRM Connect Profile',
    description: 'Inbound & outbound CRM synchronization, field mapping, and integration event logging.',
    category: 'crm_integration',
    isSystemDefault: true,
    pages: PERMISSION_PROFILES.crm_connect.pages,
    permissions: PERMISSION_PROFILES.crm_connect.permissions,
    features: { crmConnection: true, fieldMapping: true, integrationLogs: true, whatsappConnection: true }
  },
  {
    key: 'crm_automation',
    name: 'CRM Automation Profile',
    description: 'Full CRM integration plus event-triggered automated WhatsApp workflows and dead-letter replay.',
    category: 'crm_integration',
    isSystemDefault: true,
    pages: PERMISSION_PROFILES.crm_automation.pages,
    permissions: PERMISSION_PROFILES.crm_automation.permissions,
    features: { crmConnection: true, fieldMapping: true, automationRules: true, integrationLogs: true, failedEventReplay: true, whatsappConnection: true }
  },
  {
    key: 'crm_enterprise',
    name: 'CRM Enterprise Profile',
    description: 'Enterprise ERP/CRM connectors, custom webhooks, unlimited automations, and dedicated SLA.',
    category: 'crm_integration',
    isSystemDefault: true,
    pages: PERMISSION_PROFILES.crm_enterprise.pages,
    permissions: PERMISSION_PROFILES.crm_enterprise.permissions,
    features: { crmConnection: true, fieldMapping: true, automationRules: true, customWebhooks: true, integrationLogs: true, failedEventReplay: true, whatsappConnection: true, customSla: true }
  },
  {
    key: 'api_starter',
    name: 'API Starter Profile',
    description: 'Essential REST API access: API Keys, Template dispatch, Webhook configuration, and Logs.',
    category: 'whatsapp_api',
    isSystemDefault: true,
    pages: PERMISSION_PROFILES.api_starter.pages,
    permissions: PERMISSION_PROFILES.api_starter.permissions,
    features: { developerApi: true, apiKeys: true, customWebhooks: true }
  },
  {
    key: 'api_growth',
    name: 'API Growth Profile',
    description: 'High-volume REST API access with failed webhook retries and extended log retention.',
    category: 'whatsapp_api',
    isSystemDefault: true,
    pages: PERMISSION_PROFILES.api_growth.pages,
    permissions: PERMISSION_PROFILES.api_growth.permissions,
    features: { developerApi: true, apiKeys: true, customWebhooks: true, failedEventReplay: true }
  },
  {
    key: 'api_enterprise',
    name: 'API Enterprise Profile',
    description: 'Uncapped developer API throughput, dedicated webhook delivery workers, and SLA guarantee.',
    category: 'whatsapp_api',
    isSystemDefault: true,
    pages: PERMISSION_PROFILES.api_enterprise.pages,
    permissions: PERMISSION_PROFILES.api_enterprise.permissions,
    features: { developerApi: true, apiKeys: true, customWebhooks: true, failedEventReplay: true, dedicatedSupport: true, customSla: true }
  },
  {
    key: 'custom_automation',
    name: 'Custom Automation Profile',
    description: 'Deny-by-default custom profile configured individually per enterprise contract.',
    category: 'enterprise_custom',
    isSystemDefault: true,
    pages: [],
    permissions: [],
    features: {}
  }
];

async function seedProfiles(dryRun = false) {
  const isDirectRun = require.main === module;
  if (isDirectRun) {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/kwickbot';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for permission profiles seeding.');
  }

  const results = {
    created: 0,
    updated: 0,
    unchanged: 0
  };

  for (const p of DEFAULT_PROFILES_META) {
    const existing = await PermissionProfile.findOne({ key: p.key });
    if (!existing) {
      if (!dryRun) {
        await PermissionProfile.create(p);
      }
      console.log(`[CREATED] Profile '${p.name}' (${p.key})`);
      results.created++;
    } else {
      if (!dryRun) {
        existing.name = p.name;
        existing.description = p.description;
        existing.category = p.category;
        existing.isSystemDefault = true;
        // If it was system default, sync default pages/permissions if empty
        if (existing.pages.length === 0 && p.pages.length > 0) {
          existing.pages = p.pages;
          existing.permissions = p.permissions;
        }
        await existing.save();
      }
      console.log(`[PRESERVED/UPDATED] Profile '${p.name}' (${p.key})`);
      results.updated++;
    }
  }

  if (isDirectRun) {
    await mongoose.disconnect();
    console.log('Finished permission profile seeding:', results);
  }

  return results;
}

if (require.main === module) {
  const isDryRun = process.argv.includes('--dry-run');
  seedProfiles(isDryRun).catch(err => {
    console.error('Error seeding profiles:', err);
    process.exit(1);
  });
}

module.exports = {
  seedProfiles,
  DEFAULT_PROFILES_META
};
