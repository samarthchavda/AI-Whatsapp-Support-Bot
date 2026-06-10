#!/usr/bin/env node

/**
 * Fulfillment Webhook Testing Script
 * Usage: node scripts/testFulfillment.js [source] [externalOrderId] [trackingNumber] [status]
 * Example: node scripts/testFulfillment.js shopify 1780997335468 TRK999999999 shipped
 */

const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

const source = process.argv[2] || 'custom';
const externalOrderId = process.argv[3] || '1780997335468';
const trackingNumber = process.argv[4] || 'TRK' + Math.floor(100000000 + Math.random() * 900000000);
const status = process.argv[5] || 'shipped';

const baseUrl = process.env.BASE_URL || 'http://localhost:5001';
const secretToken = process.env.WEBHOOK_SECRET_TOKEN || 'test-secret-token';
const shopifySecret = process.env.SHOPIFY_WEBHOOK_SECRET || 'shopify-test-secret';
const wooSecret = process.env.WOOCOMMERCE_WEBHOOK_SECRET || 'woo-test-secret';

// Make sure environmental variables are matched for HMAC if not set in local env
if (!process.env.SHOPIFY_WEBHOOK_SECRET) process.env.SHOPIFY_WEBHOOK_SECRET = shopifySecret;
if (!process.env.WOOCOMMERCE_WEBHOOK_SECRET) process.env.WOOCOMMERCE_WEBHOOK_SECRET = wooSecret;

const testData = {
  shopify: {
    fulfillment: {
      id: Date.now(),
      order_id: externalOrderId,
      status: 'success',
      tracking_company: 'USPS',
      tracking_number: trackingNumber,
      tracking_numbers: [trackingNumber],
      tracking_url: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
      tracking_urls: [`https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`],
      shipment_status: status === 'delivered' ? 'delivered' : 'in_transit'
    }
  },
  
  woocommerce: {
    id: parseInt(externalOrderId) || 12345,
    status: status === 'delivered' ? 'completed' : 'processing',
    meta_data: [
      {
        key: '_wc_shipment_tracking_items',
        value: [
          {
            tracking_number: trackingNumber,
            tracking_provider: 'DHL',
            tracking_link: `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`
          }
        ]
      }
    ]
  },
  
  custom: {
    order_id: externalOrderId,
    tracking_number: trackingNumber,
    carrier: 'FedEx',
    tracking_url: `https://www.fedex.com/apps/fedextrack/?tracknumbers=${trackingNumber}`,
    status: status
  }
};

function calculateSignature(payload, secret) {
  const body = JSON.stringify(payload);
  return crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');
}

async function testFulfillment() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Testing Fulfillment / Tracking Update Webhook');
  console.log('='.repeat(60));
  console.log(`Source: ${source}`);
  console.log(`External Order ID: ${externalOrderId}`);
  console.log(`Tracking Number: ${trackingNumber}`);
  console.log(`Target Status: ${status}`);
  
  let url = '';
  let headers = { 'Content-Type': 'application/json' };
  const payload = testData[source] || testData.custom;

  if (source === 'shopify') {
    url = `${baseUrl}/api/webhooks/shopify/fulfillments`;
    headers['X-Shopify-Hmac-Sha256'] = calculateSignature(payload, shopifySecret);
    console.log(`URL: ${url}`);
    console.log(`HMAC: ${headers['X-Shopify-Hmac-Sha256']}`);
  } else if (source === 'woocommerce') {
    // WooCommerce status updates can come via the standard order endpoint
    url = `${baseUrl}/api/webhooks/woocommerce/orders`;
    headers['X-Wc-Webhook-Signature'] = calculateSignature(payload, wooSecret);
    console.log(`URL: ${url}`);
    console.log(`Signature: ${headers['X-Wc-Webhook-Signature']}`);
  } else {
    url = `${baseUrl}/api/webhooks/external-orders/${source}/fulfillment`;
    headers['X-Webhook-Secret'] = secretToken;
    console.log(`URL: ${url}`);
  }

  console.log('='.repeat(60) + '\n');
  console.log('📤 Sending fulfillment payload...\n');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\n' + '='.repeat(60) + '\n');

  try {
    const response = await axios.post(url, payload, { headers });

    console.log('✅ SUCCESS!\n');
    console.log('Response:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n' + '='.repeat(60));
    console.log('✅ Fulfillment processed successfully!');
    console.log(`📦 Internal Order ID: ${response.data.data?.orderId}`);
    console.log(`📱 WhatsApp Alert Sent: ${response.data.data?.whatsappSent ? 'Yes ✓' : 'No ✗'}`);
    console.log(`⏱️  Processing time: ${response.data.data?.processingTime}`);
    console.log('='.repeat(60) + '\n');

    if (response.data.data?.whatsappSent) {
      console.log('💬 Customer will receive their tracking message shortly!');
    } else {
      console.log('⚠️  WhatsApp alert not sent. Server log details:');
      console.log('   - Make sure the WhatsApp Bot is fully ready.');
      console.log('   - Ensure order status actually changed or tracking details were updated.');
    }

  } catch (error) {
    console.error('❌ ERROR!\n');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received. Is the server running?');
    } else {
      console.error('Error:', error.message);
    }
    
    console.log('\n' + '='.repeat(60));
    process.exit(1);
  }
}

testFulfillment();
