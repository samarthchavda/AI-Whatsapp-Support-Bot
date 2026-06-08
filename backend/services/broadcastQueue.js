const Broadcast = require('../models/Broadcast');

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

    broadcast.status = 'sending';
    broadcast.startedAt = new Date();
    await broadcast.save();

    // Send messages sequentially
    for (let i = 0; i < broadcast.recipients.length; i++) {
      try {
        const recipient = broadcast.recipients[i];
        
        console.log(`📤 Sending broadcast to ${recipient.phone}: ${broadcast.message.substring(0, 50)}...`);
        
        // Simulate sending (replace with actual WhatsApp API call)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        broadcast.recipients[i].status = 'sent';
        broadcast.recipients[i].sentAt = new Date();
        broadcast.sentCount += 1;
      } catch (error) {
        broadcast.recipients[i].status = 'failed';
        broadcast.recipients[i].error = error.message;
        broadcast.failedCount += 1;
      }
      
      await broadcast.save();
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
