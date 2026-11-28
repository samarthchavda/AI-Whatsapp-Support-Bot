const router = require('express').Router();
const { verifyToken } = require('../middleware/auth');
const { listContacts, syncBusinessAppContacts } = require('../controllers/merchant/contactController');

/**
 * @openapi
 * /api/contacts:
 *   get:
 *     tags: [WhatsApp Contacts]
 *     summary: List contacts for an active Growth merchant
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *     responses:
 *       200:
 *         description: Paginated WhatsApp contacts
 *       403:
 *         description: Growth plan required
 */
router.get('/', verifyToken, listContacts);

/**
 * @openapi
 * /api/contacts/sync:
 *   post:
 *     tags: [WhatsApp Contacts]
 *     summary: Start Business App contact sync for connected Growth numbers
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       202:
 *         description: Contact sync requested from Meta
 *       403:
 *         description: Growth plan required
 *       409:
 *         description: WhatsApp Business App connection required
 */
router.post('/sync', verifyToken, syncBusinessAppContacts);

module.exports = router;
