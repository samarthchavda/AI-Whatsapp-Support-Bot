const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Admin = require('../models/Admin');
require('dotenv').config();

async function assignConversations() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find the first admin (not super_admin)
    const admin = await Admin.findOne({ role: { $ne: 'super_admin' } });
    
    if (!admin) {
      console.log('⚠️  No admin found. Creating a default admin...');
      const newAdmin = new Admin({
        name: 'Admin',
        email: 'admin@gmail.com',
        password: 'Admin@123',
        role: 'admin',
        subscriptionPlan: 'professional',
        subscriptionStatus: 'active'
      });
      await newAdmin.save();
      console.log('✅ Default admin created');
      
      // Assign all conversations to this admin
      const result = await Conversation.updateMany(
        { admin: { $exists: false } },
        { $set: { admin: newAdmin._id } }
      );
      
      console.log(`✅ Assigned ${result.modifiedCount} conversations to admin: ${newAdmin.email}`);
    } else {
      // Assign all conversations without admin to the first admin found
      const result = await Conversation.updateMany(
        { admin: { $exists: false } },
        { $set: { admin: admin._id } }
      );
      
      console.log(`✅ Assigned ${result.modifiedCount} conversations to admin: ${admin.email}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

assignConversations();
