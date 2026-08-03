require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const Order = require('../models/Order');
const AbandonedCart = require('../models/AbandonedCart');

const email = 'chavdasamarth007@gmail.com';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const admins = await Admin.find({});
    console.log(`📱 Found ${admins.length} total admins in DB.`);

    for (const admin of admins) {
      console.log(`\n========================================`);
      console.log(`👤 Admin: ${admin.name} (${admin.email})`);
      console.log(`🆔 ID: ${admin._id}`);
      const Integration = require('../models/Integration');
      const integrations = await Integration.find({ adminId: admin._id });
      console.log(`🔌 Integrations Found (${integrations.length}):`);
      integrations.forEach((int, i) => {
        console.log(`  Integration ${i + 1}: Platform: ${int.platform} | Active: ${int.isActive} | Store: ${int.storeUrl} | API Key: ${int.apiKey ? int.apiKey.substring(0, 10) + '...' : 'MISSING'}`);
      });

      const ShopifyOrder = require('../models/ShopifyOrder');
      const shopifyOrders = await ShopifyOrder.find({ adminId: admin._id }).limit(5);
      console.log(`📦 Total ShopifyOrders Synced: ${await ShopifyOrder.countDocuments({ adminId: admin._id })}`);
      shopifyOrders.forEach((so, i) => {
        console.log(`  ShopifyOrder ${i + 1}: #${so.orderNumber} | Customer: ${so.customerName || 'N/A'} | Phone: ${so.customerPhone || 'N/A'} | Email: ${so.customerEmail || 'N/A'} | Status: ${so.financialStatus}/${so.fulfillmentStatus}`);
      });

      const carts = await AbandonedCart.find({ admin: admin._id }).limit(3);
      console.log(`🛒 Total Abandoned Carts Found: ${await AbandonedCart.countDocuments({ admin: admin._id })}`);
      carts.forEach((c, i) => {
        console.log(`  Cart ${i + 1}: ID ${c._id} | Customer: ${c.customerName || 'N/A'} | Phone: ${c.customerPhone || 'N/A'} | Email: ${c.customerEmail || 'N/A'} | Total: ₹${c.totalPrice}`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ Error checking merchant details:', err);
    process.exit(1);
  }
};

run();
