const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { verifyToken } = require('../middleware/auth');

// Test endpoint - simulate WhatsApp message
router.post('/test-message', verifyToken, aiController.testMessage);

// Test Gemini API key validation
router.get('/verify-key', verifyToken, aiController.verifyGeminiKey);

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
