const mongoose = require('mongoose');
const Escalation = require('../models/Escalation');
const Admin = require('../models/Admin');
require('dotenv').config();

async function assignEscalationsToAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the admin to assign escalations to (admin@gmail.com)
    const admin = await Admin.findOne({ email: 'admin@gmail.com' });
    
    if (!admin) {
      console.log('Admin not found. Please create admin@gmail.com first.');
      process.exit(1);
    }

    console.log(`Found admin: ${admin.name} (${admin.email})`);

    // Find all escalations without admin field
    const escalationsWithoutAdmin = await Escalation.find({ admin: { $exists: false } });
    
    console.log(`Found ${escalationsWithoutAdmin.length} escalations without admin assignment`);

    if (escalationsWithoutAdmin.length === 0) {
      console.log('All escalations already have admin assigned');
      process.exit(0);
    }

    // Update all escalations to assign to this admin
    const result = await Escalation.updateMany(
      { admin: { $exists: false } },
      { $set: { admin: admin._id } }
    );

    console.log(`✅ Successfully assigned ${result.modifiedCount} escalations to ${admin.email}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

assignEscalationsToAdmin();
