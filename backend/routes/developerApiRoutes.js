const express = require('express');
const router = express.Router();
const developerApiController = require('../controllers/public/developerApiController');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const { verifyToken } = require('../middleware/auth');

// Helper middleware: accepts either JWT token (from merchant dashboard) or API key (from external code)
const dualAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'] || '';
  const hasApiKey = Boolean(
    req.headers['x-kwickbot-api-key'] ||
    req.headers['x-api-key'] ||
    authHeader.startsWith('Bearer kw_live_') ||
    req.query?.api_key
  );

  if (hasApiKey) {
    return apiKeyAuth(req, res, next);
  }

  // Try dashboard JWT token
  return verifyToken(req, res, (err) => {
    if (err) {
      return apiKeyAuth(req, res, next);
    }
    // Set whatsappCredentials if authenticated via JWT
    if (req.admin && !req.whatsappCredentials) {
      req.whatsappCredentials = {
        accessToken: req.admin.whatsappAccessToken,
        phoneNumberId: req.admin.whatsappPhoneNumberId,
        businessAccountId: req.admin.whatsappBusinessAccountId,
        displayPhoneNumber: req.admin.whatsappDisplayPhoneNumber,
        businessName: req.admin.whatsappBusinessName || req.admin.name
      };
    }
    next();
  });
};

// ==========================================
// 1. PUBLIC REST API (ChatterPillar / External Developer API)
// Requires X-KWICKBOT-API-KEY or Bearer kw_live_...
// ==========================================

// Get WhatsApp Account Info
router.get('/whatsapp/account', apiKeyAuth, developerApiController.getAccountInfo);

// Get Approved WhatsApp Templates List
router.get('/whatsapp/templates', apiKeyAuth, developerApiController.getTemplates);
router.post('/whatsapp/templates/list', apiKeyAuth, developerApiController.getTemplates);

// Universal Send Message Endpoint (Template, Text, Media, Interactive)
router.post('/messages/send', apiKeyAuth, developerApiController.sendMessage);
router.post('/whatsapp/send-template', apiKeyAuth, developerApiController.sendMessage); // Backward-compatibility alias

// Upload Media Endpoint
router.post('/media/upload', apiKeyAuth, developerApiController.uploadMedia);

// ==========================================
// 2. DEVELOPER WEBHOOK CONFIGURATION & TESTING
// Usable by both Merchant Dashboard (JWT) & External API (API Key)
// ==========================================
router.get('/developer/webhook-config', dualAuth, developerApiController.getWebhookConfig);
router.post('/developer/webhook-config', dualAuth, developerApiController.updateWebhookConfig);
router.post('/developer/rotate-secret', dualAuth, developerApiController.rotateWebhookSecret);
router.post('/developer/test-webhook', dualAuth, developerApiController.testWebhook);

module.exports = router;
