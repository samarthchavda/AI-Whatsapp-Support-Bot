const KnowledgeBase = require('../../models/KnowledgeBase');
const knowledgeBaseService = require('../../services/knowledgeBaseService');
const fs = require('fs').promises;

// Upload knowledge base file
exports.uploadKnowledgeBase = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const { title, description } = req.body;

    if (!title) {
      // Delete uploaded file
      await fs.unlink(req.file.path);
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }

    // Fetch user's subscription plan details to check limits
    const Admin = require('../../models/Admin');
    const PricingPlan = require('../../models/PricingPlan');
    const adminDoc = await Admin.findById(req.admin._id);
    const planName = (adminDoc.subscriptionPlan || 'starter').toLowerCase();

    // Default limit mappings
    const DEFAULT_KB_LIMITS = {
      starter: 1,
      professional: 3,
      enterprise: -1,
      custom: -1
    };

    let limitVal = DEFAULT_KB_LIMITS[planName] || 1;

    // Check if there is a pricing plan features block in database
    const pricingPlan = await PricingPlan.findOne({ name: planName, isActive: true });
    if (pricingPlan && pricingPlan.features && typeof pricingPlan.features.maxKbUploads !== 'undefined') {
      limitVal = pricingPlan.features.maxKbUploads;
    }

    if (limitVal !== -1) {
      const existingCount = await KnowledgeBase.countDocuments({ uploadedBy: req.admin._id });
      if (existingCount >= limitVal) {
        // Delete uploaded temp file
        await fs.unlink(req.file.path);
        return res.status(403).json({
          success: false,
          error: `Your ${planName.toUpperCase()} plan only allows a maximum of ${limitVal} Knowledge Base document(s). Please upgrade your subscription to upload more documents.`
        });
      }
    }

    // Process the file and extract text
    const { text, length, fileType } = await knowledgeBaseService.processFile(req.file);

    // Create knowledge base entry
    const knowledgeBase = new KnowledgeBase({
      title,
      description: description || '',
      fileType,
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      extractedText: text,
      textLength: length,
      uploadedBy: req.admin._id,
      uploadedByName: req.admin.name
    });

    await knowledgeBase.save();

    // Chunk and save embeddings for RAG
    try {
      await knowledgeBaseService.processAndSaveChunks(knowledgeBase);
    } catch (chunkError) {
      console.error('Failed to chunk and embed document:', chunkError);
    }

    res.status(201).json({
      success: true,
      message: 'Knowledge base uploaded successfully',
      data: {
        id: knowledgeBase._id,
        title: knowledgeBase.title,
        fileType: knowledgeBase.fileType,
        textLength: knowledgeBase.textLength,
        isActive: knowledgeBase.isActive
      }
    });
  } catch (error) {
    // Delete uploaded file if processing failed
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }

    console.error('Error uploading knowledge base:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload knowledge base'
    });
  }
};

// Get all knowledge bases
exports.getAllKnowledgeBases = async (req, res) => {
  try {
    const { page = 1, limit = 20, isActive } = req.query;

    const query = {};
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    // Only return knowledge bases uploaded by the current admin
    if (req && req.admin && req.admin._id) {
      query.uploadedBy = req.admin._id;
    }

    const knowledgeBases = await KnowledgeBase.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-extractedText') // Don't send full text in list
      .exec();

    const count = await KnowledgeBase.countDocuments(query);

    res.json({
      success: true,
      data: knowledgeBases,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Error fetching knowledge bases:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch knowledge bases'
    });
  }
};

// Get single knowledge base by ID
exports.getKnowledgeBaseById = async (req, res) => {
  try {
    const knowledgeBase = await KnowledgeBase.findById(req.params.id);

    if (!knowledgeBase) {
      return res.status(404).json({
        success: false,
        error: 'Knowledge base not found'
      });
    }

    // Enforce ownership: only uploader (or super-admin) can access
    if (req && req.admin && knowledgeBase.uploadedBy && knowledgeBase.uploadedBy.toString() !== req.admin._id.toString() && !req.admin.isSuperAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    res.json({
      success: true,
      data: knowledgeBase
    });
  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch knowledge base'
    });
  }
};

// Update knowledge base (toggle active status or update metadata)
exports.updateKnowledgeBase = async (req, res) => {
  try {
    const { title, description, isActive } = req.body;

    const knowledgeBase = await KnowledgeBase.findById(req.params.id);

    if (!knowledgeBase) {
      return res.status(404).json({
        success: false,
        error: 'Knowledge base not found'
      });
    }

    // Enforce ownership for updates
    if (req && req.admin && knowledgeBase.uploadedBy && knowledgeBase.uploadedBy.toString() !== req.admin._id.toString() && !req.admin.isSuperAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    if (title !== undefined) knowledgeBase.title = title;
    if (description !== undefined) knowledgeBase.description = description;
    if (isActive !== undefined) knowledgeBase.isActive = isActive;

    await knowledgeBase.save();

    res.json({
      success: true,
      message: 'Knowledge base updated successfully',
      data: knowledgeBase
    });
  } catch (error) {
    console.error('Error updating knowledge base:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update knowledge base'
    });
  }
};

// Delete knowledge base
exports.deleteKnowledgeBase = async (req, res) => {
  try {
    const knowledgeBase = await KnowledgeBase.findById(req.params.id);

    if (!knowledgeBase) {
      return res.status(404).json({
        success: false,
        error: 'Knowledge base not found'
      });
    }

    // Enforce ownership for deletion
    if (req && req.admin && knowledgeBase.uploadedBy && knowledgeBase.uploadedBy.toString() !== req.admin._id.toString() && !req.admin.isSuperAdmin) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    // Delete the file
    // Delete associated vector chunks
    try {
      const KnowledgeBaseChunk = require('../../models/KnowledgeBaseChunk');
      await KnowledgeBaseChunk.deleteMany({ knowledgeBaseId: req.params.id });
    } catch (chunkError) {
      console.error('Error deleting chunks:', chunkError);
    }

    await KnowledgeBase.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Knowledge base deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting knowledge base:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete knowledge base'
    });
  }
};

// Query knowledge base (test endpoint)
exports.queryKnowledgeBase = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      });
    }

    // Get all active knowledge bases for this admin
    const knowledgeBases = await KnowledgeBase.find({ isActive: true, uploadedBy: req.admin._id });

    if (!knowledgeBases || knowledgeBases.length === 0) {
      return res.json({
        success: true,
        data: {
          answer: "I don't have access to any knowledge base documents yet. Let me connect you to a human agent.",
          foundInKB: false,
          confidence: 0
        }
      });
    }

    // Query using the knowledge base service with RAG (adminId context)
    const result = await knowledgeBaseService.queryKnowledgeBase(question, req.admin._id);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error querying knowledge base:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to query knowledge base',
      message: error.message
    });
  }
};

/**
 * Ingest website URL content into knowledge base
 */
exports.ingestURL = async (req, res) => {
  try {
    const { title, url, description } = req.body;

    if (!title || !url) {
      return res.status(400).json({
        success: false,
        error: 'Title and URL are required'
      });
    }

    console.log(`🌐 Scraping text from URL: ${url}...`);

    // Scrape URL
    const text = await knowledgeBaseService.extractTextFromURL(url);

    // Create knowledge base entry of type 'url'
    const knowledgeBase = new KnowledgeBase({
      title,
      description: description || '',
      fileType: 'url',
      fileName: url,
      filePath: url,
      fileSize: text.length,
      extractedText: text,
      textLength: text.length,
      uploadedBy: req.admin._id,
      uploadedByName: req.admin.name
    });

    await knowledgeBase.save();

    // Chunk and save embeddings for RAG
    try {
      await knowledgeBaseService.processAndSaveChunks(knowledgeBase);
    } catch (chunkError) {
      console.error('Failed to chunk and embed URL:', chunkError);
    }

    return res.status(201).json({
      success: true,
      message: 'URL content ingested successfully',
      data: {
        id: knowledgeBase._id,
        title: knowledgeBase.title,
        fileType: knowledgeBase.fileType,
        textLength: knowledgeBase.textLength,
        isActive: knowledgeBase.isActive
      }
    });
  } catch (error) {
    console.error('Error ingesting URL:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to ingest URL'
    });
  }
};
