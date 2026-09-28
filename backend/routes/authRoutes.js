const express = require('express');
const router = express.Router();
const authController = require('../controllers/public/authController');
const { verifyToken } = require('../middleware/auth');
const { verifyCsrfOrigin } = require('../middleware/originSecurity');
const { createMongoRateLimiter } = require('../middleware/mongoRateLimiter');

// Shared PM2 cluster rate limiters
const loginIpLimiter = createMongoRateLimiter({
  prefix: 'rl:login:ip',
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many login attempts from this IP address. Please try again later.'
});

const loginAccountLimiter = createMongoRateLimiter({
  prefix: 'rl:login:account',
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  keyGenerator: (req) => (req.body?.email || '').toLowerCase().trim() || 'unknown',
  message: 'Too many login attempts for this account. Please try again later.'
});

const forgotPasswordLimiter = createMongoRateLimiter({
  prefix: 'rl:forgot',
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many password reset requests. Please try again later.'
});

const resetPasswordLimiter = createMongoRateLimiter({
  prefix: 'rl:reset',
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: 'Too many password reset attempts. Please try again later.'
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Authentication & Profile
 *     summary: Admin & Merchant Login
 *     description: Authenticates admin credentials and returns JWT Bearer token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: chavdasamarth007@gmail.com
 *               password:
 *                 type: string
 *                 example: mysecretpassword
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', loginIpLimiter, loginAccountLimiter, authController.login);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     tags:
 *       - Authentication & Profile
 *     summary: Request Password Reset Link
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: chavdasamarth007@gmail.com
 *     responses:
 *       200:
 *         description: Password reset email sent
 */
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);

/**
 * @openapi
 * /api/auth/reset-password/{token}:
 *   post:
 *     tags:
 *       - Authentication & Profile
 *     summary: Reset Password using Token
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 */
router.post('/reset-password/:token', resetPasswordLimiter, authController.resetPassword);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags:
 *       - Authentication & Profile
 *     summary: Refresh Access Token
 *     responses:
 *       200:
 *         description: Token refreshed
 */
router.post('/refresh', verifyCsrfOrigin, authController.refresh);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - Authentication & Profile
 *     summary: Logout Merchant
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', verifyCsrfOrigin, authController.logout);

/**
 * @openapi
 * /api/auth/profile:
 *   get:
 *     tags:
 *       - Authentication & Profile
 *     summary: Get Current Profile Details
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current merchant profile
 *   put:
 *     tags:
 *       - Authentication & Profile
 *     summary: Update Merchant Profile & Business Details
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               businessName:
 *                 type: string
 *               businessPhone:
 *                 type: string
 *               supportEmail:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.get('/profile', verifyToken, authController.getProfile);
router.put('/profile', verifyToken, authController.updateProfile);

/**
 * @openapi
 * /api/auth/change-password:
 *   post:
 *     tags:
 *       - Authentication & Profile
 *     summary: Change Account Password
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated
 */
router.post('/change-password', verifyToken, authController.changePassword);

/**
 * @openapi
 * /api/auth/plans:
 *   get:
 *     tags:
 *       - Subscription & Payments
 *     summary: Get Active Subscription Pricing Plans
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of available pricing plans
 */
router.get('/plans', verifyToken, authController.getPlans);

/**
 * @openapi
 * /api/auth/upgrade-plan:
 *   post:
 *     tags:
 *       - Subscription & Payments
 *     summary: Upgrade Subscription Plan
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [planName]
 *             properties:
 *               planName:
 *                 type: string
 *                 example: professional
 *     responses:
 *       200:
 *         description: Plan upgraded
 */
router.post('/upgrade-plan', verifyToken, authController.upgradePlan);

/**
 * @openapi
 * /api/auth/verify-coupon:
 *   post:
 *     tags:
 *       - Subscription & Payments
 *     summary: Verify Discount Coupon Code
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [couponCode]
 *             properties:
 *               couponCode:
 *                 type: string
 *                 example: WELCOME50
 *     responses:
 *       200:
 *         description: Coupon validated
 */
router.post('/verify-coupon', verifyToken, authController.verifyCoupon);

/**
 * @openapi
 * /api/auth/razorpay/create-order:
 *   post:
 *     tags:
 *       - Subscription & Payments
 *     summary: Create Razorpay Checkout Order
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [planName, billingCycle]
 *             properties:
 *               planName:
 *                 type: string
 *                 example: professional
 *               billingCycle:
 *                 type: string
 *                 example: monthly
 *     responses:
 *       200:
 *         description: Razorpay order created
 */
router.post('/razorpay/create-order', verifyToken, authController.createRazorpayOrder);

/**
 * @openapi
 * /api/auth/razorpay/verify-payment:
 *   post:
 *     tags:
 *       - Subscription & Payments
 *     summary: Verify Razorpay Payment Signature
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [razorpay_order_id, razorpay_payment_id, razorpay_signature]
 *             properties:
 *               razorpay_order_id:
 *                 type: string
 *               razorpay_payment_id:
 *                 type: string
 *               razorpay_signature:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment verified and plan activated
 */
router.post('/razorpay/verify-payment', verifyToken, authController.verifyRazorpayPayment);

// API Key Management Routes
router.get('/api-key', verifyToken, authController.getApiKey);
router.post('/api-key/regenerate', verifyToken, authController.regenerateApiKey);

module.exports = router;
