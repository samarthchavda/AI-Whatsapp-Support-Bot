const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');

// Conversation routes
router.get('/', conversationController.getAllConversations);
router.get('/stats', conversationController.getConversationStats);
router.get('/:id', conversationController.getConversationById);
router.get('/phone/:phone', conversationController.getConversationsByPhone);
router.patch('/:id', conversationController.updateConversationStatus);

module.exports = router;
