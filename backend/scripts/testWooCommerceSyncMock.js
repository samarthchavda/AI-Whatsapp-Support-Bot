const mongoose = require('mongoose');
const axios = require('axios');
const Admin = require('../models/Admin');
const Integration = require('../models/Integration');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Counter = require('../models/Counter');
const woocommerceOrderSyncService = require('../services/woocommerceOrderSyncService');
require('dotenv').config();

// Define mock order data
const mockWooOrders = [
  {
    id: 9001,
    number: "9001",
    status: "processing",
    total: "149.99",
    customer_note: "Deliver after 5 PM",
    billing: {
      first_name: "Samarth",
      last_name: "Chavda",
      address_1: "456 Tech Park",
      city: "Ahmedabad",
      state: "Gujarat",
      postcode: "380015",
      country: "IN",
      email: "chavdasamarth007@gmail.com",
      phone: "+919876543210"
    },
    shipping: {
      first_name: "Samarth",
      last_name: "Chavda",
      address_1: "456 Tech Park",
      city: "Ahmedabad",
      state: "Gujarat",
      postcode: "380015",
      country: "IN"
    },
    line_items: [
      {
        id: 101,
        name: "Premium Protein Powder",
        product_id: 202,
        quantity: 1,
        price: 99.99
      },
      {
        id: 102,
        name: "Shaker Bottle",
        product_id: 203,
        quantity: 2,
        price: 25.00
      }
    ],
    meta_data: [
      {
        key: "_wc_shipment_tracking_items",
        value: [
          {
            tracking_number: "TRACK9001WOO",
            tracking_provider: "fedex",
            tracking_link: "https://fedex.com/track/TRACK9001WOO"
          }
        ]
      }
    ],
    date_created: "2026-06-11T12:00:00"
  },
  {
    id: 9002,
    number: "9002",
    status: "completed",
    total: "89.50",
    customer_note: "Ring bell",
    billing: {
      first_name: "Jane",
      last_name: "Doe",
      address_1: "789 Boulevard",
      city: "San Jose",
      state: "CA",
      postcode: "95112",
      country: "US",
      email: "jane.doe@example.com",
      phone: "+14085551234"
    },
    shipping: {
      first_name: "Jane",
      last_name: "Doe",
      address_1: "789 Boulevard",
      city: "San Jose",
      state: "CA",
      postcode: "95112",
      country: "US"
    },
    line_items: [
      {
        id: 104,
        name: "Fitness Tracker Band",
        product_id: 205,
        quantity: 1,
        price: 89.50
      }
    ],
    meta_data: [],
    date_created: "2026-06-10T10:00:00"
  }
];

// Mock axios.get
const originalGet = axios.get;
axios.get = async (url, config) => {
  console.log(`[Mock Axios GET] Intercepted request to URL: ${url}`);
  console.log(`[Mock Axios GET] Params:`, config?.params);
  console.log(`[Mock Axios GET] Auth:`, config?.auth ? 'Provided (Keys present)' : 'Missing');
  
  if (url.includes('/wp-json/wc/v3/orders')) {
    // Return mock orders
    if (config?.params?.page === 1) {
      return { data: mockWooOrders };
    } else {
      return { data: [] };
    }
  }
  return originalGet(url, config);
};

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Find the target admin user
    const email = 'chavdasamarth007@gmail.com';
    const admin = await Admin.findOne({ email });
    if (!admin) {
      console.error(`❌ Admin with email ${email} not found!`);
      process.exit(1);
    }
    console.log(`👤 Found Admin: ${admin.name} (ID: ${admin._id})`);

    // 2. Remove existing WooCommerce integration to make it clean (or we can just reuse)
    await Integration.deleteMany({ adminId: admin._id, platform: 'woocommerce' });
    console.log('🧹 Cleaned up old WooCommerce integrations for this admin');

    // 3. Create fresh WooCommerce integration
    const storeUrl = 'https://my-test-woocommerce-shop.com';
    const consumerKey = 'ck_1234567890abcdef1234567890abcdef12345678';
    const consumerSecret = 'cs_abcdef1234567890abcdef1234567890abcdef12';
    
    const integration = new Integration({
      adminId: admin._id,
      platform: 'woocommerce',
      storeUrl: storeUrl,
      apiKey: `${consumerKey}:${consumerSecret}`,
      isActive: true,
      metadata: {
        storeName: 'My Mock Woo Store'
      }
    });
    await integration.save();
    console.log(`🔌 Created new WooCommerce Integration: ${integration._id}`);

    // 4. Run the sync service!
    console.log('\n🔄 Starting WooCommerce sync service...');
    const result = await woocommerceOrderSyncService.syncIntegrationOrders(integration._id);
    
    console.log('\n📊 Sync Results:');
    console.log(`   - Fetched: ${result.fetched}`);
    console.log(`   - Created: ${result.created}`);
    console.log(`   - Updated: ${result.updated}`);
    console.log(`   - Errors: ${result.errors.length}`);
    if (result.errors.length > 0) {
      console.log('Errors occurred:', result.errors);
    }

    // 5. Verify Database Records
    const savedOrders = await Order.find({ admin: admin._id, externalOrderId: { $in: ['9001', '9002'] } });
    console.log(`\n📋 Verifying Saved Orders in MongoDB (Found ${savedOrders.length} records):`);
    
    for (const order of savedOrders) {
      console.log(`   - Order ID: ${order.orderId} | External ID: ${order.externalOrderId}`);
      console.log(`     Customer Phone: ${order.customerPhone} | Customer Name: ${order.customerName}`);
      console.log(`     Total: $${order.totalAmount} | Status: ${order.status} | Payment: ${order.paymentStatus}`);
      console.log(`     Items count: ${order.items.length} | Tracking Number: ${order.trackingNumber || 'N/A'}`);
      console.log(`     Notes: "${order.notes || ''}"`);
    }

    const savedCustomers = await Customer.find({ admin: admin._id, phone: { $in: ['919876543210', '14085551234'] } });
    console.log(`\n👥 Verifying Saved/Updated Customers (Found ${savedCustomers.length} records):`);
    for (const customer of savedCustomers) {
      console.log(`   - Customer: ${customer.name} | Phone: ${customer.phone} | Email: ${customer.email}`);
      console.log(`     Total Orders: ${customer.totalOrders} | Total Spent: $${customer.totalSpent}`);
    }

    // 6. Test sync running again (should update instead of recreate)
    console.log('\n🔄 Running WooCommerce sync service second time (should trigger updates, not creation)...');
    const updateResult = await woocommerceOrderSyncService.syncIntegrationOrders(integration._id);
    console.log(`   - Fetched: ${updateResult.fetched}`);
    console.log(`   - Created: ${updateResult.created}`);
    console.log(`   - Updated: ${updateResult.updated}`);

  } catch (err) {
    console.error('❌ Error running test:', err);
  } finally {
    // Restore original get
    axios.get = originalGet;
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

run();
