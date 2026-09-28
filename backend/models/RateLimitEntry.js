const mongoose = require('mongoose');

const rateLimitEntrySchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  count: {
    type: Number,
    default: 1
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }
  }
});

module.exports = mongoose.model('RateLimitEntry', rateLimitEntrySchema);
