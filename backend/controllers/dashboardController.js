const Escalation = require('../models/Escalation');
const Conversation = require('../models/Conversation');
const Order = require('../models/Order');
const Announcement = require('../models/Announcement');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const adminQuery = { admin: req.admin._id };
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalOrders,
      pendingOrders,
      shippedOrders,
      deliveredOrders,
      totalConversations,
      activeConversations,
      escalatedConversations,
      resolvedConversations,
      totalEscalations,
      pendingEscalations,
      urgentEscalations,
      recentConversations,
      recentEscalations,
      intentDistribution,
      satisfactionAgg
    ] = await Promise.all([
      Order.countDocuments(adminQuery),
      Order.countDocuments({ ...adminQuery, status: 'pending' }),
      Order.countDocuments({ ...adminQuery, status: 'shipped' }),
      Order.countDocuments({ ...adminQuery, status: 'delivered' }),
      Conversation.countDocuments(adminQuery),
      Conversation.countDocuments({ ...adminQuery, status: 'active' }),
      Conversation.countDocuments({ ...adminQuery, escalated: true }),
      Conversation.countDocuments({ ...adminQuery, status: 'resolved' }),
      Escalation.countDocuments(adminQuery),
      Escalation.countDocuments({ ...adminQuery, status: 'pending' }),
      Escalation.countDocuments({ 
        ...adminQuery,
        status: { $in: ['pending', 'in_progress'] }, 
        priority: 'urgent' 
      }),
      Conversation.find(adminQuery)
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('customerName customerPhone status updatedAt escalated')
        .lean(),
      Escalation.find(adminQuery)
        .sort({ createdAt: -1 })
        .limit(5)
        .select('customerName reason priority status createdAt')
        .lean(),
      Conversation.aggregate([
        { $match: { admin: req.admin._id, createdAt: { $gte: thirtyDaysAgo } } },
        { $unwind: '$messages' },
        { $match: { 'messages.role': 'user' } },
        { $group: { _id: '$messages.intent', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Conversation.aggregate([
        { $match: { admin: req.admin._id, satisfaction: { $exists: true, $ne: null } } },
        { $group: { _id: null, avgSatisfaction: { $avg: '$satisfaction' } } }
      ])
    ]);

    const avgSatisfaction = satisfactionAgg.length > 0 
      ? parseFloat(satisfactionAgg[0].avgSatisfaction.toFixed(2))
      : null;

    res.json({
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders
      },
      conversations: {
        total: totalConversations,
        active: activeConversations,
        escalated: escalatedConversations,
        resolved: resolvedConversations,
        avgSatisfaction
      },
      escalations: {
        total: totalEscalations,
        pending: pendingEscalations,
        urgent: urgentEscalations
      },
      recentConversations,
      recentEscalations,
      intentDistribution
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get escalations
exports.getEscalations = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priority } = req.query;
    
    let query = { admin: req.admin._id };
    
    if (status) {
      query.status = status;
    }
    
    if (priority) {
      query.priority = priority;
    }

    const [escalations, count] = await Promise.all([
      Escalation.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('conversationId', 'messages')
        .lean()
        .exec(),
      Escalation.countDocuments(query)
    ]);

    res.json({
      escalations,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update escalation
exports.updateEscalation = async (req, res) => {
  try {
    const { status, assignedTo, resolution } = req.body;

    const escalation = await Escalation.findOne({
      _id: req.params.id,
      admin: req.admin._id
    });
    
    if (!escalation) {
      return res.status(404).json({ error: 'Escalation not found' });
    }

    if (status) {
      escalation.status = status;
      if (status === 'resolved' || status === 'closed') {
        escalation.resolvedAt = new Date();
        
        // Find and update corresponding Conversation
        const conversation = await Conversation.findById(escalation.conversationId);
        if (conversation) {
          conversation.status = status; // e.g., 'resolved' or 'closed'
          conversation.escalated = false;
          conversation.botPaused = false;
          conversation.resolvedAt = new Date();
          await conversation.save();

          // Emit Socket.IO event so live chat / dashboard update in real-time
          const io = req.app.get('io') || global.io;
          if (io) {
            io.emit('new_message', {
              customerPhone: conversation.customerPhone,
              status: conversation.status,
              botPaused: conversation.botPaused
            });
            io.emit('conversation_updated', conversation);
          }
        }
      } else if (status === 'pending' || status === 'in_progress') {
        // If escalation is reopened, pause the bot and mark as escalated
        const conversation = await Conversation.findById(escalation.conversationId);
        if (conversation) {
          conversation.status = 'escalated';
          conversation.escalated = true;
          conversation.botPaused = true;
          await conversation.save();

          const io = req.app.get('io') || global.io;
          if (io) {
            io.emit('new_message', {
              customerPhone: conversation.customerPhone,
              status: conversation.status,
              botPaused: conversation.botPaused
            });
            io.emit('conversation_updated', conversation);
          }
        }
      }
    }
    
    if (assignedTo) {
      escalation.assignedTo = assignedTo;
    }
    
    if (resolution) {
      escalation.resolution = resolution;
    }

    await escalation.save();

    res.json(escalation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get active announcements for merchant dashboard
exports.getActiveAnnouncements = async (req, res) => {
  try {
    const now = new Date();
    // Find active announcements where expiration date is either null or in the future
    const announcements = await Announcement.find({
      isActive: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: now } }
      ]
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: announcements
    });
  } catch (error) {
    console.error('Error fetching active announcements:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch active announcements', message: error.message });
  }
};
