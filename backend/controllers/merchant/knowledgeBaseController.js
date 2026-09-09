const KnowledgeBase = require('../../models/KnowledgeBase');
const knowledgeBaseService = require('../../services/knowledgeBaseService');
const fs = require('fs').promises;

// Upload knowledge base file (PDF ONLY)
exports.uploadKnowledgeBase = async (req, res) => {
  let createdKbDoc = null;
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const { title, description } = req.body;

    if (!title || !title.trim()) {
      if (req.file.path) await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }

    const { MAX_KB_FILE_SIZE } = require('../../config/kbConstants');

    // 1. File Extension Validation (PDF ONLY)
    const fileExtension = req.file.originalname ? req.file.originalname.split('.').pop().toLowerCase() : '';
    if (fileExtension !== 'pdf') {
      if (req.file.path) await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        error: 'Invalid file type. Only PDF (.pdf) documents are allowed in Knowledge Base.'
      });
    }

    // 2. File Size Validation (Max 10MB)
    if (req.file.size > MAX_KB_FILE_SIZE) {
      if (req.file.path) await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        error: 'File size exceeds maximum limit of 10MB per PDF.'
      });
    }

    // 3. MIME Type Validation
    const allowedMimeTypes = ['application/pdf', 'application/x-pdf', 'application/octet-stream'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      if (req.file.path) await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        error: 'Invalid MIME type. Only valid PDF files (application/pdf) are allowed.'
      });
    }

    // 4. PDF Magic Bytes Validation (%PDF-)
    try {
      const fd = await fs.open(req.file.path, 'r');
      const buffer = Buffer.alloc(5);
      await fd.read(buffer, 0, 5, 0);
      await fd.close();
      const magicHeader = buffer.toString('utf-8');
      if (!magicHeader.startsWith('%PDF-')) {
        await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({
          success: false,
          error: 'Invalid PDF content. Renamed non-PDF or corrupted files are not allowed.'
        });
      }
    } catch (headerErr) {
      if (req.file.path) await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        error: 'Failed to validate PDF file content.'
      });
    }

    // 5. SHA-256 Checksum & Duplicate PDF Protection
    const crypto = require('crypto');
    const fileBuffer = await fs.readFile(req.file.path);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const existingDuplicate = await KnowledgeBase.findOne({
      uploadedBy: req.admin._id,
      checksum: checksum,
      isActive: true,
      status: 'ready'
    });

    if (existingDuplicate) {
      await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        error: 'Duplicate PDF detected. You have already uploaded this document.'
      });
    }

    // 6. Dynamic Pricing Plan Limit Check (Starter: 1, Growth: 3, Scale: Unlimited)
    const subscriptionService = require('../../services/subscriptionService');
    const adminDoc = await Admin.findById(req.admin._id);
    const limitVal = subscriptionService.getPlanLimit(adminDoc?.subscriptionPlan, 'maxKbUploads');

    // Count ONLY active & ready documents towards the limit
    if (limitVal !== -1 && limitVal !== Infinity) {
      const activeCount = await KnowledgeBase.countDocuments({
        uploadedBy: req.admin._id,
        isActive: true,
        status: 'ready'
      });

      if (activeCount >= limitVal) {
        await fs.unlink(req.file.path).catch(() => {});
        const normPlan = subscriptionService.normalizePlanName(adminDoc?.subscriptionPlan);
        const displayPlanName = normPlan.charAt(0).toUpperCase() + normPlan.slice(1);
        return res.status(403).json({
          success: false,
          error: `Your ${displayPlanName} plan allows a maximum of ${limitVal} Knowledge Base PDF document(s). Upgrade your plan to add more documents.`
        });
      }
    }

    // 7. Process File & Extract Text
    const { text, length, fileType } = await knowledgeBaseService.processFile(req.file);

    // Create KnowledgeBase document in 'processing' status
    createdKbDoc = new KnowledgeBase({
      title: title.trim(),
      description: (description || '').trim(),
      fileType: 'pdf',
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      extractedText: text,
      textLength: length,
      uploadedBy: req.admin._id,
      uploadedByName: req.admin.name || 'Merchant',
      checksum: checksum,
      status: 'processing',
      isActive: true
    });

    await createdKbDoc.save();

    // 8. Chunk and Save Vector Embeddings (Gemini RAG)
    await knowledgeBaseService.processAndSaveChunks(createdKbDoc);

    // Mark status as ready
    createdKbDoc.status = 'ready';
    await createdKbDoc.save();

    res.status(201).json({
      success: true,
      message: 'Knowledge Base PDF uploaded and processed successfully',
      data: {
        id: createdKbDoc._id,
        title: createdKbDoc.title,
        fileType: createdKbDoc.fileType,
        textLength: createdKbDoc.textLength,
        status: createdKbDoc.status,
        isActive: createdKbDoc.isActive
      }
    });
  } catch (error) {
    console.error('Error uploading knowledge base PDF:', error.message);

    // Clean up temporary physical file
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    // Clean up DB document & chunks if created
    if (createdKbDoc && createdKbDoc._id) {
      const KnowledgeBaseChunk = require('../../models/KnowledgeBaseChunk');
      await KnowledgeBaseChunk.deleteMany({ knowledgeBaseId: createdKbDoc._id }).catch(() => {});
      await KnowledgeBase.findByIdAndDelete(createdKbDoc._id).catch(() => {});
    }

    res.status(400).json({
      success: false,
      error: error.message || 'Failed to upload Knowledge Base PDF'
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

    // Calculate real WhatsApp product inquiry leads for this admin
    const MerchantProductLead = require('../../models/MerchantProductLead');
    const realLeadsCount = (req && req.admin && req.admin._id) ? 
      await MerchantProductLead.countDocuments({ adminId: req.admin._id }) : 0;

    // Calculate merchant plan limits and active PDF usage
    let planUsage = {
      planName: 'Starter',
      rawPlanName: 'starter',
      activePdfCount: 0,
      maxKbUploads: 1,
      isLimitReached: false
    };

    if (req && req.admin && req.admin._id) {
      const subscriptionService = require('../../services/subscriptionService');
      const Admin = require('../../models/Admin');
      const adminDoc = await Admin.findById(req.admin._id);
      const normPlan = subscriptionService.normalizePlanName(adminDoc?.subscriptionPlan);
      const limitVal = subscriptionService.getPlanLimit(normPlan, 'maxKbUploads');

      const activePdfCount = await KnowledgeBase.countDocuments({
        uploadedBy: req.admin._id,
        isActive: true,
        status: 'ready'
      });

      const displayPlanName = normPlan.charAt(0).toUpperCase() + normPlan.slice(1);

      planUsage = {
        planName: displayPlanName,
        rawPlanName: normPlan,
        activePdfCount: activePdfCount,
        maxKbUploads: limitVal,
        isLimitReached: limitVal !== -1 && limitVal !== Infinity && activePdfCount >= limitVal
      };
    }

    res.json({
      success: true,
      data: knowledgeBases,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
      productLeadsCount: realLeadsCount,
      planUsage: planUsage
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

    // 1. Delete associated vector chunks from MongoDB
    try {
      const KnowledgeBaseChunk = require('../../models/KnowledgeBaseChunk');
      await KnowledgeBaseChunk.deleteMany({ knowledgeBaseId: knowledgeBase._id });
    } catch (chunkError) {
      console.error('Error deleting chunks:', chunkError);
    }

    // 2. Delete physical PDF file from server disk
    if (knowledgeBase.filePath && !knowledgeBase.filePath.startsWith('shopify://')) {
      try {
        const fs = require('fs').promises;
        await fs.unlink(knowledgeBase.filePath);
      } catch (fileErr) {
        console.warn('Physical file deletion warning:', fileErr.message);
      }
    }

    // 3. Delete KnowledgeBase document from MongoDB
    await KnowledgeBase.findByIdAndDelete(knowledgeBase._id);

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

/**
 * Sync active Shopify products into Knowledge Base
 */
exports.syncShopifyProducts = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const Integration = require('../../models/Integration');
    const axios = require('axios');

    // Find active shopify integration
    const integration = await Integration.findOne({ adminId, platform: 'shopify', isActive: true });
    if (!integration || !integration.apiKey || !integration.storeUrl) {
      return res.status(400).json({
        success: false,
        error: 'No active Shopify store connected. Please connect your Shopify store in Integrations.'
      });
    }

    // Clean store domain properly
    let shopDomain = integration.storeUrl.trim();
    shopDomain = shopDomain.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    if (shopDomain.includes('admin.shopify.com')) {
      const parts = shopDomain.split('/');
      const storeIndex = parts.indexOf('store');
      if (storeIndex !== -1 && parts[storeIndex + 1]) {
        shopDomain = parts[storeIndex + 1] + '.myshopify.com';
      }
    } else if (!shopDomain.includes('.')) {
      shopDomain += '.myshopify.com';
    }

    const apiVersion = process.env.SHOPIFY_API_VERSION || '2024-07';
    
    // Fetch shop currency from Shopify
    let currencySymbol = '$';
    try {
      const shopRes = await axios.get(`https://${shopDomain}/admin/api/${apiVersion}/shop.json`, {
        headers: { 'X-Shopify-Access-Token': integration.apiKey, 'Content-Type': 'application/json' },
        timeout: 10000
      });
      const currencyCode = shopRes.data?.shop?.currency || 'USD';
      if (currencyCode === 'INR') currencySymbol = '₹';
      else if (currencyCode === 'EUR') currencySymbol = '€';
      else if (currencyCode === 'GBP') currencySymbol = '£';
      else if (currencyCode === 'CAD') currencySymbol = 'CA$';
      else currencySymbol = '$';
    } catch (shopErr) {
      console.warn('Could not fetch shop currency, defaulting to $:', shopErr.message);
      currencySymbol = '$';
    }

    let nextUrl = `https://${shopDomain}/admin/api/${apiVersion}/products.json?limit=250`;
    let products = [];

    console.log(`🛍️ Fetching Shopify products for ${shopDomain} (Currency: ${currencySymbol})...`);

    while (nextUrl) {
      const response = await axios.get(nextUrl, {
        headers: {
          'X-Shopify-Access-Token': integration.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      });

      const pageProducts = response.data.products || [];
      products.push(...pageProducts);

      // Parse Shopify header Link for page_info cursor pagination
      const linkHeader = response.headers.link;
      nextUrl = null;
      if (linkHeader) {
        const links = linkHeader.split(',');
        const nextLink = links.find(l => l.includes('rel="next"'));
        if (nextLink) {
          const match = nextLink.match(/<([^>]+)>/);
          if (match) {
            nextUrl = match[1];
          }
        }
      }
    }

    console.log(`🛍️ Found total ${products.length} products across all Shopify pages`);

    let syncedCount = 0;

    for (const product of products) {
      const title = product.title;
      const variant = product.variants?.[0] || {};
      const price = variant.price || '0';
      const formattedPrice = `${currencySymbol}${price}`;
      const sku = variant.sku || '';
      const bodyText = (product.body_html || '').replace(/<[^>]*>?/gm, '');

      const textContent = `Product Name: ${title}\nPrice: ${formattedPrice}\nSKU: ${sku}\nStatus: In Stock\nCategory: ${product.product_type || 'General'}\nDescription: ${bodyText}`;

      const imageSrc = product.image?.src || product.images?.[0]?.src || '';
      const categoryName = product.product_type || 'Shopify Product';

      // Check if product already exists in KnowledgeBase
      let kb = await KnowledgeBase.findOne({ uploadedBy: adminId, fileName: `shopify_prod_${product.id}` });

      if (kb) {
        kb.title = title;
        kb.extractedText = textContent;
        kb.textLength = textContent.length;
        kb.productData = {
          price: formattedPrice,
          image: imageSrc,
          sku: sku || 'N/A',
          category: categoryName,
          stock: variant.inventory_quantity || 15
        };
        await kb.save();
      } else {
        kb = new KnowledgeBase({
          title,
          description: `Shopify Product: ${title}`,
          fileType: 'product',
          fileName: `shopify_prod_${product.id}`,
          filePath: `shopify://${shopDomain}/${product.id}`,
          fileSize: textContent.length,
          extractedText: textContent,
          textLength: textContent.length,
          uploadedBy: adminId,
          uploadedByName: req.admin.name,
          productData: {
            price: formattedPrice,
            image: imageSrc,
            sku: sku || 'N/A',
            category: categoryName,
            stock: variant.inventory_quantity || 15
          }
        });
        await kb.save();
      }

      // Process vector embeddings for Gemini RAG search
      try {
        const knowledgeBaseService = require('../../services/knowledgeBaseService');
        await knowledgeBaseService.processAndSaveChunks(kb);
      } catch (chunkErr) {
        console.warn(`Could not chunk product ${title}:`, chunkErr.message);
      }

      syncedCount++;
    }

    // Prune products that were deleted from Shopify
    const activeFileNames = products.map(p => `shopify_prod_${p.id}`);
    const KnowledgeChunk = require('../../models/KnowledgeBaseChunk');
    const staleKbs = await KnowledgeBase.find({
      uploadedBy: adminId,
      fileType: 'product',
      fileName: { $regex: /^shopify_prod_/ },
      fileName: { $nin: activeFileNames }
    });

    for (const stale of staleKbs) {
      await KnowledgeChunk.deleteMany({ knowledgeBaseId: stale._id });
      await KnowledgeBase.deleteOne({ _id: stale._id });
    }
    if (staleKbs.length > 0) {
      console.log(`🧹 Pruned ${staleKbs.length} deleted Shopify products from KnowledgeBase`);
    }

    return res.json({
      success: true,
      message: `Successfully synced ${syncedCount} products from Shopify into AI Knowledge Base`,
      count: syncedCount
    });
  } catch (error) {
    console.error('Error syncing Shopify products:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to sync Shopify products',
      message: error.response?.data?.errors || error.message
    });
  }
};
