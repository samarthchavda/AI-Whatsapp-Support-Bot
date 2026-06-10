const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const knowledgeBaseController = require('../controllers/knowledgeBaseController');
const { verifyToken } = require('../middleware/auth');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/knowledge-base');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'kb-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept PDF, TXT, and CSV files
  const allowedTypes = ['.pdf', '.txt', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, TXT, and CSV files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// All routes require authentication
router.post('/', verifyToken, upload.single('file'), knowledgeBaseController.uploadKnowledgeBase);
router.post('/url', verifyToken, knowledgeBaseController.ingestURL);
router.get('/', verifyToken, knowledgeBaseController.getAllKnowledgeBases);
router.get('/:id', verifyToken, knowledgeBaseController.getKnowledgeBaseById);
router.put('/:id', verifyToken, knowledgeBaseController.updateKnowledgeBase);
router.delete('/:id', verifyToken, knowledgeBaseController.deleteKnowledgeBase);
router.post('/query', verifyToken, knowledgeBaseController.queryKnowledgeBase);

module.exports = router;
