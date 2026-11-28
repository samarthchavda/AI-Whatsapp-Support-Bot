const Conversation = require('../../models/Conversation');
const Escalation = require('../../models/Escalation');
const axios = require('axios');
const { getReceivingWhatsappCredentials } = require('../../services/whatsappConnectionLimit');
const whatsappCloudAPI = require('../../services/whatsappCloudAPI');

const mediaKind = (mime = '') => {
  if (/^image\/(jpeg|png|webp)$/.test(mime)) return 'image';
  if (/^video\/mp4$/.test(mime)) return 'video';
  if (/^audio\/(ogg|mpeg|mp4|amr|aac)(;|$)/.test(mime)) return 'audio';
  if (['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'].includes(mime)) return 'document';
  return null;
};

exports.sendAdminMedia = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, admin: req.admin._id });
    if (!conversation) return res.status(404).json({ success: false, error: 'Conversation not found.' });
    if (!req.file) return res.status(400).json({ success: false, error: 'Choose a media file.' });
    const type = mediaKind(req.file.mimetype);
    if (!type) return res.status(400).json({ success: false, error: 'Use a JPG, PNG, WebP, MP4, supported audio, PDF, Word, or Excel file.' });
    const credentials = getReceivingWhatsappCredentials(req.admin, conversation.channelPhoneNumberId || req.admin.whatsappPhoneNumberId);
    if (!credentials?.accessToken) return res.status(400).json({ success: false, error: 'The WhatsApp number for this chat is disconnected.' });
    const caption = String(req.body.caption || '').trim().slice(0, 1024);
    const sent = await whatsappCloudAPI.sendMedia(conversation.customerPhone, req.file, type, credentials, caption);
    if (!sent.success) return res.status(502).json({ success: false, error: sent.error || 'WhatsApp could not send the attachment.' });
    conversation.botPaused = true;
    conversation.suggestedReply = null;
    conversation.messages.push({ role: 'system', content: caption || req.file.originalname, messageId: sent.messageId,
      media: { id: sent.mediaId, type, mimeType: req.file.mimetype, filename: req.file.originalname, caption }, timestamp: new Date() });
    conversation.lastMessageAt = new Date();
    await conversation.save();
    const io = req.app.get('io') || global.io;
    if (io) io.to(`merchant:${req.admin._id}`).emit('conversation_updated', conversation);
    res.json({ success: true, data: conversation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message || 'Failed to send media.' });
  }
};

exports.getMessageMedia = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({ _id: req.params.id, admin: req.admin._id });
    const message = conversation?.messages.find(item => String(item._id) === req.params.messageId);
    if (!message?.media?.id) return res.status(404).json({ success: false, error: 'Attachment not found.' });
    const credentials = getReceivingWhatsappCredentials(req.admin, conversation.channelPhoneNumberId || req.admin.whatsappPhoneNumberId);
    if (!credentials?.accessToken) return res.status(403).json({ success: false, error: 'WhatsApp number disconnected.' });
    const info = await whatsappCloudAPI.getMedia(message.media.id, credentials);
    if (!info?.url) return res.status(404).json({ success: false, error: 'Media expired or unavailable.' });
    let source = new URL(info.url);
    const allowedSource = (url) => url.protocol === 'https:' && /(^|\.)(facebook\.com|fbcdn\.net|fbsbx\.com)$/.test(url.hostname);
    if (!allowedSource(source)) return res.status(502).json({ success: false, error: 'Invalid media source.' });
    let download;
    for (let redirect = 0; redirect < 3; redirect += 1) {
      download = await axios.get(source.toString(), { headers: { Authorization: `Bearer ${credentials.accessToken}` }, responseType: 'stream', timeout: 15000, maxRedirects: 0, validateStatus: status => status >= 200 && status < 400 });
      if (download.status < 300) break;
      download.data.destroy();
      if (!download.headers.location) return res.status(502).json({ success: false, error: 'Media redirect failed.' });
      source = new URL(download.headers.location, source);
      if (!allowedSource(source)) return res.status(502).json({ success: false, error: 'Invalid media redirect.' });
    }
    if (download.status >= 300) return res.status(502).json({ success: false, error: 'Too many media redirects.' });
    res.set('Content-Type', info.mime_type || message.media.mimeType || 'application/octet-stream');
    res.set('Cache-Control', 'private, no-store');
    res.set('Content-Disposition', `${message.media.type === 'document' ? 'attachment' : 'inline'}; filename="attachment"`);
    download.data.pipe(res);
  } catch (error) {
    if (!res.headersSent) res.status(502).json({ success: false, error: 'Unable to load attachment.' });
  }
};

// Get all conversations
exports.getAllConversations = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, escalated } = req.query;
    
    let query = {
      admin: req.admin._id, // Filter by logged-in admin
      'messages.0': { $exists: true } // Only show conversations with actual chat history, not synced phonebook contacts
    };
    
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
    const conversation = await Conversation.findOne({ _id: req.params.id, admin: req.admin._id });
    
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
    const rawPhone = (req.params.phone || '').replace(/[^0-9]/g, '');
    const cleanPhone = rawPhone.length === 10 ? '91' + rawPhone : rawPhone;

    let query = {
      $or: [
        { customerPhone: req.params.phone },
        { customerPhone: `+${cleanPhone}` },
        { customerPhone: cleanPhone },
        { customerPhone: new RegExp((rawPhone.slice(-10) || '___') + '$') }
      ]
    };

    if (req.admin && req.admin.role !== 'super_admin') {
      query.admin = req.admin._id;
    }

    const conversation = await Conversation.findOne(query).sort({ updatedAt: -1 });

    if (!conversation) {
      return res.json({ success: true, conversation: null, messages: [] });
    }

    res.json({
      success: true,
      conversation,
      messages: conversation.messages || []
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update conversation status
exports.updateConversationStatus = async (req, res) => {
  try {
    const { status, satisfaction, botPaused, suggestedReply } = req.body;

    const conversation = await Conversation.findOne({ _id: req.params.id, admin: req.admin._id });
    
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
      const adminId = req.admin?._id?.toString() || conversation.admin?.toString();
      const target = adminId ? io.to(`merchant:${adminId}`).to('super_admin_room') : io.to('super_admin_room');
      target.emit('new_message', {
        customerPhone: conversation.customerPhone,
        status: conversation.status,
        botPaused: conversation.botPaused
      });
      target.emit('conversation_updated', conversation);
    }

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get conversation statistics
exports.getConversationStats = async (req, res) => {
  try {
    const adminFilter = {
      admin: req.admin._id,
      'messages.0': { $exists: true }
    };
    
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
    const { customerPhone, message, conversationId } = req.body;

    if (!customerPhone || !message) {
      return res.status(400).json({
        success: false,
        error: 'Customer phone and message are required'
      });
    }

    // Find conversation for this admin
    let conversation = await Conversation.findOne({
      ...(conversationId ? { _id: conversationId } : {}),
      admin: req.admin._id,
      customerPhone 
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

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

    if (isForeignLanguage && !/^[\p{Extended_Pictographic}\p{Emoji_Component}\s]+$/u.test(message)) {
      try {
        const translationService = require('../../services/translationService');
        translation = await translationService.translateText(message, targetLanguage);
        messageToSend = translation; // We send the translated text to the customer!
        console.log(`🌐 Translated agent message from English/Gujarati to ${targetLanguage}: "${translation}"`);
      } catch (err) {
        console.error('Failed to translate outgoing agent message:', err);
      }
    }

    const { getReceivingWhatsappCredentials } = require('../../services/whatsappConnectionLimit');
    const whatsappCloudAPI = require('../../services/whatsappCloudAPI');
    const phoneNumberId = conversation.channelPhoneNumberId || req.admin.whatsappPhoneNumberId;
    const credentials = getReceivingWhatsappCredentials(req.admin, phoneNumberId);
    if (!credentials?.accessToken) return res.status(400).json({ success: false, error: 'The WhatsApp number for this chat is disconnected.' });
    const sent = await whatsappCloudAPI.sendMessage(customerPhone, messageToSend, credentials);
    if (!sent.success) return res.status(502).json({ success: false, error: sent.error || 'WhatsApp could not send the reply.' });

    conversation.botPaused = true;
    conversation.suggestedReply = null;
    conversation.messages.push({ role: 'system', content: message, translation: translation || null,
      detectedLanguage: targetLanguage, messageId: sent.messageId, timestamp: new Date() });
    conversation.lastMessageAt = new Date();
    await conversation.save();
    
    // Emit socket event for real-time update
    const io = req.app.get('io') || global.io;
    if (io) {
      const adminId = req.admin?._id?.toString() || conversation.admin?.toString();
      const target = adminId ? io.to(`merchant:${adminId}`).to('super_admin_room') : io.to('super_admin_room');
      target.emit('new_message', {
        customerPhone,
        conversationId: conversation._id,
        role: 'system',
        content: message,
        translation: isForeignLanguage ? translation : null,
        detectedLanguage: targetLanguage,
        timestamp: new Date(),
        botPaused: conversation.botPaused
      });
      target.emit('conversation_updated', conversation);
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
