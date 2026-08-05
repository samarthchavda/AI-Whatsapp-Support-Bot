const express = require('express');
const router = express.Router();
const merchantLeadController = require('../controllers/merchant/merchantLeadController');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, merchantLeadController.getLeads);
router.patch('/:id/status', verifyToken, merchantLeadController.updateLeadStatus);
router.delete('/:id', verifyToken, merchantLeadController.deleteLead);

module.exports = router;
