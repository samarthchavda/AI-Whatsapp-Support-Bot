const Broadcast = require('../../models/Broadcast');
const { addBroadcastToQueue, getQueueStats } = require('../../services/broadcastQueue');
const { scheduleBroadcast, cancelScheduledBroadcast } = require('../../services/broadcastScheduler');
const fs = require('fs').promises;
const csv = require('csv-parser');
const { createReadStream } = require('fs');

// Create new broadcast
exports.createBroadcast = async (req, res) => {
  try {
    const { title, message, scheduledFor, recipientSource } = req.body;
    let recipients = [];
    let csvFileName = 'Imported from CRM/Orders';

    // Validate required fields
    if (!title || !message) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        success: false,
        error: 'Title and message are required'
      });
    }

    const subscriptionService = require('../../services/subscriptionService');
    const isBroadcastingAllowed = subscriptionService.isFeatureAllowed(req.admin.subscriptionPlan, 'broadcastingAccess');
    if (!isBroadcastingAllowed) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(403).json({
        success: false,
        error: 'WhatsApp Broadcasting is not available on your current plan. Please upgrade to Growth or Scale to run broadcast campaigns.'
      });
    }

    // Check campaign limit
    const maxCampaigns = subscriptionService.getPlanLimit(req.admin.subscriptionPlan, 'maxBroadcastCampaigns');
    const campaignsUsed = req.admin.broadcastCampaignsUsed || 0;
    if (maxCampaigns !== -1 && maxCampaigns !== Infinity && campaignsUsed >= maxCampaigns) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(403).json({
        success: false,
        error: `You have reached your monthly broadcast campaign limit (${campaignsUsed}/${maxCampaigns}). Please upgrade to the Scale plan for unlimited campaigns.`
      });
    }

    if (recipientSource === 'crm') {
      // Delete uploaded file if it was sent by mistake
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }

      // Check plan restriction: Starter plan is blocked from direct CRM import
      if (req.admin.subscriptionPlan === 'starter') {
        return res.status(403).json({
          success: false,
          error: 'Direct import from Orders is not available on the Starter plan. Please upgrade to a higher plan.'
        });
      }

      // Fetch from orders
      const Order = require('../../models/Order');
      const orders = await Order.find({ admin: req.admin._id });
      
      const contactsMap = new Map();
      orders.forEach(order => {
        if (order.customerPhone) {
          const phone = order.customerPhone.toString().trim().replace(/\s+/g, '');
          // Filter out missing, invalid, or obviously placeholder numbers (e.g. less than 6 digits)
          if (phone && phone.length > 5 && !phone.includes('undefined') && !phone.includes('null')) {
            const name = order.customerName || 'Customer';
            contactsMap.set(phone, name);
          }
        }
      });

      if (contactsMap.size === 0) {
        return res.status(400).json({
          success: false,
          error: 'No customer contacts with valid phone numbers found in your orders database.'
        });
      }

      csvFileName = 'Imported from Orders';
      contactsMap.forEach((name, phone) => {
        recipients.push({ phone, name });
      });

    } else if (recipientSource === 'abandoned_carts') {
      // Delete uploaded file if it was sent by mistake
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }

      // Check plan restriction
      if (req.admin.subscriptionPlan === 'starter') {
        return res.status(403).json({
          success: false,
          error: 'Direct import from Abandoned Carts is not available on the Starter plan. Please upgrade to a higher plan.'
        });
      }

      // Fetch from abandoned carts
      const AbandonedCart = require('../../models/AbandonedCart');
      const carts = await AbandonedCart.find({ admin: req.admin._id });

      const contactsMap = new Map();
      carts.forEach(cart => {
        if (cart.customerPhone) {
          const phone = cart.customerPhone.toString().trim().replace(/\s+/g, '');
          if (phone && phone.length > 5 && !phone.includes('undefined') && !phone.includes('null')) {
            const name = cart.customerName || 'Customer';
            // Only set if not already present (deduplication — first entry wins)
            if (!contactsMap.has(phone)) {
              contactsMap.set(phone, name);
            }
          }
        }
      });

      if (contactsMap.size === 0) {
        return res.status(400).json({
          success: false,
          error: 'No customer contacts with valid phone numbers found in your abandoned carts.'
        });
      }

      csvFileName = 'Imported from Abandoned Carts';
      contactsMap.forEach((name, phone) => {
        recipients.push({ phone, name });
      });

    } else if (recipientSource === 'reuse' || req.body.reuseFromId) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      const sourceId = req.body.reuseFromId;
      const sourceBroadcast = await Broadcast.findOne({ _id: sourceId, admin: req.admin._id });
      if (!sourceBroadcast || !sourceBroadcast.recipients || sourceBroadcast.recipients.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Original broadcast or recipients not found to reuse'
        });
      }
      recipients = sourceBroadcast.recipients.map(r => ({ phone: r.phone, name: r.name || '' }));
      csvFileName = `Reused from: ${sourceBroadcast.title}`;

    } else {
      // Parse CSV file if uploaded
      const targetCsv = (req.files && req.files.csvFile && req.files.csvFile[0]) ? req.files.csvFile[0] : (req.file || null);
      if (targetCsv) {
        recipients = await parseCSVFile(targetCsv.path);
        
        if (recipients.length === 0) {
          await fs.unlink(targetCsv.path).catch(() => {});
          return res.status(400).json({
            success: false,
            error: 'No valid recipients found in CSV file'
          });
        }
        csvFileName = targetCsv.originalname;
      } else {
        return res.status(400).json({
          success: false,
          error: 'CSV file with recipients is required'
        });
      }
    }

    // Check broadcast message quota
    const maxMessages = subscriptionService.getPlanLimit(req.admin.subscriptionPlan, 'maxBroadcastMessages');
    const messagesUsed = req.admin.broadcastMessagesUsed || 0;
    if (maxMessages !== -1 && maxMessages !== Infinity && (messagesUsed + recipients.length) > maxMessages) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      return res.status(403).json({
        success: false,
        error: `This campaign (${recipients.length} recipients) exceeds your monthly broadcast message quota. You have used ${messagesUsed.toLocaleString()}/${maxMessages.toLocaleString()} broadcast messages.`
      });
    }

    let finalTemplateName = req.body.templateName || null;
    let finalTemplateLanguage = req.body.templateLanguage || 'en';
    let finalTemplateParams = req.body.templateParams ? (Array.isArray(req.body.templateParams) ? req.body.templateParams : [req.body.templateParams]) : [];

    const Template = require('../../models/Template');
    if (req.body.templateId) {
      const foundTpl = await Template.findById(req.body.templateId).catch(() => null);
      if (foundTpl) {
        finalTemplateName = foundTpl.name;
        finalTemplateLanguage = foundTpl.language || 'en';
      }
    }

    if (!finalTemplateName) {
      const approvedTemplates = await Template.find({ adminId: req.admin._id, status: 'APPROVED' }).catch(() => []);
      const getKeywords = (txt) => (txt || '').toLowerCase().replace(/\{\{[^}]+\}\}/g, ' ').replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(w => w.length > 3);
      const msgWords = new Set(getKeywords(message));
      let maxScore = 0;

      for (const tpl of approvedTemplates) {
        const bodyComp = (tpl.components || []).find(c => c.type === 'BODY');
        if (bodyComp && bodyComp.text) {
          const tplWords = getKeywords(bodyComp.text);
          let score = 0;
          for (const w of tplWords) {
            if (msgWords.has(w)) score++;
          }
          if (score >= 3 && score > maxScore) {
            maxScore = score;
            finalTemplateName = tpl.name;
            finalTemplateLanguage = tpl.language || 'en';
          }
        }
      }
      if (finalTemplateName) {
        console.log(`✨ Auto-matched message to approved template "${finalTemplateName}" (score: ${maxScore})`);
      }
    }

    let headerImageUrl = req.body.headerImageUrl || null;
    const uploadedHeaderImg = req.files && req.files.headerImage ? req.files.headerImage[0] : null;
    const uploadedCsvFile = req.files && req.files.csvFile ? req.files.csvFile[0] : (req.file || null);

    if (uploadedHeaderImg) {
      const domain = process.env.BACKEND_URL || (req.protocol + '://' + req.get('host'));
      headerImageUrl = `${domain}/uploads/${uploadedHeaderImg.filename}`;
    }

    // Create broadcast
    const broadcast = new Broadcast({
      title,
      message,
      headerImageUrl,
      recipients: recipients.map(r => ({
        phone: r.phone,
        name: r.name || '',
        status: 'pending'
      })),
      totalRecipients: recipients.length,
      createdBy: req.admin._id,
      createdByName: req.admin.name,
      admin: req.admin._id,
      csvFileName: csvFileName,
      templateName: finalTemplateName,
      templateLanguage: finalTemplateLanguage,
      templateParams: finalTemplateParams
    });

    // Increment merchant broadcastCampaignsUsed
    const Admin = require('../../models/Admin');
    await Admin.findByIdAndUpdate(req.admin._id, { $inc: { broadcastCampaignsUsed: 1 } }).catch(() => {});

    // Handle scheduling
    if (scheduledFor) {
      const isScheduledAllowed = subscriptionService.isFeatureAllowed(req.admin.subscriptionPlan, 'scheduledBroadcasts');
      if (!isScheduledAllowed) {
        if (req.file) await fs.unlink(req.file.path).catch(() => {});
        return res.status(403).json({
          success: false,
          error: 'Scheduled Broadcasts are not available on your current plan. Please upgrade to Growth or Scale.'
        });
      }

      const scheduledDate = new Date(scheduledFor);
      const now = new Date();

      if (scheduledDate <= now) {
        if (req.file) await fs.unlink(req.file.path).catch(() => {});
        return res.status(400).json({
          success: false,
          error: 'Scheduled time must be in the future'
        });
      }

      broadcast.status = 'scheduled';
      broadcast.scheduledFor = scheduledDate;
      await broadcast.save();

      // Schedule the broadcast
      scheduleBroadcast(broadcast._id, scheduledDate);

      // Delete CSV file after processing
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }

      return res.status(201).json({
        success: true,
        message: `Broadcast scheduled for ${scheduledDate.toLocaleString()}`,
        data: {
          id: broadcast._id,
          title: broadcast.title,
          totalRecipients: broadcast.totalRecipients,
          scheduledFor: broadcast.scheduledFor,
          status: broadcast.status
        }
      });
    }

    // Send immediately
    await broadcast.save();

    // Delete CSV file after processing
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    // Add to queue
    await addBroadcastToQueue(broadcast._id);

    res.status(201).json({
      success: true,
      message: 'Broadcast started successfully',
      data: {
        id: broadcast._id,
        title: broadcast.title,
        totalRecipients: broadcast.totalRecipients,
        status: broadcast.status
      }
    });
  } catch (error) {
    // Delete uploaded file if error occurs
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }

    console.error('Error creating broadcast:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create broadcast',
      message: error.message
    });
  }
};

// Parse CSV file
async function parseCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const recipients = [];
    
    createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Support multiple column name variations
        const phone = row.phone || row.Phone || row.phoneNumber || row.PhoneNumber || row.number || row.Number;
        const name = row.name || row.Name || row.customerName || row.CustomerName || '';

        if (phone) {
          // Normalize phone number
          const normalizedPhone = phone.toString().trim().replace(/\s+/g, '');
          if (normalizedPhone) {
            recipients.push({
              phone: normalizedPhone,
              name: name.toString().trim()
            });
          }
        }
      })
      .on('end', () => {
        resolve(recipients);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

// Get all broadcasts
exports.getAllBroadcasts = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const query = { admin: req.admin._id };
    if (status) {
      query.status = status;
    }

    const broadcasts = await Broadcast.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    // Auto-correct any out-of-sync counts in database
    for (const b of broadcasts) {
      if (b.recipients && b.recipients.length > 0) {
        const realSent = b.recipients.filter(r => r.status === 'sent' || r.status === 'delivered' || r.status === 'read').length;
        const realFailed = b.recipients.filter(r => r.status === 'failed').length;
        if (b.sentCount !== realSent || b.failedCount !== realFailed) {
          b.sentCount = realSent;
          b.failedCount = realFailed;
          await b.save();
        }
      }
    }

    const count = await Broadcast.countDocuments(query);

    // Sanitize response to omit full recipients array for listing
    const sanitizedData = broadcasts.map(b => {
      const obj = b.toObject();
      delete obj.recipients;
      return obj;
    });

    res.json({
      success: true,
      data: sanitizedData,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    console.error('Error fetching broadcasts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch broadcasts'
    });
  }
};

// Get single broadcast by ID
exports.getBroadcastById = async (req, res) => {
  try {
    const broadcast = await Broadcast.findOne({
      _id: req.params.id,
      admin: req.admin._id
    });

    if (!broadcast) {
      return res.status(404).json({
        success: false,
        error: 'Broadcast not found'
      });
    }

    if (broadcast.recipients && broadcast.recipients.length > 0) {
      const realSent = broadcast.recipients.filter(r => r.status === 'sent' || r.status === 'delivered' || r.status === 'read').length;
      const realFailed = broadcast.recipients.filter(r => r.status === 'failed').length;
      if (broadcast.sentCount !== realSent || broadcast.failedCount !== realFailed) {
        broadcast.sentCount = realSent;
        broadcast.failedCount = realFailed;
        await broadcast.save();
      }
    }

    res.json({
      success: true,
      data: broadcast
    });
  } catch (error) {
    console.error('Error fetching broadcast:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch broadcast'
    });
  }
};

// Cancel broadcast
exports.cancelBroadcast = async (req, res) => {
  try {
    const broadcast = await Broadcast.findOne({
      _id: req.params.id,
      admin: req.admin._id
    });

    if (!broadcast) {
      return res.status(404).json({
        success: false,
        error: 'Broadcast not found'
      });
    }

    if (broadcast.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel completed broadcast'
      });
    }

    // Cancel scheduled broadcast
    if (broadcast.status === 'scheduled') {
      cancelScheduledBroadcast(broadcast._id);
    }

    broadcast.status = 'cancelled';
    await broadcast.save();

    res.json({
      success: true,
      message: 'Broadcast cancelled successfully',
      data: broadcast
    });
  } catch (error) {
    console.error('Error cancelling broadcast:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel broadcast'
    });
  }
};

// Send broadcast now (immediate dispatch)
exports.sendBroadcastNow = async (req, res) => {
  try {
    const broadcast = await Broadcast.findOne({
      _id: req.params.id,
      admin: req.admin._id
    });

    if (!broadcast) {
      return res.status(404).json({
        success: false,
        error: 'Broadcast not found'
      });
    }

    if (broadcast.status === 'completed' || broadcast.status === 'sending') {
      return res.status(400).json({
        success: false,
        error: `Broadcast is already ${broadcast.status}`
      });
    }

    // Cancel scheduled task if it was scheduled
    if (broadcast.status === 'scheduled') {
      cancelScheduledBroadcast(broadcast._id);
    }

    // Update status to sending and save
    broadcast.status = 'sending';
    await broadcast.save();

    // Trigger queue sending in background without blocking HTTP response
    addBroadcastToQueue(broadcast._id).catch((err) => {
      console.error('Error executing immediate background broadcast:', err);
    });

    res.json({
      success: true,
      message: 'Broadcast triggered successfully',
      data: broadcast
    });
  } catch (error) {
    console.error('Error triggering broadcast:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send broadcast'
    });
  }
};

// Delete broadcast
exports.deleteBroadcast = async (req, res) => {
  try {
    const broadcast = await Broadcast.findOne({
      _id: req.params.id,
      admin: req.admin._id
    });

    if (!broadcast) {
      return res.status(404).json({
        success: false,
        error: 'Broadcast not found'
      });
    }

    // Cancel if scheduled
    if (broadcast.status === 'scheduled') {
      cancelScheduledBroadcast(broadcast._id);
    }

    await Broadcast.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Broadcast deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting broadcast:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete broadcast'
    });
  }
};

// Get broadcast statistics
exports.getBroadcastStats = async (req, res) => {
  try {
    const adminQuery = { admin: req.admin._id };
    
    const total = await Broadcast.countDocuments(adminQuery);
    const scheduled = await Broadcast.countDocuments({ ...adminQuery, status: 'scheduled' });
    const sending = await Broadcast.countDocuments({ ...adminQuery, status: 'sending' });
    const completed = await Broadcast.countDocuments({ ...adminQuery, status: 'completed' });

    // Total messages sent
    const sentAgg = await Broadcast.aggregate([
      { $match: adminQuery },
      { $group: { _id: null, totalSent: { $sum: '$sentCount' } } }
    ]);
    const totalSent = sentAgg.length > 0 ? sentAgg[0].totalSent : 0;

    // Queue stats
    const queueStats = await getQueueStats();

    res.json({
      success: true,
      data: {
        total,
        scheduled,
        sending,
        completed,
        totalSent,
        queue: queueStats
      }
    });
  } catch (error) {
    console.error('Error fetching broadcast stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
};

// Reuse / fetch broadcast recipients for re-sending
exports.reuseBroadcast = async (req, res) => {
  try {
    const broadcast = await Broadcast.findOne({
      _id: req.params.id,
      admin: req.admin._id
    });

    if (!broadcast) {
      return res.status(404).json({
        success: false,
        error: 'Broadcast not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: broadcast._id,
        title: broadcast.title,
        csvFileName: broadcast.csvFileName,
        totalRecipients: broadcast.recipients ? broadcast.recipients.length : 0,
        recipients: (broadcast.recipients || []).map(r => ({ phone: r.phone, name: r.name || '' }))
      }
    });
  } catch (error) {
    console.error('Error reusing broadcast recipients:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch broadcast recipients for reuse'
    });
  }
};
