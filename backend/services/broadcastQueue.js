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

    const Template = require('../models/Template');
    let matchedTemplate = null;

    if (broadcast.templateName) {
      matchedTemplate = await Template.findOne({ adminId: broadcast.admin, name: broadcast.templateName });
      if (!matchedTemplate) {
        matchedTemplate = await Template.findOne({ name: broadcast.templateName });
      }
      if (matchedTemplate) {
        broadcast.templateLanguage = matchedTemplate.language || broadcast.templateLanguage || 'en_US';
        await broadcast.save().catch(() => {});
      }
    } else {
      // Auto-detect templateName if not explicitly set
      try {
        const approvedTemplates = await Template.find({ adminId: broadcast.admin, status: 'APPROVED' });
        const getKeywords = (txt) => (txt || '').toLowerCase().replace(/\{\{[^}]+\}\}/g, ' ').replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 3);
        const msgWords = new Set(getKeywords(broadcast.message));
        let maxScore = 0;

        for (const tpl of approvedTemplates) {
          const bodyComp = (tpl.components || []).find(c => c.type === 'BODY');
          if (bodyComp && bodyComp.text) {
            const tplWords = getKeywords(bodyComp.text);
            let score = 0;
            for (const w of tplWords) {
              if (msgWords.has(w)) score++;
            }
            if (score >= 3 && score > maxScore) {
              maxScore = score;
              matchedTemplate = tpl;
            }
          }
        }

        if (!matchedTemplate && approvedTemplates.length === 1) {
          matchedTemplate = approvedTemplates[0];
        }

        if (matchedTemplate) {
          broadcast.templateName = matchedTemplate.name;
          broadcast.templateLanguage = matchedTemplate.language || 'en_US';
          await broadcast.save().catch(() => {});
          console.log(`✨ Using Meta template "${matchedTemplate.name}" (${broadcast.templateLanguage}) for broadcast ${broadcast._id}`);
        }
      } catch (detectErr) {
        console.error('Template auto-detection error:', detectErr.message);
      }
    }

    // Inspect template to know exact number of variables expected in body
    let expectedParamCount = 0;
    if (matchedTemplate && Array.isArray(matchedTemplate.components)) {
      const bodyComp = matchedTemplate.components.find(c => c.type === 'BODY');
      if (bodyComp && bodyComp.text) {
        const varMatches = bodyComp.text.match(/\{\{\d+\}\}/g) || [];
        expectedParamCount = varMatches.length;
      }
    } else if (broadcast.templateName) {
      const hasPlaceholders = /\{\{(\d+|name)\}\}/i.test(broadcast.message || '');
      expectedParamCount = hasPlaceholders ? 1 : 0;
    }

    // Send messages sequentially
    for (let i = 0; i < broadcast.recipients.length; i++) {
      const recipient = broadcast.recipients[i];

      // Skip already sent recipients (prevents double-counting or re-sending during retries)
      if (recipient.status === 'sent') {
        continue;
      }

      // Normalize recipient phone number
      let targetPhone = (recipient.phone || '').toString().trim().replace(/\D/g, '');
      if (targetPhone.length === 11 && targetPhone.startsWith('0')) {
        targetPhone = targetPhone.substring(1);
      }
      if (targetPhone.length === 10 && /^[6-9]/.test(targetPhone)) {
        targetPhone = '91' + targetPhone;
      }

      try {
        let sendResult;

        if (broadcast.templateName) {
          let params = [];
          if (expectedParamCount > 0) {
            params.push(recipient.name || 'there');
            if (expectedParamCount > 1 && Array.isArray(broadcast.templateParams)) {
              for (let pIdx = 0; pIdx < expectedParamCount - 1; pIdx++) {
                params.push(broadcast.templateParams[pIdx] || '');
              }
            }
          }

          console.log(`📤 Sending WhatsApp TEMPLATE [${broadcast.templateName}] (${broadcast.templateLanguage || 'en_US'}) with ${params.length} params to ${targetPhone}...`);
          sendResult = await whatsappCloudAPI.sendTemplateMessage(
            targetPhone,
            broadcast.templateName,
            broadcast.templateLanguage || 'en_US',
            params,
            customCredentials,
            broadcast.headerImageUrl
          );
        } else {
          const personalizedMessage = broadcast.message.replace(/{{name}}/gi, recipient.name || 'there');
          console.log(`📤 Sending actual WhatsApp text broadcast to ${targetPhone}: ${personalizedMessage.substring(0, 50)}...`);
          sendResult = await whatsappCloudAPI.sendMessage(targetPhone, personalizedMessage, customCredentials);
        }

        if (sendResult && sendResult.success) {
          broadcast.recipients[i].status = 'sent';
          broadcast.recipients[i].sentAt = new Date();
          if (sendResult.messageId) {
            broadcast.recipients[i].messageId = sendResult.messageId;
          }

          // Sync broadcast dispatch to Live Chat & Conversations
          try {
            const Conversation = require('../models/Conversation');
            let conv = await Conversation.findOne({ admin: broadcast.admin, customerPhone: recipient.phone });
            const messageBody = broadcast.message.replace(/{{name}}/gi, recipient.name || 'there');
            const msgObj = {
              role: 'assistant',
              content: messageBody,
              timestamp: new Date(),
              status: 'sent',
              messageId: sendResult.messageId || null
            };
            if (conv) {
              conv.messages.push(msgObj);
              conv.lastMessage = messageBody;
              conv.lastMessageAt = new Date();
              conv.updatedAt = new Date();
              await conv.save();
            } else {
              conv = new Conversation({
                admin: broadcast.admin,
                customerPhone: recipient.phone,
                customerName: recipient.name || 'Customer',
                messages: [msgObj],
                lastMessage: messageBody,
                lastMessageAt: new Date(),
                status: 'active'
              });
              await conv.save();
            }
          } catch (convErr) {
            console.error('Error syncing broadcast to Conversation:', convErr.message);
          }

          await Admin.findByIdAndUpdate(broadcast.admin, { $inc: { broadcastMessagesUsed: 1 } }).catch(err => console.error('Error incrementing broadcastMessagesUsed:', err.message));
        } else {
          throw new Error(sendResult ? (sendResult.error || 'Failed to send via Cloud API') : 'Failed to send via Cloud API');
        }
      } catch (error) {
        console.error(`❌ Failed to send broadcast to ${broadcast.recipients[i].phone}:`, error.message);
        broadcast.recipients[i].status = 'failed';
        broadcast.recipients[i].error = error.message;
      }
      
      broadcast.sentCount = broadcast.recipients.filter(r => r.status === 'sent' || r.status === 'delivered' || r.status === 'read').length;
      broadcast.failedCount = broadcast.recipients.filter(r => r.status === 'failed').length;
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
