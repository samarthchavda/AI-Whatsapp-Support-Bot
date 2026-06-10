const crypto = require('crypto');

/**
 * Middleware to verify webhook authenticity
 */
class WebhookAuth {
  /**
   * Verify secret token in header
   */
  static verifySecretToken(req, res, next) {
    const providedToken = req.headers['x-webhook-secret'] || req.headers['authorization']?.replace('Bearer ', '');
    const expectedToken = process.env.WEBHOOK_SECRET_TOKEN;

    if (!expectedToken) {
      console.warn('⚠️ WEBHOOK_SECRET_TOKEN not set in environment variables');
      return next(); // Allow in development if not set
    }

    if (!providedToken) {
      return res.status(401).json({
        success: false,
        error: 'Missing webhook secret token',
        message: 'Please provide X-Webhook-Secret header'
      });
    }

    if (providedToken !== expectedToken) {
      return res.status(403).json({
        success: false,
        error: 'Invalid webhook secret token',
        message: 'The provided secret token is invalid'
      });
    }

    next();
  }

  /**
   * Verify Shopify HMAC signature
   */
  static verifyShopifyHMAC(req, res, next) {
    const hmacHeader = req.headers['x-shopify-hmac-sha256'];
    const shopifySecret = process.env.SHOPIFY_WEBHOOK_SECRET;

    if (!shopifySecret) {
      console.warn('⚠️ SHOPIFY_WEBHOOK_SECRET not set - skipping HMAC verification');
      return next();
    }

    if (!hmacHeader) {
      return res.status(401).json({
        success: false,
        error: 'Missing Shopify HMAC signature'
      });
    }

    const body = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    const hash = crypto
      .createHmac('sha256', shopifySecret)
      .update(body, 'utf8')
      .digest('base64');

    if (hash !== hmacHeader) {
      return res.status(403).json({
        success: false,
        error: 'Invalid Shopify HMAC signature'
      });
    }

    next();
  }

  /**
   * Verify WooCommerce signature
   */
  static verifyWooCommerceSignature(req, res, next) {
    const signature = req.headers['x-wc-webhook-signature'];
    const wooSecret = process.env.WOOCOMMERCE_WEBHOOK_SECRET;

    if (!wooSecret) {
      console.warn('⚠️ WOOCOMMERCE_WEBHOOK_SECRET not set - skipping signature verification');
      return next();
    }

    if (!signature) {
      return res.status(401).json({
        success: false,
        error: 'Missing WooCommerce signature'
      });
    }

    const body = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
    const hash = crypto
      .createHmac('sha256', wooSecret)
      .update(body, 'utf8')
      .digest('base64');

    if (hash !== signature) {
      return res.status(403).json({
        success: false,
        error: 'Invalid WooCommerce signature'
      });
    }

    next();
  }

  /**
   * Rate limiting for webhooks (simple in-memory implementation)
   */
  static createRateLimiter(maxRequests = 100, windowMs = 60000) {
    const requests = new Map();

    return (req, res, next) => {
      const ip = req.ip || req.connection.remoteAddress;
      const now = Date.now();
      
      if (!requests.has(ip)) {
        requests.set(ip, []);
      }

      const userRequests = requests.get(ip);
      
      // Remove old requests outside the window
      const validRequests = userRequests.filter(time => now - time < windowMs);
      
      if (validRequests.length >= maxRequests) {
        return res.status(429).json({
          success: false,
          error: 'Too many requests',
          message: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 1000} seconds`
        });
      }

      validRequests.push(now);
      requests.set(ip, validRequests);
      
      next();
    };
  }

  /**
   * Log webhook request details
   */
  static logRequest(req, res, next) {
    console.log('\n' + '='.repeat(60));
    console.log('📥 Incoming Webhook Request');
    console.log('='.repeat(60));
    console.log('Source:', req.params.source || 'unknown');
    console.log('IP:', req.ip || req.connection.remoteAddress);
    console.log('User-Agent:', req.headers['user-agent']);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Timestamp:', new Date().toISOString());
    console.log('='.repeat(60) + '\n');
    
    // Store for later use
    req.webhookMeta = {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    };
    
    next();
  }
}

module.exports = WebhookAuth;
