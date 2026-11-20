const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Auto-detect .env file location
const envCandidates = [
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'backend', '.env'),
  path.join(__dirname, '.env'),
  path.join(__dirname, '../.env')
];
for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    break;
  }
}

// Auto-detect Models
let Admin, GlobalSettings;
try {
  Admin = require('./models/Admin');
  GlobalSettings = require('./models/GlobalSettings');
} catch (e1) {
  try {
    Admin = require('../models/Admin');
    GlobalSettings = require('../models/GlobalSettings');
  } catch (e2) {
    Admin = require(path.join(process.cwd(), 'models/Admin'));
    GlobalSettings = require(path.join(process.cwd(), 'models/GlobalSettings'));
  }
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not configured in backend/.env');
    process.exit(1);
  }

  console.log('🔄 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB successfully.\n');

  // 1. Find all Admin / Merchant / Super Admin records with WhatsApp connected or credentials configured
  const connectedAdmins = await Admin.find({
    $or: [
      { whatsappConnected: true },
      { whatsappPhoneNumberId: { $ne: null } },
      { whatsappAccessToken: { $ne: null } },
      { whatsappBusinessAccountId: { $ne: null } },
      { whatsappConnections: { $exists: true, $not: { $size: 0 } } }
    ]
  });

  console.log(`📋 Found ${connectedAdmins.length} account(s) with WhatsApp connection/credentials:`);

  for (const admin of connectedAdmins) {
    console.log(`\n--------------------------------------------------`);
    console.log(`👤 User: ${admin.name} (${admin.email}) [Role: ${admin.role}]`);
    console.log(`📱 Phone: ${admin.whatsappDisplayPhoneNumber || admin.phone || admin.businessPhone || 'N/A'}`);
    console.log(`🆔 Phone Number ID: ${admin.whatsappPhoneNumberId || 'N/A'}`);
    console.log(`🏢 WABA Account ID: ${admin.whatsappBusinessAccountId || 'N/A'}`);
    console.log(`🔌 Status: ${admin.whatsappConnected ? 'Connected' : 'Saved/Inactive'}`);

    const token = admin.whatsappAccessToken;
    const wabaId = admin.whatsappBusinessAccountId;
    const phoneId = admin.whatsappPhoneNumberId;

    // A. Disconnect from Meta Graph API (Unsubscribe WABA from Webhook)
    if (wabaId && token) {
      try {
        console.log(`🌐 Calling Meta Graph API to unsubscribe app from WABA: ${wabaId}...`);
        const unsubRes = await axios.delete(
          `https://graph.facebook.com/v25.0/${wabaId}/subscribed_apps`,
          {
            params: { access_token: token },
            timeout: 10000
          }
        );
        console.log(`✅ Meta Webhook Unsubscribed successfully! Response:`, unsubRes.data);
      } catch (metaErr) {
        console.warn(`⚠️ Meta WABA unsubscribe notice:`, metaErr.response?.data?.error?.message || metaErr.message);
      }
    }

    // B. Deregister Phone Number from Meta Cloud API
    if (phoneId && token) {
      try {
        console.log(`🌐 Calling Meta Graph API to deregister Phone Number ID: ${phoneId}...`);
        const deregRes = await axios.post(
          `https://graph.facebook.com/v25.0/${phoneId}/deregister`,
          { messaging_product: 'whatsapp' },
          {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 10000
          }
        );
        console.log(`✅ Meta Phone Number Deregistered successfully! Response:`, deregRes.data);
      } catch (deregErr) {
        console.warn(`⚠️ Meta Phone Number deregistration notice:`, deregErr.response?.data?.error?.message || deregErr.message);
      }
    }

    // C. Clean up database fields on the Admin record
    admin.whatsappConnected = false;
    admin.whatsappConnectedAt = null;
    admin.whatsappAccessToken = null;
    admin.whatsappPhoneNumberId = null;
    admin.whatsappBusinessAccountId = null;
    admin.whatsappBusinessId = null;
    admin.whatsappAppId = null;
    admin.whatsappDisplayPhoneNumber = null;
    admin.whatsappBusinessName = null;
    admin.whatsappStatus = 'disconnected';
    admin.whatsappConnections = [];
    await admin.save();

    console.log(`💾 Database record cleared: WhatsApp disconnected for ${admin.email}`);
  }

  // 2. Clear GlobalSettings (System-wide WhatsApp credentials)
  console.log(`\n--------------------------------------------------`);
  console.log(`🧹 Clearing GlobalSettings WhatsApp credentials...`);
  const keysToDelete = [
    'whatsapp_access_token',
    'whatsapp_phone_number_id',
    'whatsapp_business_account_id'
  ];

  const deleteResult = await GlobalSettings.deleteMany({ key: { $in: keysToDelete } });
  console.log(`✅ Deleted ${deleteResult.deletedCount} system WhatsApp credential key(s) from GlobalSettings.`);

  console.log(`\n🎉 Disconnection complete! All WhatsApp numbers and Meta connections have been fully disconnected.`);
  await mongoose.disconnect();
  console.log('🔌 Disconnected from MongoDB.\n');
}

main().catch(err => {
  console.error('❌ Error during WhatsApp disconnection:', err);
  process.exit(1);
});
