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
 *   post:
 *     tags:
 *       - Invoices & Billing
 *     summary: Create New Invoice
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Invoice created
 */
router.get('/', verifyToken, invoiceController.getAllInvoices);
router.post('/', verifyToken, invoiceController.createInvoice);

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
 * /api/invoices/overdue:
 *   get:
 *     tags:
 *       - Invoices & Billing
 *     summary: Get Overdue Invoices
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Overdue invoices list
 */
router.get('/overdue', verifyToken, invoiceController.getOverdueInvoices);

/**
 * @openapi
 * /api/invoices/{id}:
 *   get:
 *     tags:
 *       - Invoices & Billing
 *     summary: Get Invoice by ID
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
 *         description: Invoice details
 *   put:
 *     tags:
 *       - Invoices & Billing
 *     summary: Update Invoice Details
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
 *         description: Invoice updated
 */
router.get('/:id', verifyToken, invoiceController.getInvoiceById);
router.put('/:id', verifyToken, invoiceController.updateInvoice);

/**
 * @openapi
 * /api/invoices/{id}/payment:
 *   post:
 *     tags:
 *       - Invoices & Billing
 *     summary: Record Payment for Invoice
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
 *         description: Payment recorded
 */
router.post('/:id/payment', verifyToken, invoiceController.recordPayment);

module.exports = router;
