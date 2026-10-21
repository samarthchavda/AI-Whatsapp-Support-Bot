const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const Admin = require('../models/Admin');

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set in environment.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const targetEmail = 'chavdasamarth4@gmail.com';
  const twoYearsFuture = new Date();
  twoYearsFuture.setFullYear(twoYearsFuture.getFullYear() + 2);

  // 1. Specifically update target user chavdasamarth4@gmail.com
  const user = await Admin.findOne({ email: targetEmail });
  if (user) {
    user.subscriptionPlan = 'scale';
    user.subscriptionStatus = 'active';
    user.subscriptionStartDate = new Date();
    user.subscriptionEndDate = twoYearsFuture;
    user.isActive = true;
    user.broadcastCampaignsUsed = 0;
    user.broadcastMessagesUsed = 0;
    await user.save();
    console.log(`🎉 Successfully activated Scale subscription for ${user.email} (${user.name}) until ${twoYearsFuture.toLocaleDateString()}`);
  } else {
    console.log(`⚠️ User ${targetEmail} not found in database.`);
  }

  // 2. Also renew all other admin users whose subscription is marked expired
  const now = new Date();
  const res = await Admin.updateMany(
    {
      role: { $ne: 'super_admin' },
      $or: [
        { subscriptionEndDate: { $lt: now } },
        { subscriptionStatus: 'inactive' },
        { subscriptionStatus: 'expired' }
      ]
    },
    {
      $set: {
        subscriptionStatus: 'active',
        subscriptionEndDate: twoYearsFuture
      }
    }
  );
  console.log(`✅ Updated ${res.modifiedCount} expired admin accounts to active status.`);

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
}

main().catch(err => {
  console.error('❌ Error executing script:', err);
  process.exit(1);
});
