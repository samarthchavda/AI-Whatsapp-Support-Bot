require('dotenv').config();
const { runMarketingAgent } = require('./app');

console.log('🎬 Manually triggering AI Video Marketing Agent execution...\n');

// Read arguments if any (flowType: templates_sync, chat_crm, billing)
const flowType = process.argv[2] || 'templates_sync';
const voiceName = process.argv[3] || 'alloy';

runMarketingAgent(flowType, voiceName)
  .then(result => {
    console.log('\n✅ Marketing Agent finished successfully!');
    console.log('Result details:', JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Marketing Agent failed with error:', err.message);
    process.exit(1);
  });
