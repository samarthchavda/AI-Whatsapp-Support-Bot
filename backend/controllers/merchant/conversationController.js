const Conversation = require('../../models/Conversation');
const Escalation = require('../../models/Escalation');

// Get all conversations
exports.getAllConversations = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, escalated } = req.query;
    
    let query = { admin: req.admin._id }; // Filter by logged-in admin
    
    if (status) {
      query.status = status;
    }
    
    if (escalated !== undefined) {
      query.escalated = escalated === 'true';
    }

    const [conversations, count] = await Promise.all([
      Conversation.find(query)
        .sort({ updatedAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean()
        .exec(),
      Conversation.countDocuments(query)
    ]);

    res.json({
      conversations,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get conversation by ID
exports.getConversationById = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get conversations by customer phone
exports.getConversationsByPhone = async (req, res) => {
  try {
    const conversations = await Conversation.find({ 
      admin: req.admin._id, // Filter by logged-in admin
      customerPhone: req.params.phone 
    }).sort({ createdAt: -1 });

    res.json({ conversations, count: conversations.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update conversation status
exports.updateConversationStatus = async (req, res) => {
  try {
    const { status, satisfaction, botPaused, suggestedReply } = req.body;

    const conversation = await Conversation.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (status) {
      conversation.status = status;
      if (status === 'resolved' || status === 'closed') {
        conversation.resolvedAt = new Date();
        conversation.botPaused = false;
        conversation.escalated = false;
        conversation.suggestedReply = null;
      }
    }
    
    if (satisfaction) {
      conversation.satisfaction = satisfaction;
    }

    if (botPaused !== undefined) {
      conversation.botPaused = botPaused;
      if (!botPaused && conversation.status === 'escalated') {
        conversation.status = 'active';
        conversation.escalated = false;
      }
    }

    if (suggestedReply !== undefined) {
      conversation.suggestedReply = suggestedReply;
    }

    await conversation.save();

    // Emit socket event for real-time update
    const io = req.app.get('io') || global.io;
    if (io) {
      io.emit('new_message', {
        customerPhone: conversation.customerPhone,
        status: conversation.status,
        botPaused: conversation.botPaused
      });
      io.emit('conversation_updated', conversation);
    }

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get conversation statistics
exports.getConversationStats = async (req, res) => {
  try {
    const adminFilter = { admin: req.admin._id };
    
    const total = await Conversation.countDocuments(adminFilter);
    const active = await Conversation.countDocuments({ ...adminFilter, status: 'active' });
    const escalated = await Conversation.countDocuments({ ...adminFilter, escalated: true });
    const resolved = await Conversation.countDocuments({ ...adminFilter, status: 'resolved' });
    
    // Average satisfaction
    const satisfactionAgg = await Conversation.aggregate([
      { $match: { ...adminFilter, satisfaction: { $exists: true, $ne: null } } },
      { $group: { _id: null, avgSatisfaction: { $avg: '$satisfaction' } } }
    ]);
    
    const avgSatisfaction = satisfactionAgg.length > 0 
      ? satisfactionAgg[0].avgSatisfaction.toFixed(2) 
      : null;

    // Intent distribution
    const intentDistribution = await Conversation.aggregate([
      { $match: adminFilter },
      { $unwind: '$messages' },
      { $match: { 'messages.role': 'user' } },
      { $group: { _id: '$messages.intent', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      total,
      active,
      escalated,
      resolved,
      avgSatisfaction,
      intentDistribution
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Send admin message to customer
exports.sendAdminMessage = async (req, res) => {
  try {
    const { customerPhone, message } = req.body;

    if (!customerPhone || !message) {
      return res.status(400).json({
        success: false,
        error: 'Customer phone and message are required'
      });
    }

    // Find conversation for this admin
    let conversation = await Conversation.findOne({ 
      admin: req.admin._id,
      customerPhone 
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // Automatically pause the bot as the admin has taken over
    conversation.botPaused = true;
    
    // Clear suggested draft message
    conversation.suggestedReply = null;
    
    // Retrieve customer's language preference
    let targetLanguage = 'English';
    if (conversation.messages && conversation.messages.length > 0) {
      for (let i = conversation.messages.length - 1; i >= 0; i--) {
        if (conversation.messages[i].role === 'user' && conversation.messages[i].detectedLanguage) {
          targetLanguage = conversation.messages[i].detectedLanguage;
          break;
        }
      }
    }

    // Translate agent message to customer's target language if targetLanguage is foreign
    let messageToSend = message;
    let translation = null;
    const isForeignLanguage = targetLanguage && 
                              targetLanguage.toLowerCase() !== 'english' && 
                              targetLanguage.toLowerCase() !== 'gujarati';

    if (isForeignLanguage) {
      try {
        const translationService = require('../../services/translationService');
        translation = await translationService.translateText(message, targetLanguage);
        messageToSend = translation; // We send the translated text to the customer!
        console.log(`🌐 Translated agent message from English/Gujarati to ${targetLanguage}: "${translation}"`);
      } catch (err) {
        console.error('Failed to translate outgoing agent message:', err);
      }
    }

    // Add admin message to conversation
    conversation.messages.push({
      role: 'system', // Admin messages are 'system' role
      content: message,
      translation: isForeignLanguage ? translation : null,
      detectedLanguage: targetLanguage,
      timestamp: new Date()
    });

    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Send message via WhatsApp Web Bot or WhatsApp Cloud API
    let sentSuccess = false;
    let errorMsg = null;

    try {
      const whatsappWebBot = require('../../services/whatsappWebBot');
      if (whatsappWebBot && whatsappWebBot.isReady) {
        console.log(`Sending manual message via WhatsApp Web Bot to ${customerPhone}`);
        const webResult = await whatsappWebBot.sendMessage(customerPhone, messageToSend);
        if (webResult.success) {
          sentSuccess = true;
        } else {
          errorMsg = webResult.error;
        }
      }
    } catch (e) {
      console.log('WhatsApp Web Bot not available for sending admin message:', e.message);
    }

    if (!sentSuccess) {
      try {
        const whatsappCloudAPI = require('../../services/whatsappCloudAPI');
        const Admin = require('../../models/Admin');
        const adminDoc = await Admin.findById(req.admin._id);
        
        let customCredentials = null;
        if (adminDoc && adminDoc.whatsappAccessToken && adminDoc.whatsappPhoneNumberId) {
          customCredentials = {
            accessToken: adminDoc.whatsappAccessToken,
            phoneNumberId: adminDoc.whatsappPhoneNumberId,
            businessAccountId: adminDoc.whatsappBusinessAccountId
          };
        }

        console.log(`Sending manual message via WhatsApp Cloud API to ${customerPhone}`);
        const cloudResult = await whatsappCloudAPI.sendMessage(customerPhone, messageToSend, customCredentials);
        if (cloudResult.success) {
          sentSuccess = true;
        } else {
          errorMsg = typeof cloudResult.error === 'object' ? JSON.stringify(cloudResult.error) : (cloudResult.error || 'Failed to send via Cloud API');
        }
      } catch (e) {
        console.log('WhatsApp Cloud API not available for sending admin message:', e.message);
      }
    }

    if (!sentSuccess) {
      console.log(`⚠️ Manual message simulated (not sent to actual WhatsApp): "${messageToSend}". Reason: ${errorMsg || 'No active clients'}`);
    }
    
    // Emit socket event for real-time update
    const io = req.app.get('io') || global.io;
    if (io) {
      io.emit('new_message', {
        customerPhone,
        role: 'system',
        content: message,
        translation: isForeignLanguage ? translation : null,
        detectedLanguage: targetLanguage,
        timestamp: new Date(),
        botPaused: conversation.botPaused
      });
      io.emit('conversation_updated', conversation);
    }

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: conversation
    });
  } catch (error) {
    console.error('Error sending admin message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message',
      message: error.message
    });
  }
};

// Get single conversation by phone
exports.getConversationByPhone = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ 
      admin: req.admin._id, // Filter by logged-in admin
      customerPhone: req.params.phone 
    });

    if (!conversation) {
      return res.status(404).json({ 
        success: false,
        error: 'Conversation not found' 
      });
    }

    res.json({
      success: true,
      conversation
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};
