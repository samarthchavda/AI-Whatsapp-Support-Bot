const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

/**
 * @route   POST /api/auth/login
 * @desc    Login admin
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token cookie
 * @access  Public
 */
router.post('/refresh', authController.refresh);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout admin and revoke the current refresh token
 * @access  Public
 */
router.post('/logout', authController.logout);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current admin profile
 * @access  Private
 */
router.get('/profile', verifyToken, authController.getProfile);
router.put('/profile', verifyToken, authController.updateProfile);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password
 * @access  Private
 */
router.post('/change-password', verifyToken, authController.changePassword);

/**
 * @route   GET /api/auth/plans
 * @desc    Get all active subscription pricing plans
 * @access  Private
 */
router.get('/plans', verifyToken, authController.getPlans);

/**
 * @route   POST /api/auth/upgrade-plan
 * @desc    Upgrade admin subscription pricing plan
 * @access  Private
 */
router.post('/upgrade-plan', verifyToken, authController.upgradePlan);

module.exports = router;
