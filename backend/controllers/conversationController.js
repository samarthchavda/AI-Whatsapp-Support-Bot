const Conversation = require('../models/Conversation');
const Escalation = require('../models/Escalation');

// Get all conversations
exports.getAllConversations = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, escalated } = req.query;
    
    let query = {};
    
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
    const total = await Conversation.countDocuments();
    const active = await Conversation.countDocuments({ status: 'active' });
    const escalated = await Conversation.countDocuments({ escalated: true });
    const resolved = await Conversation.countDocuments({ status: 'resolved' });
    
    // Average satisfaction
    const satisfactionAgg = await Conversation.aggregate([
      { $match: { satisfaction: { $exists: true, $ne: null } } },
      { $group: { _id: null, avgSatisfaction: { $avg: '$satisfaction' } } }
    ]);
    
    const avgSatisfaction = satisfactionAgg.length > 0 
      ? satisfactionAgg[0].avgSatisfaction.toFixed(2) 
      : null;

    // Intent distribution
    const intentDistribution = await Conversation.aggregate([
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
