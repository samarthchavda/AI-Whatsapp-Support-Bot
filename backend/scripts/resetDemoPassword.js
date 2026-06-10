const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const admin = await Admin.findOne({ email: 'demo@store.com' });
    if (admin) {
      admin.password = 'Demo@123';
      await admin.save();
      console.log('✅ Successfully reset password of demo@store.com to "Demo@123"');
    } else {
      console.error('❌ demo@store.com not found in the database');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
