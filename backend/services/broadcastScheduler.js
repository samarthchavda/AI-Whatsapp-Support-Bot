const cron = require('node-cron');
const Broadcast = require('../models/Broadcast');
const { addBroadcastToQueue } = require('./broadcastQueue');

// Store scheduled tasks
const scheduledTasks = new Map();

// Helper to check and send reminders for abandoned carts
async function checkAbandonedCarts() {
  try {
    const AbandonedCart = require('../models/AbandonedCart');
    const webhookService = require('./webhookService');

    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Find carts that are:
    // 1. status: 'abandoned'
    // 2. abandonedAt is between 24 hours ago and 30 minutes ago
    const abandonedCarts = await AbandonedCart.find({
      status: 'abandoned',
      abandonedAt: { $gte: twentyFourHoursAgo, $lte: thirtyMinutesAgo }
    });

    if (abandonedCarts.length > 0) {
      console.log(`⏰ Found ${abandonedCarts.length} abandoned carts to send reminders.`);
    }

    for (const cart of abandonedCarts) {
      try {
        console.log(`📱 Sending cart recovery reminder to ${cart.customerPhone} for cart ${cart.cartId}`);
        const result = await webhookService.sendCartRecoveryMessage(cart);
        
        if (result.success) {
          cart.status = 'reminder_sent';
          cart.reminderSentAt = new Date();
          await cart.save();
          console.log(`✅ Cart recovery reminder sent successfully for cart ${cart.cartId}`);
        } else {
          console.error(`❌ Failed to send cart recovery reminder for cart ${cart.cartId}:`, result.error);
        }
      } catch (err) {
        console.error(`Error processing cart recovery for cart ${cart.cartId}:`, err);
      }
    }
  } catch (error) {
    console.error('Error checking abandoned carts:', error);
  }
}

// Check for scheduled broadcasts every minute
const schedulerTask = cron.schedule('* * * * *', async () => {
  try {
    const now = new Date();
    
    // Find broadcasts scheduled for now or earlier that haven't been sent
    const broadcasts = await Broadcast.find({
      status: 'scheduled',
      scheduledFor: { $lte: now }
    });

    for (const broadcast of broadcasts) {
      console.log(`⏰ Starting scheduled broadcast: ${broadcast.title}`);
      
      try {
        await addBroadcastToQueue(broadcast._id);
      } catch (error) {
        console.error(`Error starting scheduled broadcast ${broadcast._id}:`, error);
        broadcast.status = 'failed';
        await broadcast.save();
      }
    }

    // Check for abandoned carts
    await checkAbandonedCarts();
  } catch (error) {
    console.error('Error in broadcast scheduler:', error);
  }
});

// Schedule a specific broadcast
function scheduleBroadcast(broadcastId, scheduledDate) {
  try {
    // Cancel existing task if any
    if (scheduledTasks.has(broadcastId)) {
      scheduledTasks.get(broadcastId).stop();
      scheduledTasks.delete(broadcastId);
    }

    const now = new Date();
    const scheduledTime = new Date(scheduledDate);

    // If scheduled time is in the past, don't schedule
    if (scheduledTime <= now) {
      console.log('Scheduled time is in the past, will be picked up by main scheduler');
      return;
    }

    // Calculate delay in milliseconds
    const delay = scheduledTime - now;

    // Use setTimeout for specific broadcast
    const timeout = setTimeout(async () => {
      try {
        console.log(`⏰ Executing scheduled broadcast: ${broadcastId}`);
        await addBroadcastToQueue(broadcastId);
        scheduledTasks.delete(broadcastId);
      } catch (error) {
        console.error(`Error executing scheduled broadcast ${broadcastId}:`, error);
      }
    }, delay);

    scheduledTasks.set(broadcastId, {
      stop: () => clearTimeout(timeout)
    });

    console.log(`📅 Broadcast ${broadcastId} scheduled for ${scheduledTime}`);
  } catch (error) {
    console.error('Error scheduling broadcast:', error);
  }
}

// Cancel a scheduled broadcast
function cancelScheduledBroadcast(broadcastId) {
  if (scheduledTasks.has(broadcastId)) {
    scheduledTasks.get(broadcastId).stop();
    scheduledTasks.delete(broadcastId);
    console.log(`❌ Cancelled scheduled broadcast: ${broadcastId}`);
    return true;
  }
  return false;
}

// Initialize scheduler on startup
async function initializeScheduler() {
  try {
    console.log('🕐 Initializing broadcast scheduler...');
    
    // Load all scheduled broadcasts
    const scheduledBroadcasts = await Broadcast.find({
      status: 'scheduled',
      scheduledFor: { $gt: new Date() }
    });

    for (const broadcast of scheduledBroadcasts) {
      scheduleBroadcast(broadcast._id, broadcast.scheduledFor);
    }

    console.log(`✅ Loaded ${scheduledBroadcasts.length} scheduled broadcasts`);
  } catch (error) {
    console.error('Error initializing scheduler:', error);
  }
}

// Start the scheduler
function startScheduler() {
  schedulerTask.start();
  console.log('✅ Broadcast scheduler started');
}

// Stop the scheduler
function stopScheduler() {
  schedulerTask.stop();
  
  // Cancel all scheduled tasks
  for (const [broadcastId, task] of scheduledTasks) {
    task.stop();
  }
  scheduledTasks.clear();
  
  console.log('⏹️  Broadcast scheduler stopped');
}

module.exports = {
  initializeScheduler,
  startScheduler,
  stopScheduler,
  scheduleBroadcast,
  cancelScheduledBroadcast
};
