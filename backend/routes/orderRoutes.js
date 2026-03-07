const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Order routes
router.get('/', orderController.getAllOrders);
router.get('/:id', orderController.getOrderById);
router.get('/phone/:phone', orderController.getOrdersByPhone);
router.post('/', orderController.createOrder);
router.patch('/:id', orderController.updateOrderStatus);
router.delete('/:id', orderController.deleteOrder);

module.exports = router;
