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
  businessAccountId: { type: String, default: null, index: true },
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
    },
    example: {
      type: mongoose.Schema.Types.Mixed
    },
    buttons: [{
      type: mongoose.Schema.Types.Mixed
    }]
  }],
  mappedEvent: {
    type: String,
    enum: [null, 'order_confirmation', 'order_shipped', 'order_delivered', 'order_cancelled', 'abandoned_cart'],
    default: null
  }
}, {
  timestamps: true
});

// Meta template names are unique within a WABA and language, not across a merchant's numbers.
templateSchema.index({ adminId: 1, businessAccountId: 1, name: 1, language: 1 }, { unique: true, name: 'template_waba_name_language_unique' });

module.exports = mongoose.model('Template', templateSchema);
