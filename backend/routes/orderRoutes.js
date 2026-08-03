const express = require('express');
const router = express.Router();
const orderController = require('../controllers/merchant/orderController');
const { verifyToken } = require('../middleware/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

/**
 * @openapi
 * /api/orders:
 *   get:
 *     tags:
 *       - Order Management
 *     summary: Get All Customer Orders
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status (pending, processing, shipped, delivered, cancelled)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by order ID, customer name, or phone number
 *     responses:
 *       200:
 *         description: List of orders fetched successfully
 *   post:
 *     tags:
 *       - Order Management
 *     summary: Create Manual Order
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [customerName, customerPhone, totalAmount, items]
 *             properties:
 *               customerName:
 *                 type: string
 *                 example: Samarth Chavda
 *               customerPhone:
 *                 type: string
 *                 example: "+918128420287"
 *               customerEmail:
 *                 type: string
 *                 example: chavdasamarth02@gmail.com
 *               totalAmount:
 *                 type: number
 *                 example: 1499
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: Smart Watch
 *                     quantity:
 *                       type: integer
 *                       example: 1
 *                     price:
 *                       type: number
 *                       example: 1499
 *     responses:
 *       201:
 *         description: Order created successfully
 */
router.get('/', verifyToken, orderController.getAllOrders);
router.post('/', verifyToken, orderController.createOrder);

/**
 * @openapi
 * /api/orders/stats:
 *   get:
 *     tags:
 *       - Order Management
 *     summary: Get Order Statistics & Metrics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Order statistics summary
 */
router.get('/stats', verifyToken, orderController.getOrderStats);

/**
 * @openapi
 * /api/orders/import-csv:
 *   post:
 *     tags:
 *       - Order Management
 *     summary: Import Bulk Orders via CSV Upload
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: CSV orders imported
 */
router.post('/import-csv', verifyToken, upload.single('file'), orderController.importOrdersCSV);

/**
 * @openapi
 * /api/orders/{id}:
 *   get:
 *     tags:
 *       - Order Management
 *     summary: Get Order Details by ID
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
 *         description: Order details
 *   patch:
 *     tags:
 *       - Order Management
 *     summary: Update Order Status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 example: shipped
 *     responses:
 *       200:
 *         description: Status updated
 */
router.get('/:id', verifyToken, orderController.getOrderById);
router.patch('/:id', verifyToken, orderController.updateOrderStatus);

module.exports = router;
