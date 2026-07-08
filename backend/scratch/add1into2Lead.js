const mongoose = require('/Users/chavdasamarth/Project-Task/AI WhatsApp Support Bot/backend/node_modules/mongoose');
require('/Users/chavdasamarth/Project-Task/AI WhatsApp Support Bot/backend/node_modules/dotenv').config({ path: '/Users/chavdasamarth/Project-Task/AI WhatsApp Support Bot/backend/.env' });

async function insert() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  const Lead = require('/Users/chavdasamarth/Project-Task/AI WhatsApp Support Bot/backend/models/Lead');

  const lead = {
    name: '1into2 Digital Owner',
    email: 'info@1into2.com',
    phone: '+919725668623',
    businessName: '1into2 Digital',
    websiteUrl: 'https://1into2.com/',
    status: 'new',
    source: 'other',
    notes: 'Digital marketing and advertising agency located in Rajkot, Gujarat. Services include SEO, SMM, PPC/Google Ads, web development, and branding. Contact: +919725668623, info@1into2.com.'
  };

  const exists = await Lead.findOne({ businessName: lead.businessName });
  if (!exists) {
    await Lead.create(lead);
    console.log(`Added lead: ${lead.businessName}`);
  } else {
    console.log(`Lead already exists: ${lead.businessName}`);
  }

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB.");
}

insert().catch(console.error);
