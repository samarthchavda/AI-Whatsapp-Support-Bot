const express = require('express');
const router = express.Router();
const knowledgeBaseController = require('../controllers/merchant/knowledgeBaseController');
const { verifyToken } = require('../middleware/auth');

/**
 * @openapi
 * /api/knowledge-base/sync-shopify-products:
 *   post:
 *     tags:
 *       - Knowledge Base & Products
 *     summary: Sync Shopify Products into AI Knowledge Base
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Shopify products synced into AI engine
 */
router.post('/sync-shopify-products', verifyToken, knowledgeBaseController.syncShopifyProducts);

/**
 * @openapi
 * /api/knowledge-base/text:
 *   post:
 *     tags:
 *       - Knowledge Base & Products
 *     summary: Add Custom FAQ Text Snippet
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content]
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Return Policy"
 *               content:
 *                 type: string
 *                 example: "We offer 7-day hassle-free returns on all products."
 *     responses:
 *       201:
 *         description: Text snippet added
 */
router.post('/text', verifyToken, knowledgeBaseController.addTextSnippet);

module.exports = router;
