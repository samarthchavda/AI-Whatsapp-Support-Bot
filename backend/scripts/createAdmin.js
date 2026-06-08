const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

async function createDefaultAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@gmail.com' });

    if (existingAdmin) {
      console.log('⚠️  Admin already exists!');
      console.log('Email:', existingAdmin.email);
      console.log('Name:', existingAdmin.name);
      console.log('\nIf you want to reset the password, delete the admin first.');
      process.exit(0);
    }

    // Create default admin (with super_admin role for full access)
    const admin = new Admin({
      email: 'admin@gmail.com',
      password: 'Admin@123',
      name: 'Admin',
      role: 'super_admin',  // Changed from 'admin' to 'super_admin'
      isActive: true,
      subscriptionPlan: 'enterprise',
      subscriptionStatus: 'active'
    });

    await admin.save();

    console.log('\n' + '='.repeat(60));
    console.log('✅ Admin Account Created Successfully!');
    console.log('='.repeat(60));
    console.log('📧 Email:    admin@gmail.com');
    console.log('🔑 Password: Admin@123');
    console.log('👤 Name:     Admin');
    console.log('⭐ Role:     super_admin');
    console.log('='.repeat(60));
    console.log('\n⚠️  IMPORTANT: Change the password after first login!');
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  }
}

createDefaultAdmin();
