const Conversation = require('../models/Conversation');
const Order = require('../models/Order');
const Escalation = require('../models/Escalation');
const aiService = require('../services/aiService');

// Get conversations per day for last 7 days
exports.getConversationsPerDay = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const conversations = await Conversation.aggregate([
      {
        $match: {
          admin: req.admin._id,
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Fill in missing days with 0
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const found = conversations.find(c => c._id === dateStr);
      result.push({
        date: dateStr,
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        count: found ? found.count : 0
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting conversations per day:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation analytics'
    });
  }
};

// Get resolution rate (AI vs Human)
exports.getResolutionRate = async (req, res) => {
  try {
    const adminQuery = { admin: req.admin._id };
    
    const [totalConversations, escalatedConversations] = await Promise.all([
      Conversation.countDocuments(adminQuery),
      Escalation.countDocuments(adminQuery)
    ]);
    
    const aiResolved = totalConversations - escalatedConversations;
    const humanEscalated = escalatedConversations;

    res.json({
      success: true,
      data: {
        aiResolved,
        humanEscalated,
        total: totalConversations,
        aiResolvedPercentage: totalConversations > 0 
          ? ((aiResolved / totalConversations) * 100).toFixed(1)
          : 0,
        humanEscalatedPercentage: totalConversations > 0
          ? ((humanEscalated / totalConversations) * 100).toFixed(1)
          : 0
      }
    });
  } catch (error) {
    console.error('Error getting resolution rate:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch resolution rate'
    });
  }
};

// Analyze sentiment using Gemini
exports.getSentimentAnalysis = async (req, res) => {
  try {
    // Get last 100 messages from conversations
    const conversations = await Conversation.find({ admin: req.admin._id })
      .sort({ updatedAt: -1 })
      .limit(50)
      .select('messages')
      .lean();

    // Extract all messages
    let allMessages = [];
    conversations.forEach(conv => {
      if (conv.messages && conv.messages.length > 0) {
        conv.messages.forEach(msg => {
          if (msg.role === 'user' && msg.content) {
            allMessages.push(msg.content);
          }
        });
      }
    });

    // Limit to last 100 customer messages
    allMessages = allMessages.slice(0, 100);

    if (allMessages.length === 0) {
      return res.json({
        success: true,
        data: {
          sentiment: 'neutral',
          emoji: '😐',
          confidence: 0,
          totalMessages: 0,
          breakdown: {
            happy: 0,
            neutral: 0,
            frustrated: 0
          }
        }
      });
    }

    // Prepare prompt for Gemini
    const prompt = `Analyze the sentiment of these customer messages and provide a JSON response with the overall sentiment and breakdown.

Customer Messages:
${allMessages.slice(0, 50).join('\n')}

Analyze these messages and respond with ONLY a JSON object in this exact format:
{
  "sentiment": "happy" or "neutral" or "frustrated",
  "confidence": 0.0 to 1.0,
  "breakdown": {
    "happy": percentage as number (0-100),
    "neutral": percentage as number (0-100),
    "frustrated": percentage as number (0-100)
  },
  "reasoning": "brief explanation"
}

Consider:
- Positive words, gratitude, satisfaction = happy
- Questions, neutral tone, informational = neutral
- Complaints, anger, dissatisfaction = frustrated`;

    // Call Gemini API
    const geminiResponse = await aiService.analyzeWithGemini(prompt, []);

    // Parse response
    let analysis;
    try {
      // Extract JSON from response
      const jsonMatch = geminiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      // Fallback to neutral
      analysis = {
        sentiment: 'neutral',
        confidence: 0.5,
        breakdown: { happy: 33, neutral: 34, frustrated: 33 },
        reasoning: 'Unable to analyze sentiment'
      };
    }

    // Map sentiment to emoji
    const emojiMap = {
      happy: '😊',
      neutral: '😐',
      frustrated: '😤'
    };

    res.json({
      success: true,
      data: {
        sentiment: analysis.sentiment,
        emoji: emojiMap[analysis.sentiment] || '😐',
        confidence: analysis.confidence,
        totalMessages: allMessages.length,
        breakdown: analysis.breakdown,
        reasoning: analysis.reasoning
      }
    });
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze sentiment'
    });
  }
};

// Get overall dashboard stats
exports.getDashboardStats = async (req, res) => {
  try {
    const adminQuery = { admin: req.admin._id };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalConversations,
      totalOrders,
      totalEscalations,
      pendingOrders,
      activeEscalations,
      todayConversations
    ] = await Promise.all([
      Conversation.countDocuments(adminQuery),
      Order.countDocuments(adminQuery),
      Escalation.countDocuments(adminQuery),
      Order.countDocuments({ ...adminQuery, status: 'pending' }),
      Escalation.countDocuments({ ...adminQuery, status: 'open' }),
      Conversation.countDocuments({
        ...adminQuery,
        createdAt: { $gte: today }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalConversations,
        totalOrders,
        totalEscalations,
        pendingOrders,
        activeEscalations,
        todayConversations
      }
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats'
    });
  }
};
