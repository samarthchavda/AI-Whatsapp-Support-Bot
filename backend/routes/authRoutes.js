const express = require('express');
const router = express.Router();
const authController = require('../controllers/public/authController');
const { verifyToken } = require('../middleware/auth');

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
router.post('/login', authController.login);

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
router.post('/forgot-password', authController.forgotPassword);

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
router.post('/reset-password/:token', authController.resetPassword);

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
router.post('/refresh', authController.refresh);

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
router.post('/logout', authController.logout);

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

module.exports = router;
