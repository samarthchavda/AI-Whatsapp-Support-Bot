const Admin = require('../models/Admin');
const PricingPlan = require('../models/PricingPlan');

/**
 * Middleware to authenticate external API requests using Kwickbot API Keys (kw_live_...).
 * Supports headers:
 * - X-KWICKBOT-API-KEY: kw_live_...
 * - X-API-KEY: kw_live_...
 * - Authorization: Bearer kw_live_...
 */
const apiKeyAuth = async (req, res, next) => {
  try {
    let apiKey = null;

    if (req.headers['x-kwickbot-api-key']) {
      apiKey = req.headers['x-kwickbot-api-key'];
    } else if (req.headers['x-api-key']) {
      apiKey = req.headers['x-api-key'];
    } else if (req.headers['authorization']) {
      const authHeader = req.headers['authorization'];
      if (authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7).trim();
      } else {
        apiKey = authHeader.trim();
      }
    } else if (req.query?.api_key) {
      apiKey = req.query.api_key;
    }

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please provide your Kwickbot API key via X-KWICKBOT-API-KEY header or Bearer token.'
      });
    }

    apiKey = String(apiKey).trim();

    // Find the merchant associated with this API key
    const admin = await Admin.findOne({ apiKey, isActive: true });
    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or inactive API key. Check your credentials in the Kwickbot Developer Dashboard.'
      });
    }

    // Check account status
    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      return res.status(403).json({
        success: false,
        error: 'Account temporarily locked due to security policy. Please contact support.'
      });
    }

    // Optional plan feature gate check (ensure subscription is not cancelled or expired)
    if (admin.role !== 'super_admin' && admin.subscriptionStatus === 'cancelled') {
      return res.status(403).json({
        success: false,
        error: 'Subscription expired or cancelled. Please renew your plan to continue using Developer API.'
      });
    }

    // Resolve WhatsApp Cloud API credentials
    const credentials = {
      accessToken: admin.whatsappAccessToken || null,
      phoneNumberId: admin.whatsappPhoneNumberId || null,
      businessAccountId: admin.whatsappBusinessAccountId || null,
      displayPhoneNumber: admin.whatsappDisplayPhoneNumber || null,
      businessName: admin.whatsappBusinessName || admin.name
    };

    // If multi-connection exists and primary credentials are not set on root admin
    if ((!credentials.accessToken || !credentials.phoneNumberId) && Array.isArray(admin.whatsappConnections)) {
      const activeConn = admin.whatsappConnections.find(c => c.isActive !== false && c.accessToken && c.phoneNumberId);
      if (activeConn) {
        credentials.accessToken = activeConn.accessToken;
        credentials.phoneNumberId = activeConn.phoneNumberId;
        credentials.businessAccountId = activeConn.businessAccountId || credentials.businessAccountId;
        credentials.displayPhoneNumber = activeConn.displayPhoneNumber || credentials.displayPhoneNumber;
        credentials.businessName = activeConn.businessName || credentials.businessName;
      }
    }

    req.admin = admin;
    req.merchant = admin;
    req.whatsappCredentials = credentials;

    next();
  } catch (error) {
    console.error('❌ apiKeyAuth middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error validating API key'
    });
  }
};

module.exports = apiKeyAuth;
