const mongoose = require('mongoose');

const abandonedCartSchema = new mongoose.Schema({
  cartId: {
    type: String,
    required: true,
    index: true
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  customerPhone: {
    type: String,
    required: true,
    index: true
  },
  customerName: {
    type: String,
    default: 'Customer'
  },
  customerEmail: {
    type: String,
    default: null
  },
  items: [{
    productId: String,
    productName: String,
    quantity: {
      type: Number,
      default: 1
    },
    price: {
      type: Number,
      default: 0
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  checkoutUrl: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['abandoned', 'reminder_sent', 'recovered'],
    default: 'abandoned',
    index: true
  },
  reminderSentAt: {
    type: Date,
    default: null
  },
  abandonedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  recoveredAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for compound lookup
abandonedCartSchema.index({ admin: 1, cartId: 1 }, { unique: true });

module.exports = mongoose.model('AbandonedCart', abandonedCartSchema);
