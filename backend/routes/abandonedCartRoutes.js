const express = require('express');
const router = express.Router();
const abandonedCartController = require('../controllers/abandonedCartController');
const { verifyToken } = require('../middleware/auth');

// All routes require authentication
router.get('/', verifyToken, abandonedCartController.getAllAbandonedCarts);
router.get('/stats', verifyToken, abandonedCartController.getAbandonedCartStats);
router.post('/:id/send-reminder', verifyToken, abandonedCartController.sendManualReminder);

module.exports = router;
