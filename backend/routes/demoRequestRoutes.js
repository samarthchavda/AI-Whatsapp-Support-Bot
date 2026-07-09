const express = require('express');
const router = express.Router();
const demoRequestController = require('../controllers/superAdmin/demoRequestController');
const { verifyToken } = require('../middleware/auth');

// Public route - anyone can submit a demo request
router.post('/', demoRequestController.createDemoRequest);

// Protected routes - admin only
router.get('/', verifyToken, demoRequestController.getAllDemoRequests);
router.post('/:id/approve', verifyToken, demoRequestController.approveDemoRequest);
router.post('/:id/reject', verifyToken, demoRequestController.rejectDemoRequest);
router.put('/:id', verifyToken, demoRequestController.updateDemoRequestStatus);
router.delete('/:id', verifyToken, demoRequestController.deleteDemoRequest);

module.exports = router;
