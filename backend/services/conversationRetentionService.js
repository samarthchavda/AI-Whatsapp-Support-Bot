const Conversation = require('../models/Conversation');

const CHAT_RETENTION_HOURS = 24;
const CHAT_RETENTION_MS = CHAT_RETENTION_HOURS * 60 * 60 * 1000;

const getRetentionCutoff = (now = new Date()) => new Date(now.getTime() - CHAT_RETENTION_MS);

/**
 * Deletes complete Kwickbot conversation records after 24 hours without activity.
 * This only removes our MongoDB data; it cannot and does not delete WhatsApp messages
 * from the customer's or merchant's WhatsApp application.
 */
const purgeExpiredConversations = async (now = new Date()) => {
  const cutoff = getRetentionCutoff(now);
  const result = await Conversation.deleteMany({ updatedAt: { $lt: cutoff } });

  if (result.deletedCount > 0) {
    console.log(`🧹 Live chat retention removed ${result.deletedCount} conversation(s) inactive for more than ${CHAT_RETENTION_HOURS} hours`);
  }

  return result;
};

const startConversationRetentionScheduler = (cron) => {
  // Run once at startup so existing expired records do not remain visible,
  // then hourly. deleteMany is safe if more than one app instance runs it.
  purgeExpiredConversations().catch((error) => {
    console.error('❌ Initial live chat retention cleanup failed:', error.message);
  });

  cron.schedule('10 * * * *', () => {
    purgeExpiredConversations().catch((error) => {
      console.error('❌ Scheduled live chat retention cleanup failed:', error.message);
    });
  });
};

module.exports = { CHAT_RETENTION_HOURS, getRetentionCutoff, purgeExpiredConversations, startConversationRetentionScheduler };
