const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const whatsappController = require('../controllers/whatsappController');

// Require authentication for all template management endpoints
router.use(verifyToken);

// List all templates cached locally
router.get('/templates', whatsappController.getTemplates);

// Trigger a live templates sync with Meta Graph API
router.post('/templates/sync', whatsappController.syncTemplates);

// Map a specific template to a transactional event
router.put('/templates/:id/map', whatsappController.mapTemplate);

module.exports = router;
