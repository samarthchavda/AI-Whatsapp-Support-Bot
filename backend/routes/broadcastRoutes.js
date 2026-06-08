const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const broadcastController = require('../controllers/broadcastController');
const { verifyToken } = require('../middleware/auth');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/broadcasts');
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
    cb(null, 'broadcast-' + uniqueSuffix + path.extname(file.originalname));
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
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// All routes require authentication
router.post('/', verifyToken, upload.single('csvFile'), broadcastController.createBroadcast);
router.get('/', verifyToken, broadcastController.getAllBroadcasts);
router.get('/stats', verifyToken, broadcastController.getBroadcastStats);
router.get('/:id', verifyToken, broadcastController.getBroadcastById);
router.post('/:id/cancel', verifyToken, broadcastController.cancelBroadcast);
router.delete('/:id', verifyToken, broadcastController.deleteBroadcast);

module.exports = router;
