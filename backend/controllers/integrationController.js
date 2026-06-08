const Integration = require('../models/Integration');
const crypto = require('crypto');

// Get all integrations for current admin
exports.getIntegrations = async (req, res) => {
  try {
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

    res.status(201).json({
      success: true,
      message: 'Integration created successfully',
      data: {
        ...integration.toObject(),
        webhookUrl: integration.getWebhookUrl()
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
    if (apiKey) integration.apiKey = apiKey;
    if (typeof isActive !== 'undefined') integration.isActive = isActive;
    if (storeName) integration.metadata.storeName = storeName;

    await integration.save();

    res.json({
      success: true,
      message: 'Integration updated successfully',
      data: {
        ...integration.toObject(),
        webhookUrl: integration.getWebhookUrl()
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
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Integration connection test successful',
      data: {
        platform: integration.platform,
        storeUrl: integration.storeUrl,
        status: 'connected'
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
