const mongoose = require('mongoose');

const returnPolicySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['general', 'electronics', 'clothing', 'food', 'other'],
    default: 'general'
  },
  timeFrame: {
    value: Number,
    unit: {
      type: String,
      enum: ['days', 'weeks', 'months']
    }
  },
  conditions: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  version: {
    type: String,
    default: '1.0'
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('ReturnPolicy', returnPolicySchema);
