const express = require('express');
const router = express.Router();
const broadcastController = require('../controllers/merchant/broadcastController');
const { verifyToken, requireFeature } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    let ext = path.extname(file.originalname);
    if (!ext) {
      if (file.mimetype === 'image/jpeg') ext = '.jpg';
      else if (file.mimetype === 'image/png') ext = '.png';
      else if (file.mimetype === 'image/webp') ext = '.webp';
      else if (file.mimetype === 'text/csv') ext = '.csv';
      else ext = '.png';
    }
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

// All broadcast endpoints require authentication and broadcastingAccess entitlement
router.use(verifyToken);
router.use(requireFeature('broadcastingAccess'));

/**
 * @openapi
 * /api/broadcasts:
 *   get:
 *     tags:
 *       - WhatsApp Broadcast Campaigns
 *     summary: Get All Broadcast Campaigns
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of broadcast campaigns
 *   post:
 *     tags:
 *       - WhatsApp Broadcast Campaigns
 *     summary: Create New Broadcast Campaign
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, message]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Festival Discount Campaign"
 *               message:
 *                 type: string
 *                 example: "Enjoy 20% off today on all items! Use code FESTIVAL20."
 *               csvFile:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Campaign created
 */
router.get('/', broadcastController.getAllBroadcasts);
router.post('/', upload.fields([{ name: 'csvFile', maxCount: 1 }, { name: 'headerImage', maxCount: 1 }]), broadcastController.createBroadcast);

/**
 * @openapi
 * /api/broadcasts/stats:
 *   get:
 *     tags:
 *       - WhatsApp Broadcast Campaigns
 *     summary: Get Broadcast Performance Stats
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Broadcast performance statistics
 */
router.get('/stats', broadcastController.getBroadcastStats);

/**
 * @openapi
 * /api/broadcasts/{id}/send:
 *   post:
 *     tags:
 *       - WhatsApp Broadcast Campaigns
 *     summary: Send Broadcast Campaign Now
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
 *         description: Campaign triggered
 */
router.post('/:id/send', broadcastController.sendBroadcastNow);
router.get('/:id', broadcastController.getBroadcastById);
router.post('/:id/reuse', broadcastController.reuseBroadcast);
router.post('/:id/cancel', broadcastController.cancelBroadcast);
router.delete('/:id', broadcastController.deleteBroadcast);

module.exports = router;
