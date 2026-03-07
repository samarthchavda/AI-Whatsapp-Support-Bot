const express = require('express');
const invoiceController = require('../controllers/invoiceController');

const router = express.Router();

// Create invoice (POST to root)
router.post('/', invoiceController.createInvoice);

// Get all invoices (GET to root with optional query params)
router.get('/', invoiceController.getAllInvoices);

// Get overdue invoices (specific route before :id)
router.get('/status/overdue', invoiceController.getOverdueInvoices);

// Get invoice statistics (specific route before :id)
router.get('/stats/summary', invoiceController.getInvoiceStats);

// Get invoices by customer phone (specific route before :id)
router.get('/phone/:phone', invoiceController.getInvoiceByPhone);

// Record payment to specific invoice
router.post('/:id/payment', invoiceController.recordPayment);

// Get specific invoice by ID
router.get('/:id', invoiceController.getInvoiceById);

// Update specific invoice  
router.put('/:id', invoiceController.updateInvoice);

module.exports = router;
