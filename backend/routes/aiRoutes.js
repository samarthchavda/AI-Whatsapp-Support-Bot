const express = require('express');
const router = express.Router();
const aiController = require('../controllers/merchant/aiController');
const { verifyToken } = require('../middleware/auth');

/**
 * @openapi
 * /api/ai/test-message:
 *   post:
 *     tags:
 *       - AI Support Engine
 *     summary: Test AI Engine Response
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 example: "Where is my order #1009?"
 *               customerPhone:
 *                 type: string
 *                 example: "+918128420287"
 *     responses:
 *       200:
 *         description: AI generated response
 */
router.post('/test-message', verifyToken, aiController.testMessage);

/**
 * @openapi
 * /api/ai/verify-key:
 *   get:
 *     tags:
 *       - AI Support Engine
 *     summary: Verify Gemini AI Key Connection
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Key status
 */
router.get('/verify-key', verifyToken, aiController.verifyGeminiKey);

/**
 * @openapi
 * /api/ai/logs/customer/{customerPhone}:
 *   get:
 *     tags:
 *       - AI Support Engine
 *     summary: Get AI Logs for Specific Customer Phone
 *     parameters:
 *       - in: path
 *         name: customerPhone
 *         required: true
 *         schema:
 *           type: string
 *           example: "+918128420287"
 *     responses:
 *       200:
 *         description: Logs fetched
 */
router.get('/logs/customer/:customerPhone', aiController.getAILogs);

/**
 * @openapi
 * /api/ai/stats:
 *   get:
 *     tags:
 *       - AI Support Engine
 *     summary: Get AI Resolution & Token Stats
 *     responses:
 *       200:
 *         description: AI statistics
 */
router.get('/stats', aiController.getAIStats);

module.exports = router;
