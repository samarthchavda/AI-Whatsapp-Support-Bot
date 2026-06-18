const axios = require('axios');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Load env from project backend
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const API_BASE = 'http://localhost:5001/api';

async function runTest() {
  console.log('🧪 Starting Super Admin Features Integration Test...\n');
  
  try {
    // 1. Connect to MongoDB to find user IDs
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    const Admin = require('../models/Admin');
    
    // Find a super admin
    const superAdminUser = await Admin.findOne({ email: 'superadmin@gmail.com' });
    if (!superAdminUser) {
      console.log('❌ Super Admin superadmin@gmail.com not found in database!');
      process.exit(1);
    }
    console.log(`👑 Found Super Admin: ${superAdminUser.email}`);

    // Find a regular merchant user to impersonate
    let merchantUser = await Admin.findOne({ role: 'admin' });
    if (!merchantUser) {
      // Create one if none exists
      merchantUser = new Admin({
        name: 'Test Merchant',
        email: 'test-merchant-impersonate@store.com',
        password: 'Password@123',
        role: 'admin',
        businessName: 'Impersonate Store',
        isActive: true
      });
      await merchantUser.save();
      console.log(`👤 Created temporary merchant user: ${merchantUser.email}`);
    } else {
      console.log(`👤 Found merchant user to impersonate: ${merchantUser.email}`);
    }

    // 2. Log in as Super Admin
    console.log('\n🔑 Logging in as Super Admin...');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: superAdminUser.email,
      password: 'SuperAdmin@123'
    });

    const superAdminToken = loginRes.data.data.accessToken || loginRes.data.data.token;
    console.log('✅ Super Admin Logged In successfully!');

    // 3. Test Impersonation API
    console.log(`\n🕵️ Testing User Impersonation for: ${merchantUser.email}...`);
    const impersonateRes = await axios.post(
      `${API_BASE}/super-admin/users/${merchantUser._id}/impersonate`,
      {},
      { headers: { Authorization: `Bearer ${superAdminToken}` } }
    );

    if (impersonateRes.data.success && impersonateRes.data.data.token) {
      console.log('✅ Impersonation API call succeeded!');
      console.log(`Returned token payload includes flag 'isImpersonated': true`);
      console.log(`Impersonated user name: ${impersonateRes.data.data.user.name}`);
    } else {
      console.log('❌ Impersonation failed:', impersonateRes.data);
    }

    // 4. Test Database Backup API
    console.log('\n💾 Testing Database Backup Download...');
    const backupRes = await axios.get(
      `${API_BASE}/super-admin/db/backup`,
      { headers: { Authorization: `Bearer ${superAdminToken}` } }
    );

    if (backupRes.data && typeof backupRes.data === 'object') {
      console.log('✅ Database Backup Download succeeded!');
      console.log(`Backup file contains keys: ${Object.keys(backupRes.data).join(', ')}`);
      
      // Save backup to a temp file to test restore (using os.tmpdir to avoid nodemon restarts)
      const os = require('os');
      const backupPath = path.join(os.tmpdir(), `temp_db_backup_${Date.now()}.json`);
      fs.writeFileSync(backupPath, JSON.stringify(backupRes.data, null, 2));
      console.log(`💾 Saved backup JSON to: ${backupPath}`);

      // 5. Test Database Restore API
      console.log('\n⚠️ Testing Database Restore Upload...');
      const form = new FormData();
      form.append('file', fs.createReadStream(backupPath));

      const restoreRes = await axios.post(
        `${API_BASE}/super-admin/db/restore`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${superAdminToken}`
          }
        }
      );

      if (restoreRes.data.success) {
        console.log('✅ Database Restore Upload succeeded!');
      } else {
        console.log('❌ Database Restore failed:', restoreRes.data);
      }

      // 6. Test User Details Statistics Isolation
      console.log('\n📊 Testing User Details Statistics Isolation...');
      
      const merchantB = new Admin({
        name: 'Merchant B Test',
        email: 'merchant-b-stats-test@store.com',
        password: 'Password@123',
        role: 'admin',
        businessName: 'Store B',
        isActive: true
      });
      await merchantB.save();
      console.log(`👤 Created merchant B: ${merchantB.email}`);

      const Conversation = require('../models/Conversation');
      const dummyConv = new Conversation({
        customerPhone: '+1999999999',
        customerName: 'Test Customer',
        messages: [{ role: 'user', content: 'hello' }],
        admin: merchantB._id
      });
      await dummyConv.save();
      console.log(`💬 Created 1 dummy conversation for merchant B`);

      // Fetch stats for merchant A
      const detailResA = await axios.get(
        `${API_BASE}/super-admin/users/${merchantUser._id}`,
        { headers: { Authorization: `Bearer ${superAdminToken}` } }
      );

      // Fetch stats for merchant B
      const detailResB = await axios.get(
        `${API_BASE}/super-admin/users/${merchantB._id}`,
        { headers: { Authorization: `Bearer ${superAdminToken}` } }
      );

      const statsA = detailResA.data.data.stats;
      const statsB = detailResB.data.data.stats;

      console.log(`📊 Merchant A (${merchantUser.email}) stats: Conversations = ${statsA.totalConversations}, Orders = ${statsA.totalOrders}`);
      console.log(`📊 Merchant B (${merchantB.email}) stats: Conversations = ${statsB.totalConversations}, Orders = ${statsB.totalOrders}`);

      if (Number(statsA.totalConversations) !== Number(statsB.totalConversations)) {
        console.log('✅ Success: Statistics are correctly isolated per merchant!');
      } else {
        console.log('❌ Failure: Statistics counts are identical (non-isolated)!');
      }

      // Cleanup merchant B
      await Conversation.deleteOne({ _id: dummyConv._id });
      await Admin.deleteOne({ _id: merchantB._id });
      console.log('🧹 Cleaned up merchant B and its dummy conversation');

      // Cleanup temp backup file
      try {
        fs.unlinkSync(backupPath);
        console.log('🧹 Cleaned up temporary backup file');
      } catch (err) {
        // ignore
      }
    } else {
      console.log('❌ Backup failed or returned invalid data format:', typeof backupRes.data);
    }

    // Clean up temporary merchant user if created
    if (merchantUser.email === 'test-merchant-impersonate@store.com') {
      await Admin.deleteOne({ _id: merchantUser._id });
      console.log('\n🧹 Cleaned up temporary merchant user');
    }

    console.log('\n🎉 All Super Admin Features tested successfully!');
  } catch (error) {
    console.error('❌ Integration test failed with error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

runTest();
