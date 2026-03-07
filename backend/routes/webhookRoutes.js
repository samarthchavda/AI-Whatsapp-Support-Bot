const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Webhook routes - IMPORTANT: Must accept both GET (verification) and POST (incoming messages)
router.all('/whatsapp', webhookController.handleWebhook);
router.post('/send', webhookController.sendMessage);
router.get('/status', webhookController.getStatus);

module.exports = router;
