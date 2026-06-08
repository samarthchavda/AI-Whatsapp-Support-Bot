const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const integrationController = require('../controllers/integrationController');

// All routes require authentication
router.use(verifyToken);

// Get all integrations for current admin
router.get('/', integrationController.getIntegrations);

// Create new integration
router.post('/', integrationController.createIntegration);

// Update integration
router.put('/:id', integrationController.updateIntegration);

// Delete integration
router.delete('/:id', integrationController.deleteIntegration);

// Regenerate webhook secret
router.post('/:id/regenerate-secret', integrationController.regenerateWebhookSecret);

// Test integration connection
router.post('/:id/test', integrationController.testIntegration);

module.exports = router;
