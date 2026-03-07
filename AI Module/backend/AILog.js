const mongoose = require('mongoose');

// Create Mongoose model to store:
// prompt
// rawResponse
// parsedResponse
// createdAt
const aiLogSchema = new mongoose.Schema(
  {
    prompt: {
      type: String,
      required: true,
      trim: true,
    },
    rawResponse: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    parsedResponse: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  }
);

module.exports = mongoose.model('AILog', aiLogSchema);
