const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// Test endpoint - simulate WhatsApp message
router.post('/test-message', aiController.testMessage);

// Get AI logs for a specific customer
router.get('/logs/customer/:customerPhone', aiController.getAILogs);

// Get AI logs grouped by intent
router.get('/logs/intent/:intent', aiController.getLogsByIntent);

// Get error logs
router.get('/logs/errors', aiController.getErrorLogs);

// Get AI statistics
router.get('/stats', aiController.getAIStats);

// Get conversation with detailed AI logs
router.get('/conversation/:conversationId/logs', aiController.getConversationWithLogs);

module.exports = router;
