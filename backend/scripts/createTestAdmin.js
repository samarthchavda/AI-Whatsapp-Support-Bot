require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

async function createTestAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check if test admin already exists
    const existingAdmin = await Admin.findOne({ email: 'test@gmail.com' });
    
    if (existingAdmin) {
      console.log('⚠️  Test admin already exists!');
      console.log('Email:', existingAdmin.email);
      console.log('\nTo reset password, delete the admin first.\n');
      process.exit(0);
    }

    // Create test admin
    const testAdmin = new Admin({
      name: 'Test User',
      email: 'test@gmail.com',
      password: 'test@123',
      role: 'admin'
    });

    await testAdmin.save();

    console.log('============================================================');
    console.log('✅ Test Admin Created Successfully!');
    console.log('============================================================');
    console.log('Email:    test@gmail.com');
    console.log('Password: test@123');
    console.log('Name:     Test User');
    console.log('Role:     admin');
    console.log('============================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test admin:', error.message);
    process.exit(1);
  }
}

createTestAdmin();
