require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const PricingPlan = require('../models/PricingPlan');
const { PLAN_DEFINITIONS } = require('../config/planConstants');

async function migrate() {
  console.log('🔌 Connecting to MongoDB for subscription plan migration...');
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not set in environment.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // 1. Update Admin documents from legacy plan names ('professional' -> 'growth', 'enterprise' -> 'scale')
  const professionalAdmins = await Admin.updateMany(
    { subscriptionPlan: 'professional' },
    { $set: { subscriptionPlan: 'growth' } }
  );
  console.log(`✅ Migrated ${professionalAdmins.modifiedCount} Admin accounts from 'professional' to 'growth'.`);

  const enterpriseAdmins = await Admin.updateMany(
    { subscriptionPlan: 'enterprise' },
    { $set: { subscriptionPlan: 'scale' } }
  );
  console.log(`✅ Migrated ${enterpriseAdmins.modifiedCount} Admin accounts from 'enterprise' to 'scale'.`);

  // 2. Ensure PricingPlan collection entries match official definitions
  for (const [key, def] of Object.entries(PLAN_DEFINITIONS)) {
    if (key === 'custom') continue;

    let existing = await PricingPlan.findOne({ name: key });
    if (!existing && key === 'growth') {
      existing = await PricingPlan.findOne({ name: 'professional' });
    }
    if (!existing && key === 'scale') {
      existing = await PricingPlan.findOne({ name: 'enterprise' });
    }

    if (existing) {
      existing.name = def.name;
      existing.displayName = def.displayName;
      existing.monthlyPrice = def.monthlyPrice;
      existing.description = def.description;
      existing.features = def.features;
      await existing.save();
      console.log(`✅ Updated PricingPlan record for '${def.name}' (₹${def.monthlyPrice}/mo)`);
    } else {
      const newPlan = new PricingPlan({
        name: def.name,
        displayName: def.displayName,
        monthlyPrice: def.monthlyPrice,
        description: def.description,
        features: def.features,
        isActive: true
      });
      await newPlan.save();
      console.log(`✨ Created new PricingPlan record for '${def.name}' (₹${def.monthlyPrice}/mo)`);
    }
  }

  // Remove any remaining old legacy PricingPlan documents
  await PricingPlan.deleteMany({ name: { $in: ['professional', 'enterprise'] } });
  console.log('🧹 Purged remaining legacy PricingPlan records (professional, enterprise).');

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB. Migration completed successfully!');
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
