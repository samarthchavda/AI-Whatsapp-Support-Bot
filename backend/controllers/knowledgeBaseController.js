const KnowledgeBase = require('../models/KnowledgeBase');
const knowledgeBaseService = require('../services/knowledgeBaseService');
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

    // Delete the file
    try {
      await fs.unlink(knowledgeBase.filePath);
    } catch (fileError) {
      console.error('Error deleting file:', fileError);
      // Continue with database deletion even if file deletion fails
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

    // Get all active knowledge bases
    const knowledgeBases = await KnowledgeBase.find({ isActive: true });

    if (knowledgeBases.length === 0) {
      return res.json({
        success: true,
        data: {
          answer: "I don't have access to any knowledge base documents yet. Let me connect you to a human agent.",
          foundInKB: false,
          confidence: 0
        }
      });
    }

    // Extract texts from all active knowledge bases
    const texts = knowledgeBases.map(kb => kb.extractedText);

    // Query using the knowledge base service
    const result = await knowledgeBaseService.queryKnowledgeBase(question, texts);

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
