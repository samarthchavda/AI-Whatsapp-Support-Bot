const mongoose = require('mongoose');
const Broadcast = require('../models/Broadcast');
const Admin = require('../models/Admin');
require('dotenv').config();

async function assignBroadcastsToAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the admin to assign broadcasts to (admin@gmail.com)
    const admin = await Admin.findOne({ email: 'admin@gmail.com' });
    
    if (!admin) {
      console.log('Admin not found. Please create admin@gmail.com first.');
      process.exit(1);
    }

    console.log(`Found admin: ${admin.name} (${admin.email})`);

    // Find all broadcasts without admin field
    const broadcastsWithoutAdmin = await Broadcast.find({ admin: { $exists: false } });
    
    console.log(`Found ${broadcastsWithoutAdmin.length} broadcasts without admin assignment`);

    if (broadcastsWithoutAdmin.length === 0) {
      console.log('All broadcasts already have admin assigned');
      process.exit(0);
    }

    // Update all broadcasts to assign to this admin
    const result = await Broadcast.updateMany(
      { admin: { $exists: false } },
      { $set: { admin: admin._id } }
    );

    console.log(`✅ Successfully assigned ${result.modifiedCount} broadcasts to ${admin.email}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

assignBroadcastsToAdmin();
