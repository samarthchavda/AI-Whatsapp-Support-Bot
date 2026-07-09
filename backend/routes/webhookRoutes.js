const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/public/webhookController');

const { verifyToken } = require('../middleware/auth');

// Webhook routes - IMPORTANT: Must accept both GET (verification) and POST (incoming messages)
router.all('/whatsapp', webhookController.handleWebhook);

// Protected routes
router.post('/send', verifyToken, webhookController.sendMessage);
router.get('/status', verifyToken, webhookController.getStatus);
router.post('/disconnect', verifyToken, webhookController.disconnectWhatsApp);
router.post('/connect', verifyToken, webhookController.connectWhatsApp);
router.post('/settings', verifyToken, webhookController.saveCredentials);

module.exports = router;
