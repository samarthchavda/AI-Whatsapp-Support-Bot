const aiService = require('../services/aiService');
const AILog = require('../models/AILog');
const Conversation = require('../models/Conversation');
const Escalation = require('../models/Escalation');

// Test endpoint - simulate WhatsApp message
exports.testMessage = async (req, res) => {
  try {
    const { customerPhone, customerName, message } = req.body;

    // Validation
    if (!customerPhone || !customerName || !message) {
      return res.status(400).json({
        error: 'Missing required fields: customerPhone, customerName, message'
      });
    }

    // Process message through AI service
    const response = await aiService.processMessage({
      customerPhone,
      customerName,
      message
    });

    res.json({
      success: true,
      input: {
        customerPhone,
        customerName,
        message
      },
      output: response,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Test message error:', error);
    res.status(500).json({
      error: error.message,
      success: false
    });
  }
};

// Get AI logs for a customer
exports.getAILogs = async (req, res) => {
  try {
    const { customerPhone, limit = 10, page = 1 } = req.query;

    if (!customerPhone) {
      return res.status(400).json({
        error: 'Customer phone number is required'
      });
    }

    const logs = await AILog.find({ customerPhone })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await AILog.countDocuments({ customerPhone });

    res.json({
      success: true,
      logs,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: page
      }
    });

  } catch (error) {
    console.error('Get AI logs error:', error);
    res.status(500).json({
      error: error.message,
      success: false
    });
  }
};

// Get AI logs by intent
exports.getLogsByIntent = async (req, res) => {
  try {
    const { intent, limit = 10, page = 1 } = req.query;

    if (!intent) {
      return res.status(400).json({
        error: 'Intent is required'
      });
    }

    const logs = await AILog.find({ intent })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await AILog.countDocuments({ intent });

    res.json({
      success: true,
      intent,
      logs,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: page
      }
    });

  } catch (error) {
    console.error('Get logs by intent error:', error);
    res.status(500).json({
      error: error.message,
      success: false
    });
  }
};

// Get AI logs with errors
exports.getErrorLogs = async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;

    const logs = await AILog.find({ 'error.occurred': true })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await AILog.countDocuments({ 'error.occurred': true });

    res.json({
      success: true,
      logs,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        currentPage: page
      }
    });

  } catch (error) {
    console.error('Get error logs error:', error);
    res.status(500).json({
      error: error.message,
      success: false
    });
  }
};

// Get AI statistics
exports.getAIStats = async (req, res) => {
  try {
    const stats = {
      totalMessages: await AILog.countDocuments(),
      messagesByIntent: await AILog.aggregate([
        { $group: { _id: '$intent', count: { $sum: 1 } } }
      ]),
      messagesWithErrors: await AILog.countDocuments({ 'error.occurred': true }),
      messagesUsingAI: await AILog.countDocuments({ 'structuredOutput.metadata.usedAI': true }),
      escalations: await Escalation.countDocuments(),
      escalationsByReason: await Escalation.aggregate([
        { $group: { _id: '$reason', count: { $sum: 1 } } }
      ]),
      escalationsByPriority: await Escalation.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } }
      ]),
      averageResponseTime: await AILog.aggregate([
        { $group: { _id: null, avgDuration: { $avg: '$duration' } } }
      ]),
      totalConversations: await Conversation.countDocuments()
    };

    res.json({
      success: true,
      stats,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Get AI stats error:', error);
    res.status(500).json({
      error: error.message,
      success: false
    });
  }
};

// Get conversation details with AI logs
exports.getConversationWithLogs = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        error: 'Conversation not found'
      });
    }

    const aiLogs = await AILog.find({ conversationId });

    res.json({
      success: true,
      conversation,
      aiLogs,
      summary: {
        totalMessages: conversation.messages.length,
        totalAILogs: aiLogs.length,
        escalated: conversation.escalated,
        status: conversation.status
      }
    });

  } catch (error) {
    console.error('Get conversation with logs error:', error);
    res.status(500).json({
      error: error.message,
      success: false
    });
  }
};
