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

// Pruning Job
async function runConversationPruning() {
  try {
    const Conversation = require('../models/Conversation');
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    
    const result = await Conversation.deleteMany({
      hasProductInquiry: { $ne: true },
      updatedAt: { $lt: fourteenDaysAgo }
    });
    
    if (result.deletedCount > 0) {
      console.log(`🧹 Daily Pruning: Deleted ${result.deletedCount} general conversations older than 14 days.`);
    }
  } catch (error) {
    console.error('❌ Error in conversation pruning job:', error);
  }
}

// Retargeting Follow-up Job
async function runProductFollowUps() {
  try {
    const Conversation = require('../models/Conversation');
    const Admin = require('../models/Admin');
    const Order = require('../models/Order');
    const aiService = require('./aiService');
    const whatsappWebBot = require('./whatsappWebBot');
    const whatsappCloudAPI = require('./whatsappCloudAPI');

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const conversations = await Conversation.find({
      hasProductInquiry: true,
      followUpSent: { $ne: true },
      productInquiryAt: { $lte: sevenDaysAgo }
    });

    if (conversations.length > 0) {
      console.log(`⏰ Found ${conversations.length} conversations to send product follow-ups.`);
    }

    for (const conversation of conversations) {
      try {
        const adminDoc = await Admin.findById(conversation.admin);
        if (!adminDoc || !adminDoc.whatsappConnected) {
          console.log(`⚠️ Skip follow-up for phone ${conversation.customerPhone}: Admin not connected or not found.`);
          continue;
        }

        const knownProducts = await Order.distinct('items.productName', { admin: adminDoc._id });
        const relatedProducts = knownProducts.filter(p => p !== conversation.inquiredProductName);

        let followUpMessage = '';
        if (aiService.gemini) {
          const prompt = `Write a polite, warm, and highly personalized follow-up WhatsApp message from "${adminDoc.businessName || 'our store'}" to a customer named "${conversation.customerName}".
They asked about our product "${conversation.inquiredProductName}" 7 days ago.
Check if they have any remaining questions or if we can help them complete their purchase.
In addition, suggest 1 or 2 related products that might interest them from this list of store products: ${JSON.stringify(relatedProducts)}. Explain in one short, helpful sentence for each why they might like it.
Keep the entire message under 150 words. Format with clean spacing and standard WhatsApp emojis (e.g. *bolding* for headings). Do not use placeholders (like [Customer Name]) in the final text; output the final copy ready to send.`;

          try {
            const model = aiService.gemini.getGenerativeModel({ model: aiService.geminiModelName });
            const result = await model.generateContent(prompt);
            followUpMessage = result.response.text().trim();
          } catch (err) {
            console.error('Error generating follow-up copy via Gemini:', err);
          }
        }

        if (!followUpMessage) {
          followUpMessage = `Hi ${conversation.customerName}! 👋

Just wanted to check in regarding your question about our product *${conversation.inquiredProductName}* a few days ago. We're here to help if you need anything else!

Also, you might want to check out these related items:
${relatedProducts.slice(0, 2).map(p => `• *${p}*`).join('\n')}

Have a great day!`;
        }

        let sentResult = { success: false, error: 'Channel offline' };
        if (adminDoc.webBotEnabled && whatsappWebBot.isReady) {
          sentResult = await whatsappWebBot.sendMessage(conversation.customerPhone, followUpMessage);
        } else {
          const customCredentials = {
            accessToken: adminDoc.whatsappAccessToken,
            phoneNumberId: adminDoc.whatsappPhoneNumberId,
            businessAccountId: adminDoc.whatsappBusinessAccountId
          };
          sentResult = await whatsappCloudAPI.sendMessage(conversation.customerPhone, followUpMessage, customCredentials);
        }

        if (sentResult.success) {
          conversation.followUpSent = true;
          conversation.followUpSentAt = new Date();
          
          conversation.messages.push({
            role: 'assistant',
            content: followUpMessage,
            timestamp: new Date(),
            intent: 'general_inquiry'
          });
          
          await conversation.save();
          console.log(`✅ Follow-up message sent successfully to ${conversation.customerPhone}`);

          const { logAction } = require('./auditLogService');
          await logAction({
            action: 'product_followup_sent',
            actor: adminDoc,
            target: conversation.customerPhone,
            details: {
              customerName: conversation.customerName,
              inquiredProduct: conversation.inquiredProductName
            }
          });

          if (global.io) {
            global.io.emit('new_message', {
              customerPhone: conversation.customerPhone,
              role: 'assistant',
              content: followUpMessage,
              timestamp: new Date(),
              intent: 'general_inquiry'
            });
          }
        } else {
          console.error(`❌ Failed to send follow-up message to ${conversation.customerPhone}:`, sentResult.error);
        }
      } catch (convErr) {
        console.error(`Error processing follow-up for conversation ${conversation._id}:`, convErr);
      }
    }
  } catch (error) {
    console.error('❌ Error in runProductFollowUps job:', error);
  }
}

// Daily Super Admin Task scheduled for 1:00 AM daily
const dailySuperAdminTask = cron.schedule('0 1 * * *', async () => {
  console.log('⏰ Running daily Super Admin conversation pruning and retargeting follow-up...');
  await runConversationPruning();
  await runProductFollowUps();
});

// Start the scheduler
function startScheduler() {
  schedulerTask.start();
  dailySuperAdminTask.start();
  console.log('✅ Broadcast scheduler started');
}

// Stop the scheduler
function stopScheduler() {
  schedulerTask.stop();
  dailySuperAdminTask.stop();
  
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
  cancelScheduledBroadcast,
  runConversationPruning,
  runProductFollowUps
};
