require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const email = 'chavdasamarth007@gmail.com';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const admin = await Admin.findOne({ email });
    if (!admin) {
      console.error(`❌ Admin with email ${email} not found.`);
      process.exit(1);
    }

    admin.storeUrl = 'ai-whatsapp-demo-store.myshopify.com';
    admin.shopifyEnabled = true;
    await admin.save();

    console.log(`✅ Cleaned Store URL for ${email} -> ${admin.storeUrl}`);
    console.log(`✅ shopifyEnabled -> ${admin.shopifyEnabled}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error fixing store URL:', err);
    process.exit(1);
  }
};

run();
