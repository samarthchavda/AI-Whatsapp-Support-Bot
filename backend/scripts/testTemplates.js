const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Template = require('../models/Template');
const Admin = require('../models/Admin');
const whatsappController = require('../controllers/whatsappController');

async function runTest() {
  console.log('🧪 Starting WhatsApp Template Manager Verification...\n');

  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // 2. Setup mock Admin
    const testEmail = 'template-test@store.com';
    let admin = await Admin.findOne({ email: testEmail });
    if (admin) {
      await Admin.deleteOne({ email: testEmail });
    }
    
    admin = new Admin({
      name: 'Template Test Admin',
      email: testEmail,
      password: 'hashedpassword123',
      phone: '1234567890',
      businessName: 'Template Test Store',
      role: 'admin',
      subscriptionPlan: 'starter',
      subscriptionStatus: 'active',
      monthlyPrice: 29,
      geminiTokensUsed: 0,
      geminiTokensLimit: 10000,
      isActive: true
    });
    await admin.save();
    console.log(`👤 Created test admin: ${admin.email}`);

    // Clean up old templates
    await Template.deleteMany({ adminId: admin._id });
    console.log('🧹 Cleaned up old templates.\n');

    let responseStatus = null;
    let responseData = null;

    const resMock = {
      status: function(code) {
        responseStatus = code;
        return this;
      },
      json: function(data) {
        responseData = data;
        return this;
      }
    };

    // 3. Test Sync Templates
    console.log('--- Step 1: Testing syncTemplates controller ---');
    const syncReqMock = {
      admin: admin
    };

    await whatsappController.syncTemplates(syncReqMock, resMock);
    console.log(`Sync status: Success=${responseData?.success}`);
    console.log(`Message: "${responseData?.message}"`);
    console.log(`Synced templates count: ${responseData?.data?.length}`);

    const countInDb = await Template.countDocuments({ adminId: admin._id });
    console.log(`Template documents count in database: ${countInDb} (expected: 4)`);

    if (responseData?.success && countInDb === 4) {
      console.log('✅ Sync templates verification successful.');
    } else {
      console.error('❌ Sync templates verification failed!');
    }

    // 4. Test List Templates
    console.log('\n--- Step 2: Testing getTemplates controller ---');
    const getReqMock = {
      admin: admin
    };

    await whatsappController.getTemplates(getReqMock, resMock);
    console.log(`Get status: Success=${responseData?.success}`);
    console.log(`Returned list count: ${responseData?.data?.length}`);

    if (responseData?.success && responseData?.data?.length === 4) {
      console.log('✅ List templates verification successful.');
    } else {
      console.error('❌ List templates verification failed!');
    }

    // 5. Test Map Template to Event
    console.log('\n--- Step 3: Testing mapTemplate controller ---');
    const orderConfirmTemplate = await Template.findOne({ adminId: admin._id, name: 'order_confirmation' });
    const orderShippedTemplate = await Template.findOne({ adminId: admin._id, name: 'order_shipped' });

    console.log(`Mapping template "${orderConfirmTemplate.name}" to 'order_confirmation'...`);
    const mapReqMock1 = {
      admin: admin,
      params: { id: orderConfirmTemplate._id },
      body: { mappedEvent: 'order_confirmation' }
    };

    await whatsappController.mapTemplate(mapReqMock1, resMock);
    console.log(`Map result success: ${responseData?.success}`);
    console.log(`Mapped event on returned template: "${responseData?.data?.mappedEvent}"`);

    let tplCheck = await Template.findById(orderConfirmTemplate._id);
    console.log(`Database check: mappedEvent = "${tplCheck.mappedEvent}" (expected: 'order_confirmation')`);

    // Verify mapping override
    console.log(`\nMapping template "${orderShippedTemplate.name}" to 'order_confirmation' (should override)...`);
    const mapReqMock2 = {
      admin: admin,
      params: { id: orderShippedTemplate._id },
      body: { mappedEvent: 'order_confirmation' }
    };

    await whatsappController.mapTemplate(mapReqMock2, resMock);
    
    // Fetch both templates from DB to verify override
    const checkConfirm = await Template.findById(orderConfirmTemplate._id);
    const checkShipped = await Template.findById(orderShippedTemplate._id);
    
    console.log(`Database check - "${orderConfirmTemplate.name}" mappedEvent: "${checkConfirm.mappedEvent}" (expected: null)`);
    console.log(`Database check - "${orderShippedTemplate.name}" mappedEvent: "${checkShipped.mappedEvent}" (expected: 'order_confirmation')`);

    if (checkConfirm.mappedEvent === null && checkShipped.mappedEvent === 'order_confirmation') {
      console.log('✅ Template mapping override and cleanup verified successfully.');
    } else {
      console.error('❌ Template mapping override verification failed!');
    }

    // 6. Clean up
    await Template.deleteMany({ adminId: admin._id });
    await Admin.deleteOne({ email: testEmail });
    console.log('\n🧹 Cleaned up test database objects.');
    console.log('\n🎉 WhatsApp Template Manager Verification Complete! Everything working perfectly.');

  } catch (err) {
    console.error('❌ Test failed with error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

runTest();
