const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/merchant/conversationController');
const { verifyToken } = require('../middleware/auth');
const multer = require('multer');
const mediaUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const acceptMedia = (req, res, next) => mediaUpload.single('file')(req, res, error => {
  if (!error) return next();
  return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ success: false, error: error.code === 'LIMIT_FILE_SIZE' ? 'Attachment must be 10 MB or smaller.' : error.message });
});

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
router.post('/:id/send-media', verifyToken, acceptMedia, conversationController.sendAdminMedia);
router.get('/:id/messages/:messageId/media', verifyToken, conversationController.getMessageMedia);

/**
 * @openapi
 * /api/conversations/phone/{phone}:
 *   get:
 *     tags:
 *       - WhatsApp Live Conversations
 *     summary: Get Conversation By Phone Number
 *     security:
 *       - BearerAuth: []
 */
router.get('/phone/:phone', verifyToken, conversationController.getConversationsByPhone);

/**
 * @openapi
 * /api/conversations/{id}:
 *   get:
 *     tags:
 *       - WhatsApp Live Conversations
 *     summary: Get Conversation By ID
 *     security:
 *       - BearerAuth: []
 */
router.get('/:id', verifyToken, conversationController.getConversationById);

/**
 * @openapi
 * /api/conversations/{id}:
 *   put:
 *     tags:
 *       - WhatsApp Live Conversations
 *     summary: Update Conversation Status or Bot Pause State
 *     security:
 *       - BearerAuth: []
 */
router.put('/:id', verifyToken, conversationController.updateConversationStatus);
router.patch('/:id', verifyToken, conversationController.updateConversationStatus);

module.exports = router;
