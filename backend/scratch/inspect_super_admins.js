const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const Admin = require('../models/Admin');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const superAdmins = await Admin.find({ role: 'super_admin' });
    console.log('Super Admins found:', superAdmins.length);
    for (const sa of superAdmins) {
      console.log(`- ID: ${sa._id}`);
      console.log(`  Name: ${sa.name}`);
      console.log(`  Email: ${sa.email}`);
      console.log(`  Phone: ${sa.phone}`);
      console.log(`  Business Phone: ${sa.businessPhone}`);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
