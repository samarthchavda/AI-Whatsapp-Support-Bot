const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config({ override: true });

// Import routes
const orderRoutes = require('./routes/orderRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const externalWebhookRoutes = require('./routes/externalWebhookRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const aiRoutes = require('./routes/aiRoutes');
const authRoutes = require('./routes/authRoutes');
const demoRequestRoutes = require('./routes/demoRequestRoutes');
const knowledgeBaseRoutes = require('./routes/knowledgeBaseRoutes');
const broadcastRoutes = require('./routes/broadcastRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const integrationRoutes = require('./routes/integrationRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const trafficRoutes = require('./routes/trafficRoutes');
const abandonedCartRoutes = require('./routes/abandonedCartRoutes');

// Import WhatsApp bot (optional - only if available)
let whatsappWebBot = null;
try {
  whatsappWebBot = require('./services/whatsappWebBot');
} catch (error) {
  console.log('⚠️  WhatsApp Web Bot not available:', error.message);
}

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// Allow any localhost, local network IPs (e.g. 192.168.x.x, 172.x.x.x, 10.x.x.x), or configured FRONTEND_URL (supports comma-separated list)
const corsOriginHelper = (origin, callback) => {
  if (!origin) return callback(null, true);
  
  const allowedOrigins = (process.env.FRONTEND_URL || '').split(',').map(item => item.trim());
  const isAllowed = allowedOrigins.includes(origin) ||
                    /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|172\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin);
  if (isAllowed) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
};

const io = socketIo(server, {
  cors: {
    origin: corsOriginHelper,
    methods: ['GET', 'POST'],
    credentials: true
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
  max: process.env.NODE_ENV === 'production' ? 100 : 2000, // limit each IP to 2000 requests per windowMs in dev, 100 in production
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    error: 'Too many requests'
  }
});
app.use('/api/', limiter);

// Middleware
app.use(cors({
  origin: corsOriginHelper,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Frontend connected to Socket.IO');
  
  // Send current WhatsApp status
  if (whatsappWebBot) {
    const status = whatsappWebBot.getStatus();
    socket.emit('whatsapp-status', status);
    
    // If there is an active QR code, emit it to the connecting client immediately
    if (status.qrCode) {
      socket.emit('whatsapp-qr', { qr: status.qrCode, timestamp: new Date() });
    }
  }
  
  socket.on('disconnect', () => {
    console.log('🔌 Frontend disconnected from Socket.IO');
  });
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 50, // Increase connection pool size to handle high concurrent traffic
})
.then(() => {
  console.log('✅ Connected to MongoDB');
  
  // Initialize WhatsApp bot after DB connection (if available and enabled)
  if (whatsappWebBot) {
    try {
      const GlobalSettings = require('./models/GlobalSettings');
      GlobalSettings.findOne({ key: 'webBotEnabled' }).then((setting) => {
        if (setting && setting.value === true) {
          whatsappWebBot.initialize(io);
        } else {
          console.log('📱 WhatsApp Web Bot is disabled globally by Super Admin');
        }
      }).catch((err) => {
        console.error('Error reading global settings for Web Bot:', err.message);
        whatsappWebBot.initialize(io);
      });
    } catch (error) {
      console.log('⚠️  Could not initialize WhatsApp bot:', error.message);
    }
  } else {
    console.log('📱 WhatsApp Web Bot not available - using demo mode');
  }
  
  // Initialize broadcast scheduler
  const { initializeScheduler, startScheduler } = require('./services/broadcastScheduler');
  initializeScheduler().then(() => {
    startScheduler();
  });

  // Schedule daily subscription token resets
  const cron = require('node-cron');
  const { checkAndResetMonthlyTokens } = require('./services/subscriptionService');
  cron.schedule('0 0 * * *', () => {
    checkAndResetMonthlyTokens();
  });

  // Schedule Shopify order sync for all active Shopify integrations
  const shopifyOrderSyncService = require('./services/shopifyOrderSyncService');
  const shopifySyncSchedule = process.env.SHOPIFY_SYNC_CRON || '*/15 * * * *';
  cron.schedule(shopifySyncSchedule, async () => {
    try {
      const results = await shopifyOrderSyncService.syncAllShopifyIntegrations();
      const totalFetched = results.reduce((sum, item) => sum + (item.fetched || 0), 0);
      const totalCreated = results.reduce((sum, item) => sum + (item.created || 0), 0);
      const totalUpdated = results.reduce((sum, item) => sum + (item.updated || 0), 0);
      console.log(`🛍️ Shopify sync completed: ${totalFetched} fetched, ${totalCreated} created, ${totalUpdated} updated`);
    } catch (error) {
      console.error('❌ Shopify sync cron failed:', error.message);
    }
  });
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Test route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Kwickbot API',
    status: 'running',
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/webhooks', externalWebhookRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/demo-requests', demoRequestRoutes);
app.use('/api/knowledge-base', knowledgeBaseRoutes);
app.use('/api/broadcasts', broadcastRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/super-admin', superAdminRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/traffic', trafficRoutes);
app.use('/api/abandoned-carts', abandonedCartRoutes);

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

server.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Socket.IO ready for real-time updates`);

  // Pre-initialize local tunnel for webhook verification
  if (process.env.NODE_ENV !== 'production') {
    const hasStaticUrl = process.env.BACKEND_URL && !process.env.BACKEND_URL.includes('localhost') && !process.env.BACKEND_URL.includes('127.0.0.1');
    if (hasStaticUrl) {
      console.log(`🔗 Using static/external webhook URL: ${process.env.BACKEND_URL}`);
    } else {
      try {
        const ngrokService = require('./services/ngrokService');
        const tunnelUrl = await ngrokService.getNgrokUrl();
        if (tunnelUrl) {
          process.env.BACKEND_URL = tunnelUrl;
          console.log(`🔗 Local webhook tunnel active: ${tunnelUrl}`);
          console.log(`📲 Configure Meta webhook Callback URL to: ${tunnelUrl}/api/webhook/whatsapp`);
        }
      } catch (err) {
        console.log('⚠️ Could not pre-initialize webhook tunnel:', err.message);
      }
    }
  }
});

module.exports = app;
