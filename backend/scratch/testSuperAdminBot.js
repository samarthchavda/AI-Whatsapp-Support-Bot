const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const superAdminBotService = require('../services/superAdminBotService');

async function run() {
  console.log('🧪 Testing Super Admin WhatsApp Bot Service...\n');

  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // 2. Test system summary generation
    const summary = await superAdminBotService.getSystemSummary();
    console.log('\n--- System Summary Output ---');
    console.log(summary);
    console.log('-----------------------------\n');

    // 3. Test interactive query response generation (mocking execution)
    const testQuery = 'Show active merchants and recent errors';
    console.log(`💬 Simulating query: "${testQuery}"`);
    
    // We mock the send method to see the text generated
    const originalSendMessage = require('../services/whatsappCloudAPI').sendMessage;
    
    // Override message sender to log the reply locally instead of calling the live Meta API
    require('../services/whatsappCloudAPI').sendMessage = async (phone, message) => {
      console.log('\n📱 WhatsApp Outbox (Intercepted):');
      console.log(`• Destination: ${phone}`);
      console.log('• Body:\n' + message);
      return { success: true, messageId: 'mock_super_admin_reply_123' };
    };

    await superAdminBotService.handleSuperAdminQuery('+918128420287', testQuery);

    // Restore original function
    require('../services/whatsappCloudAPI').sendMessage = originalSendMessage;
    
    console.log('\n🎉 ALL SUPER ADMIN BOT INTEGRATION TESTS PASSED!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during Super Admin Bot test:', error);
    process.exit(1);
  }
}

run();
