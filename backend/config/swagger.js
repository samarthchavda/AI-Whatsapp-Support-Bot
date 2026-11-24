const swaggerJSDoc = require('swagger-jsdoc');
const path = require('path');
const { buildAdditionalPaths } = require('./swaggerAdditionalRoutes');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Kwickbot AI - API & Webhook Documentation',
      version: '1.0.0',
      description: `
Interactive API documentation and Webhook testing playground for **Kwickbot AI**.
Test E-Commerce Webhooks, AI Support APIs, WhatsApp Messaging, Order Sync, and Billing endpoints.
The documentation page uses HTTP Basic Authentication. The Authorize button inside Swagger is for API JWTs or developer API keys.
      `,
      contact: {
        name: 'Kwickbot AI Support',
        url: 'https://kwickbot.in',
        email: 'support@kwickbot.in'
      }
    },
    servers: [
      {
        url: 'https://kwickbot.in',
        description: 'Production Live Server'
      },
      {
        url: 'http://localhost:5001',
        description: 'Local Development Server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT Bearer token obtained from /api/auth/login'
        },
        WebhookToken: {
          type: 'apiKey',
          in: 'header',
          name: 'x-webhook-token',
          description: 'Custom Webhook secret token'
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-KWICKBOT-API-KEY',
          description: 'Merchant developer API key for /api/v1 operations'
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ]
  },
  apis: [
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../controllers/**/*.js')
  ]
};

const swaggerSpec = swaggerJSDoc(options);
swaggerSpec.paths ||= {};
for (const [path, operations] of Object.entries(buildAdditionalPaths())) {
  swaggerSpec.paths[path] ||= {};
  for (const [method, operation] of Object.entries(operations)) {
    if (swaggerSpec.paths[path][method]) {
      throw new Error(`Duplicate Swagger operation: ${method.toUpperCase()} ${path}`);
    }
    swaggerSpec.paths[path][method] = operation;
  }
}

for (const [path, method] of [
  ['/api/auth/signup', 'post'],
  ['/api/auth/login', 'post'],
  ['/api/auth/forgot-password', 'post'],
  ['/api/auth/reset-password/{token}', 'post'],
  ['/api/auth/refresh', 'post']
]) {
  if (swaggerSpec.paths[path]?.[method]) swaggerSpec.paths[path][method].security = [];
}
for (const [path, item] of Object.entries(swaggerSpec.paths)) {
  if (path.startsWith('/api/webhooks/shopify/') || path.startsWith('/api/webhooks/woocommerce/')) {
    if (item.post) item.post.security = [];
  }
}
if (swaggerSpec.paths['/api/webhooks/external-orders/{source}']?.post) {
  swaggerSpec.paths['/api/webhooks/external-orders/{source}'].post.security = [{ WebhookToken: [] }];
}

module.exports = swaggerSpec;
