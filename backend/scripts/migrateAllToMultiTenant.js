const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Order = require('../models/Order');
const Escalation = require('../models/Escalation');
const Broadcast = require('../models/Broadcast');
const Customer = require('../models/Customer');
const Admin = require('../models/Admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function migrateAllToMultiTenant() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    console.log('='.repeat(60));

    // Find the admin to assign data to (admin@gmail.com)
    const admin = await Admin.findOne({ email: 'admin@gmail.com' });
    
    if (!admin) {
      console.log('❌ Admin not found. Please create admin@gmail.com first.');
      process.exit(1);
    }

    console.log(`✅ Found admin: ${admin.name} (${admin.email})`);
    console.log('='.repeat(60));

    // Migrate Conversations
    console.log('\n📝 Migrating Conversations...');
    const conversationsWithoutAdmin = await Conversation.countDocuments({ admin: { $exists: false } });
    if (conversationsWithoutAdmin > 0) {
      const convResult = await Conversation.updateMany(
        { admin: { $exists: false } },
        { $set: { admin: admin._id } }
      );
      console.log(`✅ Assigned ${convResult.modifiedCount} conversations to ${admin.email}`);
    } else {
      console.log('✅ All conversations already have admin assigned');
    }

    // Migrate Orders
    console.log('\n📦 Migrating Orders...');
    const ordersWithoutAdmin = await Order.countDocuments({ admin: { $exists: false } });
    if (ordersWithoutAdmin > 0) {
      const orderResult = await Order.updateMany(
        { admin: { $exists: false } },
        { $set: { admin: admin._id } }
      );
      console.log(`✅ Assigned ${orderResult.modifiedCount} orders to ${admin.email}`);
    } else {
      console.log('✅ All orders already have admin assigned');
    }

    // Migrate Escalations
    console.log('\n🚨 Migrating Escalations...');
    const escalationsWithoutAdmin = await Escalation.countDocuments({ admin: { $exists: false } });
    if (escalationsWithoutAdmin > 0) {
      const escalationResult = await Escalation.updateMany(
        { admin: { $exists: false } },
        { $set: { admin: admin._id } }
      );
      console.log(`✅ Assigned ${escalationResult.modifiedCount} escalations to ${admin.email}`);
    } else {
      console.log('✅ All escalations already have admin assigned');
    }

    // Migrate Broadcasts
    console.log('\n📢 Migrating Broadcasts...');
    const broadcastsWithoutAdmin = await Broadcast.countDocuments({ admin: { $exists: false } });
    if (broadcastsWithoutAdmin > 0) {
      const broadcastResult = await Broadcast.updateMany(
        { admin: { $exists: false } },
        { $set: { admin: admin._id } }
      );
      console.log(`✅ Assigned ${broadcastResult.modifiedCount} broadcasts to ${admin.email}`);
    } else {
      console.log('✅ All broadcasts already have admin assigned');
    }

    // Migrate Customers
    console.log('\n👥 Migrating Customers...');
    const customersWithoutAdmin = await Customer.countDocuments({ admin: { $exists: false } });
    if (customersWithoutAdmin > 0) {
      const customerResult = await Customer.updateMany(
        { admin: { $exists: false } },
        { $set: { admin: admin._id } }
      );
      console.log(`✅ Assigned ${customerResult.modifiedCount} customers to ${admin.email}`);
    } else {
      console.log('✅ All customers already have admin assigned');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Multi-tenant migration completed successfully!');
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migrateAllToMultiTenant();
