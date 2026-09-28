const express = require('express');
const router = express.Router();
const demoRequestController = require('../controllers/superAdmin/demoRequestController');
const superAdminController = require('../controllers/superAdmin/superAdminController');
const { verifyToken } = require('../middleware/auth');

// Public route - anyone can submit a demo request
router.post('/', demoRequestController.createDemoRequest);

// Protected management routes - super admin only
router.get('/', verifyToken, superAdminController.requireSuperAdmin, demoRequestController.getAllDemoRequests);
router.post('/:id/approve', verifyToken, superAdminController.requireSuperAdmin, demoRequestController.approveDemoRequest);
router.post('/:id/reject', verifyToken, superAdminController.requireSuperAdmin, demoRequestController.rejectDemoRequest);
router.put('/:id', verifyToken, superAdminController.requireSuperAdmin, demoRequestController.updateDemoRequestStatus);
router.delete('/:id', verifyToken, superAdminController.requireSuperAdmin, demoRequestController.deleteDemoRequest);

module.exports = router;
