const Escalation = require('../models/Escalation');
const Conversation = require('../models/Conversation');
const Order = require('../models/Order');

// Get dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const adminQuery = { admin: req.admin._id };
    
    // Order statistics
    const totalOrders = await Order.countDocuments(adminQuery);
    const pendingOrders = await Order.countDocuments({ ...adminQuery, status: 'pending' });
    const shippedOrders = await Order.countDocuments({ ...adminQuery, status: 'shipped' });
    const deliveredOrders = await Order.countDocuments({ ...adminQuery, status: 'delivered' });

    // Conversation statistics
    const totalConversations = await Conversation.countDocuments(adminQuery);
    const activeConversations = await Conversation.countDocuments({ ...adminQuery, status: 'active' });
    const escalatedConversations = await Conversation.countDocuments({ ...adminQuery, escalated: true });
    const resolvedConversations = await Conversation.countDocuments({ ...adminQuery, status: 'resolved' });

    // Escalation statistics
    const totalEscalations = await Escalation.countDocuments(adminQuery);
    const pendingEscalations = await Escalation.countDocuments({ ...adminQuery, status: 'pending' });
    const urgentEscalations = await Escalation.countDocuments({ 
      ...adminQuery,
      status: { $in: ['pending', 'in_progress'] }, 
      priority: 'urgent' 
    });

    // Recent conversations
    const recentConversations = await Conversation.find(adminQuery)
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('customerName customerPhone status updatedAt escalated');

    // Recent escalations
    const recentEscalations = await Escalation.find(adminQuery)
      .sort({ createdAt: -1 })
      .limit(5)
      .select('customerName reason priority status createdAt');

    // Intent distribution (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const intentDistribution = await Conversation.aggregate([
      { $match: { admin: req.admin._id, createdAt: { $gte: thirtyDaysAgo } } },
      { $unwind: '$messages' },
      { $match: { 'messages.role': 'user' } },
      { $group: { _id: '$messages.intent', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Average satisfaction score
    const satisfactionAgg = await Conversation.aggregate([
      { $match: { admin: req.admin._id, satisfaction: { $exists: true, $ne: null } } },
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
    
    let query = { admin: req.admin._id };
    
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
