const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const orderController = require('../controllers/merchant/orderController');
const { verifyToken } = require('../middleware/auth');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/csv');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for CSV file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'order-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept CSV files only
  if (file.mimetype === 'text/csv' || 
      file.mimetype === 'application/vnd.ms-excel' ||
      path.extname(file.originalname).toLowerCase() === '.csv') {
    cb(null, true);
  } else {
    cb(new Error('Only CSV files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for bulk uploads
  }
});

// Order routes - all require authentication
router.get('/', verifyToken, orderController.getAllOrders);
router.get('/:id', verifyToken, orderController.getOrderById);
router.get('/phone/:phone', verifyToken, orderController.getOrdersByPhone);
router.post('/', verifyToken, upload.single('csvFile'), orderController.createOrder);
router.post('/bulk-upload', verifyToken, upload.single('bulkCsvFile'), orderController.bulkUploadOrders);
router.patch('/:id', verifyToken, orderController.updateOrderStatus);
router.delete('/:id', verifyToken, orderController.deleteOrder);

module.exports = router;
