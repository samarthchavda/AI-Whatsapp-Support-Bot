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

  console.log('🔍 Checking for Enterprise plan in the database...');
  const enterprisePlan = await PricingPlan.findOne({ name: 'enterprise' });

  if (enterprisePlan) {
    console.log(`Found Enterprise plan with price: ₹${enterprisePlan.monthlyPrice}`);
    if (enterprisePlan.monthlyPrice !== 14000) {
      enterprisePlan.monthlyPrice = 14000;
      await enterprisePlan.save();
      console.log('✅ Updated Enterprise plan price to ₹14000 successfully in DB!');
    } else {
      console.log('ℹ️ Enterprise plan price is already ₹14000 in DB.');
    }
  } else {
    console.log('ℹ️ No active Enterprise plan document found in DB (using code fallback).');
  }

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB.');
}

migrate().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
