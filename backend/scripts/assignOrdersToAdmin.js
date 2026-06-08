const mongoose = require('mongoose');
const Order = require('../models/Order');
const Admin = require('../models/Admin');
require('dotenv').config();

async function assignOrdersToAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the admin to assign orders to (admin@gmail.com)
    const admin = await Admin.findOne({ email: 'admin@gmail.com' });
    
    if (!admin) {
      console.log('Admin not found. Please create admin@gmail.com first.');
      process.exit(1);
    }

    console.log(`Found admin: ${admin.name} (${admin.email})`);

    // Find all orders without admin field
    const ordersWithoutAdmin = await Order.find({ admin: { $exists: false } });
    
    console.log(`Found ${ordersWithoutAdmin.length} orders without admin assignment`);

    if (ordersWithoutAdmin.length === 0) {
      console.log('All orders already have admin assigned');
      process.exit(0);
    }

    // Update all orders to assign to this admin
    const result = await Order.updateMany(
      { admin: { $exists: false } },
      { $set: { admin: admin._id } }
    );

    console.log(`✅ Successfully assigned ${result.modifiedCount} orders to ${admin.email}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

assignOrdersToAdmin();
