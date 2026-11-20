#!/usr/bin/env node

/**
 * Webhook Testing Script
 * Usage: node scripts/testWebhook.js [source] [phone]
 * Example: node scripts/testWebhook.js shopify +1234567890
 */

const axios = require('axios');
require('dotenv').config();

const source = process.argv[2] || 'custom';
const phone = process.argv[3] || '+1234567890';
const baseUrl = process.env.BASE_URL || 'http://localhost:5001';
const secretToken = process.env.WEBHOOK_SECRET_TOKEN || 'test-secret-token';

const testData = {
  shopify: {
    id: Date.now(),
    order_number: Math.floor(Math.random() * 10000),
    customer: {
      first_name: 'Test',
      last_name: 'Customer',
      phone: phone,
      email: 'test@example.com'
    },
    total_price: '149.99',
    line_items: [
      {
        product_id: '123',
        name: 'Wireless Headphones',
        quantity: 1,
        price: '99.99'
      },
      {
        product_id: '456',
        name: 'Phone Case',
        quantity: 2,
        price: '25.00'
      }
    ],
    shipping_address: {
      address1: '123 Main St',
      city: 'New York',
      province: 'NY',
      zip: '10001',
      country: 'United States'
    },
    financial_status: 'paid',
    fulfillment_status: null,
    note: 'Please deliver before 5 PM',
    created_at: new Date().toISOString()
  },
  
  woocommerce: {
    id: Date.now(),
    number: Math.floor(Math.random() * 10000).toString(),
    billing: {
      first_name: 'Test',
      last_name: 'Customer',
      phone: phone,
      email: 'test@example.com'
    },
    shipping: {
      address_1: '123 Main St',
      city: 'New York',
      state: 'NY',
      postcode: '10001',
      country: 'US'
    },
    total: '149.99',
    line_items: [
      {
        product_id: 123,
        name: 'Wireless Headphones',
        quantity: 1,
        price: 99.99,
        total: '99.99'
      },
      {
        product_id: 456,
        name: 'Phone Case',
        quantity: 2,
        price: 25.00,
        total: '50.00'
      }
    ],
    status: 'processing',
    customer_note: 'Please deliver before 5 PM',
    date_created: new Date().toISOString()
  },
  
  custom: {
    order_id: 'TEST-' + Date.now(),
    customer_name: 'Test Customer',
    customer_phone: phone,
    customer_email: 'test@example.com',
    total_amount: 149.99,
    items: [
      {
        product_name: 'Wireless Headphones',
        quantity: 1,
        price: 99.99
      },
      {
        product_name: 'Phone Case',
        quantity: 2,
        price: 25.00
      }
    ],
    shipping_address: {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zip: '10001',
      country: 'United States'
    },
    status: 'pending',
    notes: 'Please deliver before 5 PM',
    order_date: new Date().toISOString()
  }
};

async function testWebhook() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Testing Webhook Integration');
  console.log('='.repeat(60));
  console.log(`Source: ${source}`);
  console.log(`Phone: ${phone}`);
  console.log(`URL: ${baseUrl}/api/webhooks/external-orders/${source}`);
  console.log('='.repeat(60) + '\n');

  const payload = testData[source] || testData.custom;

  console.log('📤 Sending webhook payload...\n');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\n' + '='.repeat(60) + '\n');

  try {
    const response = await axios.post(
      `${baseUrl}/api/webhooks/external-orders/${source}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': secretToken
        }
      }
    );

    console.log('✅ SUCCESS!\n');
    console.log('Response:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('\n' + '='.repeat(60));
    console.log('✅ Order created successfully!');
    console.log(`📦 Order ID: ${response.data.data.orderId}`);
    console.log(`📱 WhatsApp sent: ${response.data.data.whatsappSent ? 'Yes ✓' : 'No ✗'}`);
    console.log(`⏱️  Processing time: ${response.data.data.processingTime}`);
    console.log('='.repeat(60) + '\n');

    if (response.data.data.whatsappSent) {
      console.log('💬 Check WhatsApp on', phone, 'for the confirmation message!');
    } else {
      console.log('⚠️  WhatsApp message not sent. Make sure WhatsApp bot is connected.');
    }

  } catch (error) {
    console.error('❌ ERROR!\n');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received. Is the server running?');
      console.error('Make sure to start the backend: cd backend && npm run dev');
    } else {
      console.error('Error:', error.message);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('💡 Troubleshooting:');
    console.log('1. Make sure backend is running: cd backend && npm run dev');
    console.log('2. Check WEBHOOK_SECRET_TOKEN in .env file');
    console.log('3. Verify MongoDB is running');
    console.log('4. Check server logs for errors');
    console.log('='.repeat(60) + '\n');
    
    process.exit(1);
  }
}

// Show usage if help is requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Webhook Testing Script

Usage:
  node scripts/testWebhook.js [source] [phone]

Arguments:
  source    Webhook source: shopify, woocommerce, or custom (default: custom)
  phone     Customer phone number (default: +1234567890)

Examples:
  node scripts/testWebhook.js
  node scripts/testWebhook.js shopify
  node scripts/testWebhook.js woocommerce +19876543210
  node scripts/testWebhook.js custom +1234567890

Environment Variables:
  BASE_URL              Backend URL (default: http://localhost:5001)
  WEBHOOK_SECRET_TOKEN  Secret token for authentication
  `);
  process.exit(0);
}

testWebhook();
