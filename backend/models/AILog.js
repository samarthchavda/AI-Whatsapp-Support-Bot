const mongoose = require('mongoose');

const aiLogSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  customerPhone: {
    type: String,
    required: true,
    index: true
  },
  intent: {
    type: String,
    enum: ['order_status', 'cancel_order', 'return_policy', 'refund_request', 'complaint', 'general_inquiry', 'other'],
    required: true
  },
  // Input
  userMessage: {
    type: String,
    required: true
  },
  // AI Configuration
  aiModel: {
    type: String,
    default: 'gpt-3.5-turbo'
  },
  // Prompt sent to AI
  systemPrompt: String,
  userPrompt: String,
  // AI Response
  aiResponse: String,
  // AI Metadata
  promptTokens: Number,
  completionTokens: Number,
  totalTokens: Number,
  temperature: Number,
  // Business Logic
  assistantMessage: {
    type: String,
    required: true
  },
  // Structured output
  structuredOutput: {
    intent: String,
    confidence: Number,
    escalated: Boolean,
    escalationReason: String,
    relatedOrderIds: [String],
    metadata: {
      responseTime: Number,
      usedAI: Boolean,
      dataSource: [String]
    }
  },
  // Error handling
  error: {
    occurred: Boolean,
    message: String,
    code: String
  },
  // Tracking
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  duration: Number
}, { 
  timestamps: true 
});

// Indexes for fast queries
aiLogSchema.index({ customerPhone: 1, createdAt: -1 });
aiLogSchema.index({ intent: 1 });
aiLogSchema.index({ error: 1 });

module.exports = mongoose.model('AILog', aiLogSchema);
