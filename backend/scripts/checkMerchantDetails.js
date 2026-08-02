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
      console.log(`🏪 Store URL: ${admin.storeUrl || 'Not Connected'}`);
      console.log(`🛍️ Shopify Connected: ${admin.shopifyConnected ? 'YES' : 'NO'}`);
      console.log(`🔑 Shopify Access Token: ${admin.shopifyAccessToken ? 'PRESENT' : 'MISSING'}`);

      const orders = await Order.find({ admin: admin._id }).limit(3);
      console.log(`📦 Total Orders Found: ${await Order.countDocuments({ admin: admin._id })}`);
      orders.forEach((o, i) => {
        console.log(`  Order ${i + 1}: #${o.orderNumber} | Customer: ${o.customerName || 'N/A'} | Phone: ${o.customerPhone || 'N/A'} | Email: ${o.customerEmail || 'N/A'}`);
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
