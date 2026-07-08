const mongoose = require('/Users/chavdasamarth/Project-Task/AI WhatsApp Support Bot/backend/node_modules/mongoose');
require('/Users/chavdasamarth/Project-Task/AI WhatsApp Support Bot/backend/node_modules/dotenv').config({ path: '/Users/chavdasamarth/Project-Task/AI WhatsApp Support Bot/backend/.env' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.\n");

  const Admin = require('/Users/chavdasamarth/Project-Task/AI WhatsApp Support Bot/backend/models/Admin');
  const DemoRequest = require('/Users/chavdasamarth/Project-Task/AI WhatsApp Support Bot/backend/models/DemoRequest');
  
  // 1. Check recent merchants (Admins)
  console.log("--- RECENT SIGNED UP MERCHANTS (ADMINS) ---");
  const recentAdmins = await Admin.find().sort({ createdAt: -1 }).limit(10);
  if (recentAdmins.length === 0) {
    console.log("No merchant signups found.");
  } else {
    recentAdmins.forEach(admin => {
      console.log(`- Store/Business: ${admin.businessName || 'N/A'}`);
      console.log(`  Name: ${admin.name}`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  Plan: ${admin.subscriptionPlan}`);
      console.log(`  Created At: ${admin.createdAt}`);
      console.log(`  Role: ${admin.role || 'merchant'}`);
      console.log('-----------------------------------------');
    });
  }

  // 2. Check recent demo requests
  console.log("\n--- RECENT DEMO REQUESTS ---");
  const recentDemos = await DemoRequest.find().sort({ createdAt: -1 }).limit(10);
  if (recentDemos.length === 0) {
    console.log("No demo requests found.");
  } else {
    recentDemos.forEach(demo => {
      console.log(`- Business Name: ${demo.businessName}`);
      console.log(`  Name: ${demo.name}`);
      console.log(`  Email: ${demo.email}`);
      console.log(`  Phone: ${demo.phone || 'N/A'}`);
      console.log(`  Website: ${demo.websiteUrl || 'N/A'}`);
      console.log(`  Status: ${demo.status}`);
      console.log(`  Created At: ${demo.createdAt}`);
      console.log('-----------------------------------------');
    });
  }

  await mongoose.disconnect();
  console.log("\nDisconnected from MongoDB.");
}

check().catch(console.error);
