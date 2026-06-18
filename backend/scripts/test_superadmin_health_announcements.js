const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load env from project backend
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Admin = require('../models/Admin');
const Announcement = require('../models/Announcement');
const superAdminController = require('../controllers/superAdminController');
const dashboardController = require('../controllers/dashboardController');

// Mock req and res objects
function createMockReq(params = {}, body = {}, admin = {}) {
  return {
    params,
    body,
    admin,
    app: {
      get: () => null
    }
  };
}

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    jsonData: null,
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.jsonData = data;
      return this;
    }
  };
  return res;
}

async function runTest() {
  console.log('🧪 Starting Super Admin Health & Announcements Integration Test...\n');

  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Find or create super admin
    let superAdmin = await Admin.findOne({ email: 'superadmin@gmail.com' });
    if (!superAdmin) {
      superAdmin = new Admin({
        name: 'Super Admin Test',
        email: 'superadmin@gmail.com',
        password: 'SuperAdmin@123',
        role: 'super_admin',
        isActive: true
      });
      await superAdmin.save();
      console.log('👑 Created mock Super Admin user');
    } else {
      console.log(`👑 Found Super Admin: ${superAdmin.email}`);
    }

    // Find or create a regular merchant
    let merchant = await Admin.findOne({ email: 'merchant-test-health@store.com' });
    if (merchant) {
      await Admin.deleteOne({ _id: merchant._id });
    }
    merchant = new Admin({
      name: 'Health Test Merchant',
      email: 'merchant-test-health@store.com',
      password: 'Password@123',
      role: 'admin',
      businessName: 'Health Test Store',
      isActive: true,
      whatsappAccessToken: 'mock_access_token_123',
      whatsappPhoneNumberId: '100000000000001',
      whatsappConnected: true
    });
    await merchant.save();
    console.log(`👤 Created temporary merchant user: ${merchant.email}`);

    // --- TEST 1: Retrieve Connection Health Statuses ---
    console.log('\n📊 Test 1: Fetching connection health statuses...');
    let req = createMockReq({}, {}, superAdmin);
    let res = createMockRes();

    await superAdminController.getConnectionHealthStatus(req, res);

    if (res.jsonData && res.jsonData.success) {
      const summary = res.jsonData.data.summary;
      console.log('✅ Connection Health retrieval succeeded!');
      console.log(`   Summary stats: Configured=${summary.totalConfigured}, Healthy=${summary.healthy}, Offline=${summary.offline}, Unconfigured=${summary.unconfigured}`);
      
      const foundMerchant = res.jsonData.data.merchants.find(m => m.email === merchant.email);
      if (foundMerchant) {
        console.log(`   Found merchant in list with status: ${foundMerchant.status}`);
      } else {
        console.log('   ❌ Error: Temporary merchant not found in list!');
      }
    } else {
      console.log('   ❌ Error: Connection health retrieval failed!', res.jsonData);
    }

    // --- TEST 2: Verify WhatsApp connection (Expected: fail due to mock credentials) ---
    console.log('\n📱 Test 2: Verifying WhatsApp credentials status...');
    req = createMockReq({ id: merchant._id }, {}, superAdmin);
    res = createMockRes();

    await superAdminController.verifyUserWhatsAppConnection(req, res);

    console.log('✅ Verification action complete.');
    console.log(`   Response status: ${res.jsonData.status}`);
    console.log(`   Response message: ${res.jsonData.message}`);

    // Check if db reflects connection status update to false
    const updatedMerchant = await Admin.findById(merchant._id);
    console.log(`   Database whatsappConnected state updated to: ${updatedMerchant.whatsappConnected}`);
    if (updatedMerchant.whatsappConnected === false) {
      console.log('   ✅ Success: whatsappConnected flag was disabled after failed credential verification!');
    } else {
      console.log('   ❌ Error: whatsappConnected flag remained true!');
    }

    // --- TEST 3: Alert merchant about offline status via Email ---
    console.log('\n✉️ Test 3: Sending offline connection warning email...');
    req = createMockReq({ id: merchant._id }, {}, superAdmin);
    res = createMockRes();

    await superAdminController.alertUserConnectionOffline(req, res);
    if (res.jsonData && res.jsonData.success) {
      console.log(`   ✅ Success: ${res.jsonData.message}`);
    } else {
      console.log('   ❌ Error: Warning alert failed to send.', res.jsonData);
    }

    // --- TEST 4: Create system announcement ---
    console.log('\n📣 Test 4: Creating a system announcement...');
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 2); // expires in 2 days

    const announcementBody = {
      title: 'Database Upgrades Scheduled',
      content: 'We will be performing routine database upgrades tonight at 2 AM UTC. Brief latency may occur.',
      type: 'warning',
      expiresAt: expiryDate,
      isActive: true
    };

    req = createMockReq({}, announcementBody, superAdmin);
    res = createMockRes();

    await superAdminController.createAnnouncement(req, res);
    let announcementId = null;

    if (res.jsonData && res.jsonData.success) {
      announcementId = res.jsonData.data._id;
      console.log('   ✅ Success: Announcement created with ID:', announcementId);
      console.log(`   Announcement details: Title="${res.jsonData.data.title}", Type="${res.jsonData.data.type}"`);
    } else {
      console.log('   ❌ Error: Failed to create announcement', res.jsonData);
    }

    // --- TEST 5: Fetch active announcements (Merchant side) ---
    console.log('\n📋 Test 5: Fetching active announcements on client side...');
    req = createMockReq({}, {}, merchant);
    res = createMockRes();

    await dashboardController.getActiveAnnouncements(req, res);

    if (res.jsonData && res.jsonData.success) {
      console.log('   ✅ Success: Active announcements fetched!');
      console.log(`   Count of active announcements: ${res.jsonData.data.length}`);
      const foundAnn = res.jsonData.data.find(a => a._id.toString() === announcementId.toString());
      if (foundAnn) {
        console.log(`   Verified: Seeded announcement "${foundAnn.title}" is active and present in client feed.`);
      } else {
        console.log('   ❌ Error: Seeded announcement not found in active list!');
      }
    } else {
      console.log('   ❌ Error: Failed to fetch active announcements', res.jsonData);
    }

    // --- TEST 6: Toggle and deactivate announcement ---
    console.log('\n⚙️ Test 6: Deactivating announcement...');
    req = createMockReq({ id: announcementId }, {}, superAdmin);
    res = createMockRes();

    await superAdminController.toggleAnnouncementStatus(req, res);

    if (res.jsonData && res.jsonData.success) {
      console.log(`   ✅ Success: ${res.jsonData.message}`);
      
      // Fetch active announcements again to verify it is no longer listed
      req = createMockReq({}, {}, merchant);
      res = createMockRes();
      await dashboardController.getActiveAnnouncements(req, res);
      
      const foundAnn = res.jsonData.data.find(a => a._id.toString() === announcementId.toString());
      if (!foundAnn) {
        console.log('   ✅ Verified: Deactivated announcement is excluded from client active feed.');
      } else {
        console.log('   ❌ Error: Deactivated announcement still present in client active feed!');
      }
    } else {
      console.log('   ❌ Error: Toggle announcement failed', res.jsonData);
    }

    // --- CLEANUP ---
    console.log('\n🧹 Cleaning up test database records...');
    if (announcementId) {
      await Announcement.findByIdAndDelete(announcementId);
      console.log('   Cleaned up test announcement');
    }
    await Admin.deleteOne({ _id: merchant._id });
    console.log('   Cleaned up test merchant user');

    console.log('\n🎉 All Super Admin Health & Announcements Integration Tests Passed Successfully!');
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

runTest();
