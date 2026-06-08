const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

async function createSuperAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Check if super admin already exists
    const existingSuperAdmin = await Admin.findOne({ role: 'super_admin' });
    
    if (existingSuperAdmin) {
      console.log('⚠️  Super admin already exists:', existingSuperAdmin.email);
      process.exit(0);
    }

    // Create super admin
    const superAdmin = new Admin({
      email: 'superadmin@gmail.com',
      password: 'SuperAdmin@123',
      name: 'Super Administrator',
      role: 'super_admin',
      isActive: true,
      subscriptionPlan: 'enterprise',
      subscriptionStatus: 'active'
    });

    await superAdmin.save();

    console.log('✅ Super admin created successfully!');
    console.log('📧 Email: superadmin@gmail.com');
    console.log('🔑 Password: SuperAdmin@123');
    console.log('⚠️  Please change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating super admin:', error);
    process.exit(1);
  }
}

createSuperAdmin();
