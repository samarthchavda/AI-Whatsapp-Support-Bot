const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Admin = require('../models/Admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function assignCustomersToAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the admin to assign customers to (admin@gmail.com)
    const admin = await Admin.findOne({ email: 'admin@gmail.com' });
    
    if (!admin) {
      console.log('Admin not found. Please create admin@gmail.com first.');
      process.exit(1);
    }

    console.log(`Found admin: ${admin.name} (${admin.email})`);

    // Find all customers without admin field
    const customersWithoutAdmin = await Customer.find({ admin: { $exists: false } });
    
    console.log(`Found ${customersWithoutAdmin.length} customers without admin assignment`);

    if (customersWithoutAdmin.length === 0) {
      console.log('All customers already have admin assigned');
      process.exit(0);
    }

    // Update all customers to assign to this admin
    const result = await Customer.updateMany(
      { admin: { $exists: false } },
      { $set: { admin: admin._id } }
    );

    console.log(`✅ Successfully assigned ${result.modifiedCount} customers to ${admin.email}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

assignCustomersToAdmin();
