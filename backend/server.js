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
const blogRoutes = require('./routes/blogRoutes');

// Import WhatsApp bot (optional - only if available)
let whatsappWebBot = null;

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

const { corsOriginHelper } = require('./middleware/originSecurity');
const jwt = require('jsonwebtoken');
const Admin = require('./models/Admin');

const io = socketIo(server, {
  cors: {
    origin: corsOriginHelper,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Authenticate Socket.IO handshake
io.use(async (socket, next) => {
  try {
    const rawToken = socket.handshake.auth?.token ||
                     socket.handshake.auth?.authorization ||
                     socket.handshake.headers?.authorization ||
                     socket.handshake.query?.token;

    if (!rawToken) {
      return next(new Error('Authentication required: Access token missing'));
    }

    const token = rawToken.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return next(new Error('Authentication required: Invalid token format'));
    }

    const jwtSecret = process.env.JWT_ACCESS_SECRET;
    if (!jwtSecret) {
      return next(new Error('Server configuration error: Access token secret missing'));
    }

    const decoded = jwt.verify(token, jwtSecret);

    if (decoded.tokenType !== 'access') {
      return next(new Error('Authentication failed: Access token required'));
    }

    const admin = await Admin.findById(decoded.id).select('-password');
    if (!admin) {
      return next(new Error('Authentication failed: Admin account not found'));
    }

    if (!admin.isActive) {
      return next(new Error('Authentication failed: Admin account is inactive'));
    }

    socket.admin = admin;
    socket.user = admin;
    next();
  } catch (error) {
    return next(new Error('Authentication failed: Invalid or expired token'));
  }
});

// Make io accessible to other modules
app.set('io', io);
global.io = io;

// Security middleware
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 2000, // limit each IP to 2000 requests per windowMs in dev, 1000 in production
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
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(morgan('dev'));

// Socket.IO connection handling
io.on('connection', (socket) => {
  const adminId = socket.admin._id.toString();
  const merchantRoom = `merchant:${adminId}`;

  socket.join(merchantRoom);

  if (socket.admin.role === 'super_admin') {
    socket.join('super_admin_room');
  }

  // Send initial WhatsApp status ONLY if socket user is super_admin or authorized owner
  if (whatsappWebBot) {
    const status = whatsappWebBot.getStatus();
    const isSuperAdmin = socket.admin.role === 'super_admin';
    const isOwner = whatsappWebBot.ownerAdminId && adminId === whatsappWebBot.ownerAdminId.toString();

    if (isSuperAdmin || isOwner || !whatsappWebBot.ownerAdminId) {
      socket.emit('whatsapp-status', status);

      if (status.qrCode) {
        socket.emit('whatsapp-qr', { qr: status.qrCode, timestamp: new Date() });
      }
    }
  }

  socket.on('disconnect', () => {
    // Client disconnected
  });
});

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/whatsapp-bot';
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 50, // Increase connection pool size to handle high concurrent traffic
})
  .then(() => {
    console.log('✅ Connected to MongoDB');

    // Seed/update default blog posts on startup
    try {
      const seedBlogs = require('./scripts/seedBlogs');
      seedBlogs().catch(e => console.error('Blog auto-seed warning:', e.message));
    } catch (e) {
      // silent fallback
    }

    // Keep standard plan access definitions and system permission profiles available.
    // Both operations are idempotent and preserve non-legacy Super Admin customizations.
    try {
      const { runMigration } = require('./scripts/migratePlansToStandard');
      runMigration({ quiet: true }).catch(e => console.error('Plan access migration warning:', e.message));
      const { seedProfiles } = require('./scripts/seedPermissionProfiles');
      seedProfiles(false).catch(e => console.error('Permission profile auto-seed warning:', e.message));
    } catch (e) {
      console.error('Plan/profile startup initialization warning:', e.message);
    }

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
        const GlobalSettings = require('./models/GlobalSettings');
        const flag = await GlobalSettings.findOne({ key: 'shopifySyncEnabled' });
        if (flag && flag.value === false) {
          console.log('🛍️ Shopify cron sync skipped (shopifySyncEnabled flag is false)');
          return;
        }
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

// Swagger API Documentation UI (Protected with Basic Auth)
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const basicAuth = require('./middleware/basicAuth');
app.use('/api/docs', basicAuth, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Test route
app.get('/', (req, res) => {
  res.json({
    message: 'Kwickbot API',
    status: 'running',
    version: '1.0.0',
    docs: 'https://kwickbot.in/api/docs'
  });
});

// Public HTML & SEO Routes
app.get('/sitemap.xml', require('./controllers/public/sitemapController').generateSitemap);
app.get('/blog', require('./controllers/public/blogSeoController').renderBlogPageWithSeo);
app.get('/blog/:slug', require('./controllers/public/blogSeoController').renderBlogPageWithSeo);

// API Routes
app.get('/api/sitemap.xml', require('./controllers/public/sitemapController').generateSitemap);

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
app.use('/api/blog', blogRoutes);
app.use('/api/merchant-leads', require('./routes/merchantLeadRoutes'));
app.use('/api/integration-platform', require('./routes/integrationPlatformRoutes'));
app.use('/api/developer', require('./routes/developerRoutes'));

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

const PORT = process.env.PORT || 5001;

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
