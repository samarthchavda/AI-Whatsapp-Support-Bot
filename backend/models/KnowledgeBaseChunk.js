const mongoose = require('mongoose');

const knowledgeBaseChunkSchema = new mongoose.Schema({
  knowledgeBaseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KnowledgeBase',
    required: true,
    index: true
  },
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
    index: true
  },
  text: {
    type: String,
    required: true
  },
  embedding: {
    type: [Number],
    required: true
  },
  chunkIndex: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('KnowledgeBaseChunk', knowledgeBaseChunkSchema);
