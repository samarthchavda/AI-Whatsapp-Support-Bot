require('dotenv').config();
const mongoose = require('mongoose');
const PricingPlan = require('../models/PricingPlan.js');

async function migrate() {
  console.log('🔌 Connecting to MongoDB...');
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in .env');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected!');

  const planUpdates = [
    { name: 'starter', newPrice: 1499 },
    { name: 'professional', newPrice: 2999 },
    { name: 'enterprise', newPrice: 9999 }
  ];

  for (const update of planUpdates) {
    console.log(`🔍 Checking for ${update.name} plan in the database...`);
    const plan = await PricingPlan.findOne({ name: update.name });

    if (plan) {
      console.log(`Found ${update.name} plan with price: ₹${plan.monthlyPrice}`);
      if (plan.monthlyPrice !== update.newPrice) {
        plan.monthlyPrice = update.newPrice;
        await plan.save();
        console.log(`✅ Updated ${update.name} plan price to ₹${update.newPrice} successfully in DB!`);
      } else {
        console.log(`ℹ️ ${update.name} plan price is already ₹${update.newPrice} in DB.`);
      }
    } else {
      console.log(`ℹ️ No active ${update.name} plan document found in DB.`);
    }
  }

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB.');
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
