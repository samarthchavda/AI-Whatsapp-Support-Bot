const mongoose = require('mongoose');
const Admin = require('../../models/Admin');
require('dotenv').config();
const SEED_PASSWORD = process.env.SEED_ADMIN_PASSWORD || require('crypto').randomBytes(12).toString('base64url');

async function resetSuperAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Find and delete existing superadmin
    const existingSuperAdmin = await Admin.findOne({ role: 'super_admin' });
    
    if (existingSuperAdmin) {
      await Admin.deleteOne({ role: 'super_admin' });
      console.log('🗑️  Deleted existing superadmin account');
    }

    // Create fresh super admin
    const superAdmin = new Admin({
      email: 'superadmin@gmail.com',
      password: SEED_PASSWORD,  // Plain text - will be hashed by pre-save hook
      name: 'Super Administrator',
      role: 'super_admin',
      isActive: true,
      subscriptionPlan: 'enterprise',
      subscriptionStatus: 'active'
    });

    await superAdmin.save();

    console.log('\n' + '='.repeat(60));
    console.log('✅ Super Admin Account RESET Successfully!');
    console.log('='.repeat(60));
    console.log('📧 Email:    superadmin@gmail.com');
    console.log(`🔑 Password: ${SEED_PASSWORD}`);
    console.log('👤 Role:     super_admin');
    console.log('='.repeat(60));
    console.log('\n🔓 Now try logging in with these credentials!');
    console.log('⚠️  Remember to change password after first login!');
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting super admin:', error.message);
    process.exit(1);
  }
}

resetSuperAdmin();
