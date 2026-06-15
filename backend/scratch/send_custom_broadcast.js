const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Admin = require('../models/Admin');
const Broadcast = require('../models/Broadcast');
const { addBroadcastToQueue } = require('../services/broadcastQueue');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Find target admin chavdasamarth02@gmail.com
  const admin = await Admin.findOne({ email: 'chavdasamarth02@gmail.com' });
  if (!admin) {
    throw new Error('Admin chavdasamarth02@gmail.com not found in database!');
  }
  console.log(`👤 Found Admin: ${admin.name} (${admin.email})`);

  // Define the campaign message (with {{name}} variable)
  const promoMessage = 
`⚡ *FitFuel Mega Summer Promo!* ⚡

Hi {{name}}! 👋

Ready to power up your fitness goals? Enjoy flat *30% OFF* storewide! Use code *FITSUMMER30* at checkout.

🚚 *FREE* shipping on orders over ₹999.

👉 Shop now: https://fitfuel-store.myshopify.com`;

  // Define recipients
  const recipientsList = [
    { phone: '918128420287', name: 'Samarth Chavda' },
    { phone: '919054167563', name: 'Arjun Chavda' }
  ];

  // Save the Broadcast document in MongoDB
  const broadcast = new Broadcast({
    title: 'FitFuel Mega Summer Promo',
    message: promoMessage,
    recipients: recipientsList.map(r => ({
      phone: r.phone,
      name: r.name,
      status: 'pending'
    })),
    totalRecipients: recipientsList.length,
    createdBy: admin._id,
    createdByName: admin.name,
    admin: admin._id,
    csvFileName: 'manual-test-run.csv'
  });

  await broadcast.save();
  console.log(`💾 Saved broadcast document: ${broadcast._id}`);

  // Send the broadcast using the upgraded queue helper (actual API dispatch)
  console.log('🚀 Triggering actual broadcast dispatch...');
  const result = await addBroadcastToQueue(broadcast._id);
  console.log('🎉 Broadcast dispatch result:', result);

  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB');
}

main().catch(err => {
  console.error('❌ Error running broadcast script:', err);
  process.exit(1);
});
