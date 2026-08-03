const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Kwickbot AI - API & Webhook Documentation',
      version: '1.0.0',
      description: `
Interactive API documentation and Webhook testing playground for **Kwickbot AI**.
Test all E-Commerce Webhooks, AI Support APIs, WhatsApp Messaging, Order Sync, and Billing endpoints.
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
        url: 'http://localhost:5000',
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
    './routes/*.js',
    './controllers/**/*.js'
  ]
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
