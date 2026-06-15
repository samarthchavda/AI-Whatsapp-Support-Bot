const Broadcast = require('../models/Broadcast');
const Admin = require('../models/Admin');
const whatsappCloudAPI = require('./whatsappCloudAPI');

// Simple fallback without Redis
let useQueue = false;

console.log('⚠️  Using fallback broadcast method (Redis not configured)');

// Fallback method without queue (if Redis is not available)
async function sendBroadcastWithoutQueue(broadcastId) {
  try {
    const broadcast = await Broadcast.findById(broadcastId);
    
    if (!broadcast) {
      throw new Error('Broadcast not found');
    }

    // Fetch admin credentials for sending messages
    const admin = await Admin.findById(broadcast.admin);
    let customCredentials = null;
    if (admin && admin.whatsappAccessToken && admin.whatsappPhoneNumberId) {
      customCredentials = {
        accessToken: admin.whatsappAccessToken,
        phoneNumberId: admin.whatsappPhoneNumberId,
        businessAccountId: admin.whatsappBusinessAccountId
      };
    }

    broadcast.status = 'sending';
    broadcast.startedAt = new Date();
    await broadcast.save();

    // Send messages sequentially
    for (let i = 0; i < broadcast.recipients.length; i++) {
      try {
        const recipient = broadcast.recipients[i];
        const personalizedMessage = broadcast.message.replace(/{{name}}/gi, recipient.name || 'there');
        
        console.log(`📤 Sending actual WhatsApp broadcast to ${recipient.phone}: ${personalizedMessage.substring(0, 50)}...`);
        
        const sendResult = await whatsappCloudAPI.sendMessage(recipient.phone, personalizedMessage, customCredentials);
        
        if (sendResult && sendResult.success) {
          broadcast.recipients[i].status = 'sent';
          broadcast.recipients[i].sentAt = new Date();
          broadcast.sentCount += 1;
        } else {
          throw new Error(sendResult ? sendResult.error : 'Failed to send via Cloud API');
        }
      } catch (error) {
        console.error(`❌ Failed to send broadcast to ${broadcast.recipients[i].phone}:`, error.message);
        broadcast.recipients[i].status = 'failed';
        broadcast.recipients[i].error = error.message;
        broadcast.failedCount += 1;
      }
      
      await broadcast.save();
      
      // Delay to avoid hitting Meta rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    broadcast.status = 'completed';
    broadcast.completedAt = new Date();
    await broadcast.save();

    return { success: true, sentCount: broadcast.sentCount };
  } catch (error) {
    console.error('Error in fallback broadcast:', error);
    throw error;
  }
}

// Add broadcast to queue (always uses fallback)
async function addBroadcastToQueue(broadcastId) {
  console.log('📋 Using fallback broadcast method');
  return await sendBroadcastWithoutQueue(broadcastId);
}

// Get queue stats
async function getQueueStats() {
  return { waiting: 0, active: 0, completed: 0, failed: 0, usingFallback: true };
}

module.exports = {
  broadcastQueue: null,
  addBroadcastToQueue,
  getQueueStats
};
