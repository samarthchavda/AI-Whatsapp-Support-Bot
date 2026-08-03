const express = require('express');
const router = express.Router();
const externalWebhookController = require('../controllers/public/externalWebhookController');
const WebhookAuth = require('../middleware/webhookAuth');

const webhookRateLimiter = WebhookAuth.createRateLimiter(100, 60000);

/**
 * @openapi
 * /api/webhooks/shopify/orders:
 *   post:
 *     tags:
 *       - E-Commerce Webhooks
 *     summary: Shopify Order Created / Updated Webhook
 *     description: Receives order payload from Shopify Admin when a customer purchases a product.
 *     headers:
 *       X-Shopify-Topic:
 *         schema:
 *           type: string
 *           example: orders/create
 *       X-Shopify-Hmac-Sha256:
 *         schema:
 *           type: string
 *       X-Shopify-Shop-Domain:
 *         schema:
 *           type: string
 *           example: ai-whatsapp-demo-store.myshopify.com
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *                 example: 8153713279138
 *               name:
 *                 type: string
 *                 example: "#1010"
 *               total_price:
 *                 type: string
 *                 example: "1499.00"
 *               customer:
 *                 type: object
 *                 properties:
 *                   first_name:
 *                     type: string
 *                     example: Samarth
 *                   last_name:
 *                     type: string
 *                     example: Chavda
 *                   phone:
 *                     type: string
 *                     example: "+918128420287"
 *                   email:
 *                     type: string
 *                     example: chavdasamarth02@gmail.com
 *     responses:
 *       200:
 *         description: Webhook received and order processed
 */
router.post(
  '/shopify/orders',
  webhookRateLimiter,
  WebhookAuth.logRequest,
  WebhookAuth.verifyShopifyHMAC,
  (req, res) => {
    req.params.source = 'shopify';
    return externalWebhookController.handleExternalOrder(req, res);
  }
);

/**
 * @openapi
 * /api/webhooks/shopify/fulfillments:
 *   post:
 *     tags:
 *       - E-Commerce Webhooks
 *     summary: Shopify Fulfillment & Delivery Webhook
 *     description: Receives real-time shipping updates from Shopify to automatically update status to shipped or delivered.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: integer
 *               order_id:
 *                 type: integer
 *                 example: 8153713279138
 *               tracking_number:
 *                 type: string
 *                 example: TRACK123456IN
 *               shipment_status:
 *                 type: string
 *                 example: delivered
 *     responses:
 *       200:
 *         description: Fulfillment processed
 */
router.post(
  '/shopify/fulfillments',
  webhookRateLimiter,
  WebhookAuth.logRequest,
  WebhookAuth.verifyShopifyHMAC,
  externalWebhookController.handleShopifyFulfillment
);

/**
 * @openapi
 * /api/webhooks/woocommerce/orders:
 *   post:
 *     tags:
 *       - E-Commerce Webhooks
 *     summary: WooCommerce Order Webhook
 *     description: Receives order payload from WooCommerce store.
 *     responses:
 *       200:
 *         description: Webhook processed
 */
router.post(
  '/woocommerce/orders',
  webhookRateLimiter,
  WebhookAuth.logRequest,
  WebhookAuth.verifyWooCommerceSignature,
  (req, res) => {
    req.params.source = 'woocommerce';
    return externalWebhookController.handleExternalOrder(req, res);
  }
);

/**
 * @openapi
 * /api/webhooks/external-orders/custom:
 *   post:
 *     tags:
 *       - E-Commerce Webhooks
 *     summary: Custom Website / ERP Order Webhook
 *     description: Push orders from any custom site directly into Kwickbot.
 *     parameters:
 *       - in: header
 *         name: x-webhook-token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [externalOrderId, customerName, customerPhone, totalAmount]
 *             properties:
 *               externalOrderId:
 *                 type: string
 *                 example: CUSTOM-9999
 *               customerName:
 *                 type: string
 *                 example: Samarth Chavda
 *               customerPhone:
 *                 type: string
 *                 example: "+918128420287"
 *               customerEmail:
 *                 type: string
 *                 example: chavdasamarth02@gmail.com
 *               totalAmount:
 *                 type: number
 *                 example: 2499
 *               status:
 *                 type: string
 *                 example: pending
 *     responses:
 *       200:
 *         description: Order ingested successfully
 */
router.post(
  '/external-orders/:source',
  webhookRateLimiter,
  WebhookAuth.logRequest,
  WebhookAuth.verifySecretToken,
  externalWebhookController.handleExternalOrder
);

module.exports = router;
