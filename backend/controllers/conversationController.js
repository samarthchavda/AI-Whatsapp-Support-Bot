const Conversation = require('../models/Conversation');
const Escalation = require('../models/Escalation');

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

    const conversations = await Conversation.find(query)
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Conversation.countDocuments(query);

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
    const { status, satisfaction } = req.body;

    const conversation = await Conversation.findById(req.params.id);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (status) {
      conversation.status = status;
      if (status === 'resolved' || status === 'closed') {
        conversation.resolvedAt = new Date();
      }
    }
    
    if (satisfaction) {
      conversation.satisfaction = satisfaction;
    }

    await conversation.save();

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

    // Add admin message to conversation
    conversation.messages.push({
      role: 'system', // Admin messages are 'system' role
      content: message,
      timestamp: new Date()
    });

    conversation.lastMessageAt = new Date();
    await conversation.save();

    // TODO: Send message via WhatsApp Cloud API
    // For now, we'll just save it to the database
    // In production, you would integrate with WhatsApp Cloud API here
    
    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('new_message', {
        customerPhone,
        role: 'system',
        content: message,
        timestamp: new Date()
      });
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
