const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/merchant/conversationController');
const { verifyToken } = require('../middleware/auth');

/**
 * @openapi
 * /api/conversations:
 *   get:
 *     tags:
 *       - WhatsApp Live Conversations
 *     summary: Get All Customer WhatsApp Chats
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of conversations
 */
router.get('/', verifyToken, conversationController.getAllConversations);

/**
 * @openapi
 * /api/conversations/stats:
 *   get:
 *     tags:
 *       - WhatsApp Live Conversations
 *     summary: Get Live Chat Metrics & Stats
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Conversation statistics
 */
router.get('/stats', verifyToken, conversationController.getConversationStats);

/**
 * @openapi
 * /api/conversations/send-message:
 *   post:
 *     tags:
 *       - WhatsApp Live Conversations
 *     summary: Send Manual Admin Reply to Customer WhatsApp
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerPhone, message]
 *             properties:
 *               customerPhone:
 *                 type: string
 *                 example: "+918128420287"
 *               message:
 *                 type: string
 *                 example: "Hello! Your order has been dispatched."
 *     responses:
 *       200:
 *         description: Message sent to customer
 */
router.post('/send-message', verifyToken, conversationController.sendAdminMessage);

module.exports = router;
