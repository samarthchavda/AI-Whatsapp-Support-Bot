/**
 * Knowledge Base Centralized Constants
 */
module.exports = {
  MAX_KB_FILE_SIZE: 10 * 1024 * 1024, // 10MB in bytes
  SUPPORTED_KB_FILE_TYPES: ['pdf'],
  SUPPORTED_KB_MIME_TYPES: ['application/pdf'],
  DEFAULT_KB_RETRIEVAL_TOP_K: 3,
  MIN_SIMILARITY_THRESHOLD: Number(process.env.MIN_SIMILARITY_THRESHOLD || 0.65)
};
