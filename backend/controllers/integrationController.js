const Integration = require('../models/Integration');
const crypto = require('crypto');
const shopifyOrderSyncService = require('../services/shopifyOrderSyncService');

// Get all integrations for current admin
exports.getIntegrations = async (req, res) => {
  try {
    // Try to auto-detect ngrok URL for local development
    try {
      const ngrokService = require('../services/ngrokService');
      const ngrokUrl = await ngrokService.getNgrokUrl();
      if (ngrokUrl) {
        process.env.BACKEND_URL = ngrokUrl;
      }
    } catch (err) {
      console.log('Error detecting ngrok URL in integrations:', err.message);
    }

    const integrations = await Integration.find({ adminId: req.admin.id });
    
    // Add webhook URLs to response
    const integrationsWithUrls = integrations.map(integration => ({
      ...integration.toObject(),
      webhookUrl: integration.getWebhookUrl()
    }));

    res.json({
      success: true,
      data: integrationsWithUrls
    });
  } catch (error) {
    console.error('Error fetching integrations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch integrations'
    });
  }
};

// Create new integration
exports.createIntegration = async (req, res) => {
  try {
    const { platform, storeUrl, apiKey, storeName } = req.body;

    // Validate required fields
    if (!platform || !storeUrl || !apiKey) {
      return res.status(400).json({
        success: false,
        error: 'Platform, store URL, and API key are required'
      });
    }

    // Check if merchant profile is completed
    const Admin = require('../models/Admin');
    const adminDoc = await Admin.findById(req.admin.id);
    if (!adminDoc || !adminDoc.businessName?.trim() || !adminDoc.businessPhone?.trim() || !adminDoc.supportEmail?.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please complete your Profile & Store settings (Store Name, Store Phone, and Support Email) before connecting an integration.'
      });
    }

    // Check Super Admin permissions
    if (platform === 'shopify' && req.admin.shopifyEnabled === false) {
      return res.status(403).json({
        success: false,
        error: 'Shopify integration is disabled for your account. Please contact support.'
      });
    }

    if (platform === 'woocommerce' && req.admin.woocommerceEnabled === false) {
      return res.status(403).json({
        success: false,
        error: 'WooCommerce integration is disabled for your account. Please contact support.'
      });
    }

    // Shopify specific validation
    if (platform === 'shopify' && apiKey.trim().startsWith('shpss_')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Shopify token: The provided token starts with "shpss_", which is a Shopify API Secret Key. Please enter the Admin API Access Token (which starts with "shpat_") instead. You can find this token under Shopify Admin → Apps → Develop apps.'
      });
    }

    // Check if integration already exists for this platform
    const existingIntegration = await Integration.findOne({
      adminId: req.admin.id,
      platform
    });

    if (existingIntegration) {
      return res.status(400).json({
        success: false,
        error: `${platform} integration already exists. Please update or delete the existing one.`
      });
    }

    // Fetch user's subscription plan details to check limits
    const PricingPlan = require('../models/PricingPlan');
    const planName = (adminDoc.subscriptionPlan || 'starter').toLowerCase();

    // Default limit mappings
    const DEFAULT_INTEGRATION_LIMITS = {
      starter: 1,
      professional: 1,
      enterprise: -1,
      custom: -1
    };

    let limitVal = DEFAULT_INTEGRATION_LIMITS[planName] || 1;

    // Check if there is a pricing plan features block in database
    const pricingPlan = await PricingPlan.findOne({ name: planName, isActive: true });
    if (pricingPlan && pricingPlan.features && typeof pricingPlan.features.maxIntegrations !== 'undefined') {
      limitVal = pricingPlan.features.maxIntegrations;
    }

    if (limitVal !== -1) {
      const existingCount = await Integration.countDocuments({ adminId: req.admin.id });
      if (existingCount >= limitVal) {
        return res.status(403).json({
          success: false,
          error: `Your ${planName.toUpperCase()} plan only allows a maximum of ${limitVal} active e-commerce integration. Please upgrade your subscription to connect multiple platforms.`
        });
      }
    }

    // Create new integration
    const integration = new Integration({
      adminId: req.admin.id,
      platform,
      storeUrl,
      apiKey,
      metadata: {
        storeName: storeName || storeUrl
      }
    });

    await integration.save();

    let syncSummary = null;
    if (platform === 'shopify' && integration.isActive) {
      try {
        syncSummary = await shopifyOrderSyncService.syncIntegrationOrders(integration);
      } catch (syncError) {
        console.error('Error syncing Shopify orders after integration creation:', syncError);
        syncSummary = {
          success: false,
          error: syncError.message
        };
      }
    } else if (platform === 'woocommerce' && integration.isActive) {
      try {
        const woocommerceOrderSyncService = require('../services/woocommerceOrderSyncService');
        syncSummary = await woocommerceOrderSyncService.syncIntegrationOrders(integration);
      } catch (syncError) {
        console.error('Error syncing WooCommerce orders after integration creation:', syncError);
        syncSummary = {
          success: false,
          error: syncError.message
        };
      }
    }

    // Try to auto-detect ngrok URL for local development
    try {
      const ngrokService = require('../services/ngrokService');
      const ngrokUrl = await ngrokService.getNgrokUrl();
      if (ngrokUrl) {
        process.env.BACKEND_URL = ngrokUrl;
      }
    } catch (err) {
      console.log('Error detecting ngrok URL in createIntegration:', err.message);
    }

    res.status(201).json({
      success: true,
      message: 'Integration created successfully',
      data: {
        ...integration.toObject(),
        webhookUrl: integration.getWebhookUrl(),
        syncSummary
      }
    });
  } catch (error) {
    console.error('Error creating integration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create integration'
    });
  }
};

// Update integration
exports.updateIntegration = async (req, res) => {
  try {
    const { id } = req.params;
    const { storeUrl, apiKey, isActive, storeName } = req.body;

    const integration = await Integration.findOne({
      _id: id,
      adminId: req.admin.id
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integration not found'
      });
    }

    // Update fields
    if (storeUrl) integration.storeUrl = storeUrl;
    if (apiKey) {
      if (integration.platform === 'shopify' && apiKey.trim().startsWith('shpss_')) {
        return res.status(400).json({
          success: false,
          error: 'Invalid Shopify token: The provided token starts with "shpss_", which is a Shopify API Secret Key. Please enter the Admin API Access Token (which starts with "shpat_") instead. You can find this token under Shopify Admin → Apps → Develop apps.'
        });
      }
      integration.apiKey = apiKey;
    }
    if (typeof isActive !== 'undefined') integration.isActive = isActive;
    if (storeName) integration.metadata.storeName = storeName;

    await integration.save();

    let syncSummary = null;
    if (integration.platform === 'shopify' && integration.isActive) {
      try {
        syncSummary = await shopifyOrderSyncService.syncIntegrationOrders(integration);
      } catch (syncError) {
        console.error('Error syncing Shopify orders after integration update:', syncError);
        syncSummary = {
          success: false,
          error: syncError.message
        };
      }
    } else if (integration.platform === 'woocommerce' && integration.isActive) {
      try {
        const woocommerceOrderSyncService = require('../services/woocommerceOrderSyncService');
        syncSummary = await woocommerceOrderSyncService.syncIntegrationOrders(integration);
      } catch (syncError) {
        console.error('Error syncing WooCommerce orders after integration update:', syncError);
        syncSummary = {
          success: false,
          error: syncError.message
        };
      }
    }

    res.json({
      success: true,
      message: 'Integration updated successfully',
      data: {
        ...integration.toObject(),
        webhookUrl: integration.getWebhookUrl(),
        syncSummary
      }
    });
  } catch (error) {
    console.error('Error updating integration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update integration'
    });
  }
};

// Delete integration
exports.deleteIntegration = async (req, res) => {
  try {
    const { id } = req.params;

    const integration = await Integration.findOneAndDelete({
      _id: id,
      adminId: req.admin.id
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integration not found'
      });
    }

    res.json({
      success: true,
      message: 'Integration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting integration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete integration'
    });
  }
};

// Regenerate webhook secret
exports.regenerateWebhookSecret = async (req, res) => {
  try {
    const { id } = req.params;

    const integration = await Integration.findOne({
      _id: id,
      adminId: req.admin.id
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integration not found'
      });
    }

    // Generate new secret
    integration.webhookSecret = crypto.randomBytes(32).toString('hex');
    await integration.save();

    res.json({
      success: true,
      message: 'Webhook secret regenerated successfully',
      data: {
        ...integration.toObject(),
        webhookUrl: integration.getWebhookUrl()
      }
    });
  } catch (error) {
    console.error('Error regenerating webhook secret:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate webhook secret'
    });
  }
};

// Test integration connection
exports.testIntegration = async (req, res) => {
  try {
    const { id } = req.params;

    const integration = await Integration.findOne({
      _id: id,
      adminId: req.admin.id
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Integration not found'
      });
    }

    // Here you would implement actual API calls to test the connection
    // For Shopify, also run a small sync check to verify orders can be fetched
    let syncSummary = null;
    if (integration.platform === 'shopify') {
      try {
        syncSummary = await shopifyOrderSyncService.syncIntegrationOrders(integration);
      } catch (syncError) {
        console.error('Error testing Shopify sync:', syncError);
        syncSummary = {
          success: false,
          error: syncError.message
        };
      }
    } else if (integration.platform === 'woocommerce') {
      try {
        const woocommerceOrderSyncService = require('../services/woocommerceOrderSyncService');
        syncSummary = await woocommerceOrderSyncService.syncIntegrationOrders(integration);
      } catch (syncError) {
        console.error('Error testing WooCommerce sync:', syncError);
        syncSummary = {
          success: false,
          error: syncError.message
        };
      }
    }

    res.json({
      success: true,
      message: 'Integration connection test successful',
      data: {
        platform: integration.platform,
        storeUrl: integration.storeUrl,
        status: 'connected',
        syncSummary
      }
    });
  } catch (error) {
    console.error('Error testing integration:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test integration'
    });
  }
};

// Manually sync Shopify orders for a given integration
exports.syncShopifyOrders = async (req, res) => {
  try {
    const { id } = req.params;

    const integration = await Integration.findOne({
      _id: id,
      adminId: req.admin.id,
      platform: 'shopify'
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'Shopify integration not found'
      });
    }

    const syncSummary = await shopifyOrderSyncService.syncIntegrationOrders(integration);

    res.json({
      success: true,
      message: 'Shopify orders synced successfully',
      data: syncSummary
    });
  } catch (error) {
    console.error('Error syncing Shopify orders:', error);
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Failed to sync Shopify orders'
    });
  }
};

// Manually sync WooCommerce orders for a given integration
exports.syncWooCommerceOrders = async (req, res) => {
  try {
    const { id } = req.params;

    const integration = await Integration.findOne({
      _id: id,
      adminId: req.admin.id,
      platform: 'woocommerce'
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        error: 'WooCommerce integration not found'
      });
    }

    const woocommerceOrderSyncService = require('../services/woocommerceOrderSyncService');
    const syncSummary = await woocommerceOrderSyncService.syncIntegrationOrders(integration);

    res.json({
      success: true,
      message: 'WooCommerce orders synced successfully',
      data: syncSummary
    });
  } catch (error) {
    console.error('Error syncing WooCommerce orders:', error);
    res.status(error.status || 500).json({
      success: false,
      error: error.message || 'Failed to sync WooCommerce orders'
    });
  }
};
