const mongoose = require('mongoose');

const pageVisitSchema = new mongoose.Schema({
  pagePath: {
    type: String,
    required: true,
    index: true
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  referrer: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

pageVisitSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PageVisit', pageVisitSchema);
