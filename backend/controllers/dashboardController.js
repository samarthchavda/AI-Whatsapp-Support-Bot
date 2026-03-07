const Escalation = require('../models/Escalation');
const Conversation = require('../models/Conversation');
const Order = require('../models/Order');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    // Order statistics
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const shippedOrders = await Order.countDocuments({ status: 'shipped' });
    const deliveredOrders = await Order.countDocuments({ status: 'delivered' });

    // Conversation statistics
    const totalConversations = await Conversation.countDocuments();
    const activeConversations = await Conversation.countDocuments({ status: 'active' });
    const escalatedConversations = await Conversation.countDocuments({ escalated: true });
    const resolvedConversations = await Conversation.countDocuments({ status: 'resolved' });

    // Escalation statistics
    const totalEscalations = await Escalation.countDocuments();
    const pendingEscalations = await Escalation.countDocuments({ status: 'pending' });
    const urgentEscalations = await Escalation.countDocuments({ 
      status: { $in: ['pending', 'in_progress'] }, 
      priority: 'urgent' 
    });

    // Recent conversations
    const recentConversations = await Conversation.find()
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('customerName customerPhone status updatedAt escalated');

    // Recent escalations
    const recentEscalations = await Escalation.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('customerName reason priority status createdAt');

    // Intent distribution (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const intentDistribution = await Conversation.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $unwind: '$messages' },
      { $match: { 'messages.role': 'user' } },
      { $group: { _id: '$messages.intent', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Average satisfaction score
    const satisfactionAgg = await Conversation.aggregate([
      { $match: { satisfaction: { $exists: true, $ne: null } } },
      { $group: { _id: null, avgSatisfaction: { $avg: '$satisfaction' } } }
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
    
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (priority) {
      query.priority = priority;
    }

    const escalations = await Escalation.find(query)
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('conversationId', 'messages')
      .exec();

    const count = await Escalation.countDocuments(query);

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

    const escalation = await Escalation.findById(req.params.id);
    
    if (!escalation) {
      return res.status(404).json({ error: 'Escalation not found' });
    }

    if (status) {
      escalation.status = status;
      if (status === 'resolved' || status === 'closed') {
        escalation.resolvedAt = new Date();
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
