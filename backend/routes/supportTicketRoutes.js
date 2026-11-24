const express = require('express');
const router = express.Router();
const supportTicketController = require('../controllers/merchant/supportTicketController');
const { verifyToken } = require('../middleware/auth');

/**
 * @openapi
 * /api/support-tickets:
 *   post:
 *     tags:
 *       - Support Tickets
 *     summary: Create New Support Ticket
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Ticket created
 *   get:
 *     tags:
 *       - Support Tickets
 *     summary: Get Merchant Support Tickets
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of tickets
 */
router.post('/', verifyToken, supportTicketController.createTicket);
router.get('/', verifyToken, supportTicketController.getMyTickets);

/**
 * @openapi
 * /api/support-tickets/{id}:
 *   get:
 *     tags:
 *       - Support Tickets
 *     summary: Get Support Ticket Details
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
 *         description: Ticket details
 */
router.get('/:id', verifyToken, supportTicketController.getTicketDetails);

/**
 * @openapi
 * /api/support-tickets/{id}/reply:
 *   post:
 *     tags:
 *       - Support Tickets
 *     summary: Reply to Support Ticket
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
 *         description: Reply sent
 */
router.post('/:id/reply', verifyToken, supportTicketController.addReply);

/**
 * @openapi
 * /api/support-tickets/{id}/close:
 *   patch:
 *     tags:
 *       - Support Tickets
 *     summary: Close or Resolve Support Ticket
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
 *         description: Ticket marked resolved
 */
router.patch('/:id/close', verifyToken, supportTicketController.closeTicket);

module.exports = router;
