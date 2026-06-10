const mongoose = require('mongoose');

const templateSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  metaTemplateId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['UTILITY', 'MARKETING', 'AUTHENTICATION'],
    required: true
  },
  language: {
    type: String,
    default: 'en_US'
  },
  status: {
    type: String,
    enum: ['APPROVED', 'PENDING', 'REJECTED', 'PAUSED'],
    default: 'APPROVED'
  },
  components: [{
    type: {
      type: String,
      required: true
    },
    text: {
      type: String
    },
    format: {
      type: String
    }
  }],
  mappedEvent: {
    type: String,
    enum: [null, 'order_confirmation', 'order_shipped', 'order_delivered'],
    default: null
  }
}, {
  timestamps: true
});

// Ensure uniqueness per admin per template name
templateSchema.index({ adminId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Template', templateSchema);
