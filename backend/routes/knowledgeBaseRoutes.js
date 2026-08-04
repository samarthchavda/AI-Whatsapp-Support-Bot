const express = require('express');
const router = express.Router();
const knowledgeBaseController = require('../controllers/merchant/knowledgeBaseController');
const { verifyToken } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

/**
 * @openapi
 * /api/knowledge-base:
 *   get:
 *     tags:
 *       - Knowledge Base & Products
 *     summary: Get All Knowledge Base Documents
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Documents list
 *   post:
 *     tags:
 *       - Knowledge Base & Products
 *     summary: Upload Document (PDF/Doc/CSV) to Knowledge Base
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Document uploaded and ingested into AI
 */
router.get('/', verifyToken, knowledgeBaseController.getAllKnowledgeBases);
router.post('/', verifyToken, upload.single('file'), knowledgeBaseController.uploadKnowledgeBase);

/**
 * @openapi
 * /api/knowledge-base/url:
 *   post:
 *     tags:
 *       - Knowledge Base & Products
 *     summary: Ingest Webpage URL into Knowledge Base
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url:
 *                 type: string
 *                 example: "https://myshop.com/faq"
 *     responses:
 *       200:
 *         description: URL content ingested
 */
router.post('/url', verifyToken, knowledgeBaseController.ingestURL);

/**
 * @openapi
 * /api/knowledge-base/{id}:
 *   get:
 *     tags:
 *       - Knowledge Base & Products
 *     summary: Get Knowledge Base Document Details
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document details
 *   delete:
 *     tags:
 *       - Knowledge Base & Products
 *     summary: Delete Knowledge Base Document
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Document deleted
 */
router.get('/:id', verifyToken, knowledgeBaseController.getKnowledgeBaseById);
router.delete('/:id', verifyToken, knowledgeBaseController.deleteKnowledgeBase);

module.exports = router;
