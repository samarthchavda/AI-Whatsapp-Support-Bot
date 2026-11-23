const express = require('express');
const router = express.Router();
const abandonedCartController = require('../controllers/merchant/abandonedCartController');
const { verifyToken, requireFeature } = require('../middleware/auth');

/**
 * @openapi
 * /api/abandoned-carts:
 *   get:
 *     tags:
 *       - Abandoned Cart Recovery
 *     summary: Get All Abandoned Cart Checkouts
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of abandoned checkouts
 */
router.get('/', verifyToken, requireFeature('abandonedCartRecovery'), abandonedCartController.getAllAbandonedCarts);

/**
 * @openapi
 * /api/abandoned-carts/stats:
 *   get:
 *     tags:
 *       - Abandoned Cart Recovery
 *     summary: Get Abandoned Cart Recovery Statistics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Abandoned cart metrics
 */
router.get('/stats', verifyToken, requireFeature('abandonedCartRecovery'), abandonedCartController.getAbandonedCartStats);

/**
 * @openapi
 * /api/abandoned-carts/{id}/send-reminder:
 *   post:
 *     tags:
 *       - Abandoned Cart Recovery
 *     summary: Send Manual WhatsApp Recovery Reminder
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
 *         description: Reminder sent to customer on WhatsApp
 */
router.post('/:id/send-reminder', verifyToken, requireFeature('abandonedCartRecovery'), abandonedCartController.sendManualReminder);

module.exports = router;
