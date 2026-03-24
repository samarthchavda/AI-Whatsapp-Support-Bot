const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Import routes
const orderRoutes = require('./routes/orderRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const aiRoutes = require('./routes/aiRoutes');

// Import WhatsApp bot (optional - only if available)
let whatsappWebBot = null;
try {
  whatsappWebBot = require('./services/whatsappWebBot');
} catch (error) {
  console.log('⚠️  WhatsApp Web Bot not available:', error.message);
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Make io accessible to other modules
app.set('io', io);
global.io = io;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Frontend connected to Socket.IO');
  
  // Send current WhatsApp status
  if (whatsappWebBot) {
    const status = whatsappWebBot.getStatus();
    socket.emit('whatsapp-status', status);
  }
  
  socket.on('disconnect', () => {
    console.log('🔌 Frontend disconnected from Socket.IO');
  });
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  // Initialize WhatsApp bot after DB connection (if available)
  if (whatsappWebBot) {
    try {
      whatsappWebBot.initialize(io);
    } catch (error) {
      console.log('⚠️  Could not initialize WhatsApp bot:', error.message);
    }
  } else {
    console.log('📱 WhatsApp Web Bot not available - using demo mode');
  }
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'WhatsApp AI Support Bot API',
    status: 'running',
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/orders', orderRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Socket.IO ready for real-time updates`);
});

module.exports = app;
