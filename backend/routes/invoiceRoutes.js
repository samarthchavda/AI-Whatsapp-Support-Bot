const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/merchant/invoiceController');
const { verifyToken } = require('../middleware/auth');

/**
 * @openapi
 * /api/invoices:
 *   get:
 *     tags:
 *       - Invoices & Billing
 *     summary: Get All Merchant Invoices
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Invoices list
 */
router.get('/', verifyToken, invoiceController.getAllInvoices);

/**
 * @openapi
 * /api/invoices/stats:
 *   get:
 *     tags:
 *       - Invoices & Billing
 *     summary: Get Invoice Billing Stats
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Invoice statistics
 */
router.get('/stats', verifyToken, invoiceController.getInvoiceStats);

/**
 * @openapi
 * /api/invoices/{id}/download:
 *   get:
 *     tags:
 *       - Invoices & Billing
 *     summary: Download PDF Invoice File
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
 *         description: PDF file stream
 */
router.get('/:id/download', verifyToken, invoiceController.downloadInvoicePDF);

module.exports = router;
