const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/merchant/conversationController');
const { verifyToken } = require('../middleware/auth');

// Conversation routes
router.get('/', verifyToken, conversationController.getAllConversations);
router.get('/stats', verifyToken, conversationController.getConversationStats);
router.get('/phone/:phone', verifyToken, conversationController.getConversationByPhone);
router.get('/:id', verifyToken, conversationController.getConversationById);
router.patch('/:id', verifyToken, conversationController.updateConversationStatus);

// Admin message sending
router.post('/send-message', verifyToken, conversationController.sendAdminMessage);

module.exports = router;
