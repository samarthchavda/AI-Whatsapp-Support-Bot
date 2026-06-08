const Broadcast = require('../models/Broadcast');
const { addBroadcastToQueue, getQueueStats } = require('../services/broadcastQueue');
const { scheduleBroadcast, cancelScheduledBroadcast } = require('../services/broadcastScheduler');
const fs = require('fs').promises;
const csv = require('csv-parser');
const { createReadStream } = require('fs');

// Create new broadcast
exports.createBroadcast = async (req, res) => {
  try {
    const { title, message, scheduledFor } = req.body;
    let recipients = [];

    // Validate required fields
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Title and message are required'
      });
    }

    // Parse CSV file if uploaded
    if (req.file) {
      recipients = await parseCSVFile(req.file.path);
      
      if (recipients.length === 0) {
        await fs.unlink(req.file.path);
        return res.status(400).json({
          success: false,
          error: 'No valid recipients found in CSV file'
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'CSV file with recipients is required'
      });
    }

    // Create broadcast
    const broadcast = new Broadcast({
      title,
      message,
      recipients: recipients.map(r => ({
        phone: r.phone,
        name: r.name || '',
        status: 'pending'
      })),
      totalRecipients: recipients.length,
      createdBy: req.admin._id,
      createdByName: req.admin.name,
      admin: req.admin._id,
      csvFileName: req.file.originalname
    });

    // Handle scheduling
    if (scheduledFor) {
      const scheduledDate = new Date(scheduledFor);
      const now = new Date();

      if (scheduledDate <= now) {
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
      await fs.unlink(req.file.path);

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
    await fs.unlink(req.file.path);

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
      .select('-recipients') // Don't send full recipient list
      .exec();

    const count = await Broadcast.countDocuments(query);

    res.json({
      success: true,
      data: broadcasts,
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
