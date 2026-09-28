const PermissionProfile = require('../../models/PermissionProfile');
const PricingPlan = require('../../models/PricingPlan');
const Admin = require('../../models/Admin');
const { CANONICAL_PAGES, CANONICAL_PERMISSIONS } = require('../../constants/permissions');
const { PERMISSION_PROFILES } = require('../../constants/permissionProfiles');
const auditLogService = require('../../services/auditLogService');

/**
 * Super Admin Permission Profiles Controller
 */

// Get all permission profiles with assigned counts
exports.getAllPermissionProfiles = async (req, res) => {
  try {
    const { includeArchived } = req.query;
    const filter = includeArchived === 'true' ? {} : { isArchived: { $ne: true } };

    const profiles = await PermissionProfile.find(filter).sort({ isSystemDefault: -1, createdAt: 1 });

    // Fetch counts of assigned plans per profile key
    const planCounts = await PricingPlan.aggregate([
      { $group: { _id: '$permissionProfile', count: { $sum: 1 } } }
    ]);
    const planCountMap = {};
    planCounts.forEach(pc => {
      if (pc._id) planCountMap[pc._id] = pc.count;
    });

    // Fetch counts of assigned users per profile key
    const userCounts = await Admin.aggregate([
      {
        $match: { role: { $ne: 'super_admin' } }
      },
      {
        $group: {
          _id: { $ifNull: ['$customPermissionProfile', '$subscriptionPlan'] },
          count: { $sum: 1 }
        }
      }
    ]);
    const userCountMap = {};
    userCounts.forEach(uc => {
      if (uc._id) userCountMap[uc._id] = uc.count;
    });

    const enriched = profiles.map(prof => {
      const p = prof.toObject();
      p.assignedPlansCount = planCountMap[p.key] || 0;
      p.assignedUsersCount = userCountMap[p.key] || 0;
      return p;
    });

    res.json({
      success: true,
      data: enriched
    });
  } catch (error) {
    console.error('Error fetching permission profiles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch permission profiles'
    });
  }
};

// Get canonical pages and permissions metadata for UI rendering
exports.getCanonicalMetadata = async (req, res) => {
  try {
    const pageGroups = {
      kwickbot_crm: [
        { key: CANONICAL_PAGES.DASHBOARD, label: 'Merchant Dashboard', description: 'Overview statistics and quick actions' },
        { key: CANONICAL_PAGES.CONVERSATIONS, label: 'Conversations & Live Chat', description: 'Customer chat and inbox' },
        { key: CANONICAL_PAGES.KNOWLEDGE_BASE, label: 'AI Knowledge Base', description: 'AI training documents and FAQ entries' },
        { key: CANONICAL_PAGES.BROADCAST, label: 'Broadcast Campaigns', description: 'Mass WhatsApp broadcast manager' },
        { key: CANONICAL_PAGES.ANALYTICS, label: 'Analytics & Reports', description: 'Performance and response analytics' },
        { key: CANONICAL_PAGES.ESCALATIONS, label: 'Escalations / Human Handoff', description: 'Agent takeover queue' },
        { key: CANONICAL_PAGES.TEMPLATES, label: 'Message Templates', description: 'Pre-approved message templates' },
        { key: CANONICAL_PAGES.ORDERS, label: 'Orders Management', description: 'Store orders and fulfillment' },
        { key: CANONICAL_PAGES.LEADS, label: 'Leads CRM', description: 'Capture and manage leads' }
      ],
      crm_integration: [
        { key: CANONICAL_PAGES.INTEGRATION_DASHBOARD, label: 'Integration Dashboard', description: 'Sync metrics, event throughput, and health' },
        { key: CANONICAL_PAGES.CRM_CONNECTION, label: 'CRM / ERP Connections', description: 'Configure external CRM credentials & sync' },
        { key: CANONICAL_PAGES.FIELD_MAPPING, label: 'Field Mapping', description: 'Bi-directional field schema transformer' },
        { key: CANONICAL_PAGES.AUTOMATION_RULES, label: 'Automation Rules', description: 'Workflow trigger and action rule engine' },
        { key: CANONICAL_PAGES.WHATSAPP_TEMPLATES, label: 'WhatsApp Templates', description: 'Template mapping for CRM automation' },
        { key: CANONICAL_PAGES.INTEGRATION_LOGS, label: 'Integration Logs', description: 'Real-time sync and payload audit logs' },
        { key: CANONICAL_PAGES.FAILED_EVENTS, label: 'Failed Events Queue', description: 'Replay and inspect sync errors' },
        { key: CANONICAL_PAGES.WHATSAPP_CONNECTION, label: 'WhatsApp Connection', description: 'Cloud API connection setup' }
      ],
      whatsapp_api: [
        { key: CANONICAL_PAGES.API_DASHBOARD, label: 'API Platform Dashboard', description: 'API throughput, latency, and quota metrics' },
        { key: CANONICAL_PAGES.API_KEYS, label: 'API Keys Management', description: 'Generate and revoke scoped REST API keys' },
        { key: CANONICAL_PAGES.API_DOCUMENTATION, label: 'API Documentation & Sandbox', description: 'Interactive OpenAPI sandbox & code examples' },
        { key: CANONICAL_PAGES.WEBHOOK_CONFIGURATION, label: 'Webhook Configuration', description: 'Register endpoints for inbound message events' },
        { key: CANONICAL_PAGES.API_LOGS, label: 'API Request Logs', description: 'Searchable developer request and response logs' },
        { key: CANONICAL_PAGES.FAILED_WEBHOOKS, label: 'Failed Webhook Deliveries', description: 'Inspect and manually retry failed webhooks' },
        { key: CANONICAL_PAGES.API_USAGE, label: 'API Usage & Limits', description: 'Token consumption, quotas, and burst rates' }
      ],
      account_shared: [
        { key: CANONICAL_PAGES.INTEGRATIONS, label: 'E-commerce Integrations', description: 'Shopify / WooCommerce sync' },
        { key: CANONICAL_PAGES.USAGE, label: 'Usage & Quotas', description: 'Plan quota consumption overview' },
        { key: CANONICAL_PAGES.PROFILE, label: 'Profile & Business Settings', description: 'Store identity and profile details' },
        { key: CANONICAL_PAGES.BILLING, label: 'Billing & Invoices', description: 'Plan subscription, invoices, and payment' },
        { key: CANONICAL_PAGES.SETTINGS, label: 'Platform Settings', description: 'Notification and security settings' }
      ]
    };

    const permissionGroups = {
      crm_integration: [
        { key: CANONICAL_PERMISSIONS.INTEGRATION_DASHBOARD_VIEW, label: 'View Integration Dashboard' },
        { key: CANONICAL_PERMISSIONS.CRM_CONNECTION_VIEW, label: 'View CRM Connections' },
        { key: CANONICAL_PERMISSIONS.CRM_CONNECTION_MANAGE, label: 'Create/Edit CRM Connections' },
        { key: CANONICAL_PERMISSIONS.FIELD_MAPPING_VIEW, label: 'View Field Mappings' },
        { key: CANONICAL_PERMISSIONS.FIELD_MAPPING_MANAGE, label: 'Modify Field Mappings' },
        { key: CANONICAL_PERMISSIONS.AUTOMATION_RULES_VIEW, label: 'View Automation Rules' },
        { key: CANONICAL_PERMISSIONS.AUTOMATION_RULES_MANAGE, label: 'Create/Edit Automation Rules' },
        { key: CANONICAL_PERMISSIONS.INTEGRATION_LOGS_VIEW, label: 'View Integration Sync Logs' },
        { key: CANONICAL_PERMISSIONS.FAILED_EVENTS_VIEW, label: 'View Failed Events' },
        { key: CANONICAL_PERMISSIONS.FAILED_EVENTS_RETRY, label: 'Retry / Replay Failed Events' },
        { key: CANONICAL_PERMISSIONS.WHATSAPP_CONNECTION_VIEW, label: 'View WhatsApp Connection' },
        { key: CANONICAL_PERMISSIONS.WHATSAPP_CONNECTION_MANAGE, label: 'Manage WhatsApp Connection' },
        { key: CANONICAL_PERMISSIONS.WHATSAPP_TEMPLATES_VIEW, label: 'View WhatsApp Templates' },
        { key: CANONICAL_PERMISSIONS.WHATSAPP_TEMPLATES_MANAGE, label: 'Manage WhatsApp Templates' }
      ],
      whatsapp_api: [
        { key: CANONICAL_PERMISSIONS.API_DASHBOARD_VIEW, label: 'View API Dashboard' },
        { key: CANONICAL_PERMISSIONS.API_KEYS_VIEW, label: 'View API Keys' },
        { key: CANONICAL_PERMISSIONS.API_KEYS_MANAGE, label: 'Create / Revoke API Keys' },
        { key: CANONICAL_PERMISSIONS.API_DOCUMENTATION_VIEW, label: 'View API Documentation' },
        { key: CANONICAL_PERMISSIONS.WEBHOOK_CONFIGURATION_VIEW, label: 'View Webhook Configuration' },
        { key: CANONICAL_PERMISSIONS.WEBHOOK_CONFIGURATION_MANAGE, label: 'Create / Edit Webhooks' },
        { key: CANONICAL_PERMISSIONS.API_LOGS_VIEW, label: 'View Developer API Logs' },
        { key: CANONICAL_PERMISSIONS.FAILED_WEBHOOKS_VIEW, label: 'View Failed Webhooks' },
        { key: CANONICAL_PERMISSIONS.FAILED_WEBHOOKS_RETRY, label: 'Retry Failed Webhooks' },
        { key: CANONICAL_PERMISSIONS.API_USAGE_VIEW, label: 'View API Usage & Quotas' }
      ],
      general: [
        { key: CANONICAL_PERMISSIONS.USAGE_VIEW, label: 'View Platform Usage & Quotas' },
        { key: CANONICAL_PERMISSIONS.BILLING_VIEW, label: 'View Billing & Invoices' },
        { key: CANONICAL_PERMISSIONS.SETTINGS_VIEW, label: 'View Account Settings' },
        { key: CANONICAL_PERMISSIONS.SETTINGS_MANAGE, label: 'Modify Account Settings' }
      ]
    };

    res.json({
      success: true,
      data: {
        pageGroups,
        permissionGroups,
        categories: [
          { id: 'kwickbot_crm', name: 'Kwickbot CRM' },
          { id: 'crm_integration', name: 'CRM Integration' },
          { id: 'whatsapp_api', name: 'WhatsApp API' },
          { id: 'enterprise_custom', name: 'Enterprise Custom' },
          { id: 'system', name: 'System / Custom' }
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching canonical metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch canonical metadata'
    });
  }
};

// Get single permission profile by ID
exports.getPermissionProfileById = async (req, res) => {
  try {
    const { id } = req.params;
    const profile = await PermissionProfile.findById(id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Permission profile not found'
      });
    }

    const assignedPlans = await PricingPlan.find({ permissionProfile: profile.key })
      .select('name displayName category monthlyPrice isPublished');

    const assignedUsersCount = await Admin.countDocuments({
      $or: [
        { customPermissionProfile: profile.key },
        { customPermissionProfile: { $exists: false }, subscriptionPlan: profile.key }
      ],
      role: { $ne: 'super_admin' }
    });

    res.json({
      success: true,
      data: {
        profile,
        assignedPlans,
        assignedUsersCount
      }
    });
  } catch (error) {
    console.error('Error fetching permission profile by ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch permission profile'
    });
  }
};

// Create new permission profile
exports.createPermissionProfile = async (req, res) => {
  try {
    const { name, key, description, category, pages, permissions, features, usageLimitDefaults } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Profile name is required' });
    }

    const formattedKey = (key || name).toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/(^_|_$)/g, '');
    if (!formattedKey) {
      return res.status(400).json({ success: false, error: 'Valid profile key is required' });
    }

    const existing = await PermissionProfile.findOne({ key: formattedKey });
    if (existing) {
      return res.status(400).json({ success: false, error: `A permission profile with key "${formattedKey}" already exists.` });
    }

    const newProfile = new PermissionProfile({
      name: name.trim(),
      key: formattedKey,
      description: description || '',
      category: category || 'system',
      pages: Array.isArray(pages) ? pages : [],
      permissions: Array.isArray(permissions) ? permissions : [],
      features: features || {},
      usageLimitDefaults: usageLimitDefaults || {},
      isSystemDefault: false,
      isArchived: false
    });

    await newProfile.save();

    await auditLogService.logAction(
      req.admin?.email || 'super_admin',
      'permission_profile_create',
      { profileId: newProfile._id, profileKey: newProfile.key, name: newProfile.name }
    );

    res.status(201).json({
      success: true,
      message: 'Permission profile created successfully',
      data: newProfile
    });
  } catch (error) {
    console.error('Error creating permission profile:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create permission profile'
    });
  }
};

// Update permission profile
exports.updatePermissionProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, pages, permissions, features, usageLimitDefaults } = req.body;

    const profile = await PermissionProfile.findById(id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Permission profile not found' });
    }

    if (name) profile.name = name.trim();
    if (description !== undefined) profile.description = description;
    if (category) profile.category = category;
    if (Array.isArray(pages)) profile.pages = pages;
    if (Array.isArray(permissions)) profile.permissions = permissions;
    if (features) profile.features = features;
    if (usageLimitDefaults) profile.usageLimitDefaults = usageLimitDefaults;

    await profile.save();

    await auditLogService.logAction(
      req.admin?.email || 'super_admin',
      'permission_profile_update',
      { profileId: profile._id, profileKey: profile.key, name: profile.name }
    );

    res.json({
      success: true,
      message: 'Permission profile updated successfully',
      data: profile
    });
  } catch (error) {
    console.error('Error updating permission profile:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update permission profile'
    });
  }
};

// Duplicate permission profile
exports.duplicatePermissionProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const original = await PermissionProfile.findById(id);

    if (!original) {
      return res.status(404).json({ success: false, error: 'Original permission profile not found' });
    }

    const suffix = Date.now().toString().slice(-4);
    const newKey = `${original.key}_copy_${suffix}`;
    const newName = `${original.name} (Copy)`;

    const duplicated = new PermissionProfile({
      name: newName,
      key: newKey,
      description: `Cloned from ${original.name}`,
      category: original.category,
      pages: [...(original.pages || [])],
      permissions: [...(original.permissions || [])],
      features: original.features ? new Map(original.features) : {},
      usageLimitDefaults: original.usageLimitDefaults ? new Map(original.usageLimitDefaults) : {},
      isSystemDefault: false,
      isArchived: false
    });

    await duplicated.save();

    await auditLogService.logAction(
      req.admin?.email || 'super_admin',
      'permission_profile_duplicate',
      { originalId: original._id, newProfileId: duplicated._id, newKey: duplicated.key }
    );

    res.status(201).json({
      success: true,
      message: 'Permission profile duplicated successfully',
      data: duplicated
    });
  } catch (error) {
    console.error('Error duplicating permission profile:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to duplicate permission profile'
    });
  }
};

// Archive permission profile
exports.archivePermissionProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query;

    const profile = await PermissionProfile.findById(id);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Permission profile not found' });
    }

    if (profile.isSystemDefault && force !== 'true') {
      return res.status(400).json({
        success: false,
        error: 'System default profiles cannot be archived without explicit force override.'
      });
    }

    // Check if plans are assigned
    const assignedPlansCount = await PricingPlan.countDocuments({ permissionProfile: profile.key });
    if (assignedPlansCount > 0 && force !== 'true') {
      return res.status(400).json({
        success: false,
        error: `Cannot archive profile: ${assignedPlansCount} pricing plan(s) currently depend on this profile. Reassign them before archiving.`
      });
    }

    profile.isArchived = true;
    await profile.save();

    await auditLogService.logAction(
      req.admin?.email || 'super_admin',
      'permission_profile_archive',
      { profileId: profile._id, profileKey: profile.key }
    );

    res.json({
      success: true,
      message: 'Permission profile archived successfully'
    });
  } catch (error) {
    console.error('Error archiving permission profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to archive permission profile'
    });
  }
};
