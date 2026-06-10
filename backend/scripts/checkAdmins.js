const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const admins = await Admin.find({});
    console.log(`📊 Found ${admins.length} Admin users:`);
    for (const a of admins) {
      console.log(`   - Email: ${a.email} | Name: ${a.name} | Role: ${a.role}`);
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

run();
