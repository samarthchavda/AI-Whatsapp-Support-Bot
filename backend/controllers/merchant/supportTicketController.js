const SupportTicket = require('../../models/SupportTicket');
const Counter = require('../../models/Counter');

/**
 * Generate sequential formatted Ticket ID (e.g., TKT-1001)
 */
async function generateTicketId() {
  const counter = await Counter.findByIdAndUpdate(
    'support_ticket_seq',
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const number = 1000 + counter.seq;
  return `TKT-${number}`;
}

/**
 * @desc    Create a new support ticket (Merchant)
 * @route   POST /api/support-tickets
 */
exports.createTicket = async (req, res) => {
  try {
    const { subject, category, priority, description, attachments = [] } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, error: 'Ticket subject is required' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, error: 'Problem description is required' });
    }

    const ticketId = await generateTicketId();

    const merchantName = req.admin.name || req.admin.companyName || 'Merchant';
    const merchantEmail = req.admin.email;
    const merchantPhone = req.admin.phoneNumber || req.admin.phone || '';

    const initialMessage = {
      sender: 'merchant',
      senderName: merchantName,
      message: description.trim(),
      attachments: Array.isArray(attachments) ? attachments : [],
      createdAt: new Date()
    };

    const newTicket = new SupportTicket({
      ticketId,
      admin: req.admin._id,
      merchantName,
      merchantEmail,
      merchantPhone,
      subject: subject.trim(),
      category: category || 'technical',
      priority: priority || 'medium',
      status: 'open',
      description: description.trim(),
      attachments: Array.isArray(attachments) ? attachments : [],
      messages: [initialMessage]
    });

    await newTicket.save();

    res.status(201).json({
      success: true,
      message: `Support ticket ${ticketId} created successfully. Our team will review it shortly.`,
      data: newTicket
    });
  } catch (error) {
    console.error('Error creating support ticket:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to create support ticket' });
  }
};

/**
 * @desc    Get merchant's support tickets with stats & pagination
 * @route   GET /api/support-tickets
 */
exports.getMyTickets = async (req, res) => {
  try {
    const { status, category, priority, search, page = 1, limit = 15 } = req.query;

    const query = { admin: req.admin._id };

    if (status && status !== 'all') {
      query.status = status;
    }
    if (category && category !== 'all') {
      query.category = category;
    }
    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { ticketId: searchRegex },
        { subject: searchRegex },
        { description: searchRegex }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const parsedLimit = parseInt(limit, 10);

    const [tickets, totalCount, statsAgg] = await Promise.all([
      SupportTicket.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      SupportTicket.countDocuments(query),
      SupportTicket.aggregate([
        { $match: { admin: req.admin._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Format stats summary
    const stats = {
      total: 0,
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0
    };

    statsAgg.forEach(item => {
      stats.total += item.count;
      if (stats[item._id] !== undefined) {
        stats[item._id] = item.count;
      }
    });

    res.json({
      success: true,
      data: tickets,
      stats,
      pagination: {
        page: parseInt(page, 10),
        limit: parsedLimit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / parsedLimit) || 1
      }
    });
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch tickets' });
  }
};

/**
 * @desc    Get single ticket details with complete conversation thread
 * @route   GET /api/support-tickets/:id
 */
exports.getTicketDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const query = {
      $or: [
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
        { ticketId: id }
      ].filter(item => item._id !== null || item.ticketId !== undefined)
    };

    // If not super admin, restrict to tenant
    if (req.admin.role !== 'super_admin') {
      query.admin = req.admin._id;
    }

    const ticket = await SupportTicket.findOne(query);

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Support ticket not found' });
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    console.error('Error fetching ticket details:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch ticket' });
  }
};

/**
 * @desc    Add reply message to ticket thread
 * @route   POST /api/support-tickets/:id/reply
 */
exports.addReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, attachments = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Reply message cannot be empty' });
    }

    const query = {
      $or: [
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
        { ticketId: id }
      ].filter(item => item._id !== null || item.ticketId !== undefined)
    };

    if (req.admin.role !== 'super_admin') {
      query.admin = req.admin._id;
    }

    const ticket = await SupportTicket.findOne(query);

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Support ticket not found' });
    }

    const isSuperAdmin = req.admin.role === 'super_admin';
    const senderRole = isSuperAdmin ? 'support_agent' : 'merchant';
    const senderName = isSuperAdmin 
      ? (req.admin.name || 'Kwickbot Support Engineer')
      : (req.admin.name || 'Merchant');

    const newReply = {
      sender: senderRole,
      senderName,
      message: message.trim(),
      attachments: Array.isArray(attachments) ? attachments : [],
      createdAt: new Date()
    };

    ticket.messages.push(newReply);

    // Reopen ticket if merchant replied to resolved/closed ticket
    if (!isSuperAdmin && (ticket.status === 'resolved' || ticket.status === 'closed')) {
      ticket.status = 'open';
    } else if (isSuperAdmin && ticket.status === 'open') {
      ticket.status = 'in_progress';
    }

    ticket.updatedAt = new Date();
    await ticket.save();

    res.json({
      success: true,
      message: 'Reply sent successfully',
      data: ticket
    });
  } catch (error) {
    console.error('Error adding reply to support ticket:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to send reply' });
  }
};

/**
 * @desc    Close or resolve a ticket (Merchant or Super Admin)
 * @route   PATCH /api/support-tickets/:id/close
 */
exports.closeTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNote } = req.body;

    const query = {
      $or: [
        { _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null },
        { ticketId: id }
      ].filter(item => item._id !== null || item.ticketId !== undefined)
    };

    if (req.admin.role !== 'super_admin') {
      query.admin = req.admin._id;
    }

    const ticket = await SupportTicket.findOne(query);

    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Support ticket not found' });
    }

    ticket.status = 'resolved';
    ticket.resolvedAt = new Date();
    if (resolutionNote) {
      ticket.resolutionNote = resolutionNote;
    }

    ticket.messages.push({
      sender: 'system',
      senderName: 'System',
      message: `Ticket marked as resolved by ${req.admin.name || 'user'}.`,
      createdAt: new Date()
    });

    await ticket.save();

    res.json({
      success: true,
      message: `Ticket ${ticket.ticketId} marked as resolved.`,
      data: ticket
    });
  } catch (error) {
    console.error('Error closing support ticket:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to close ticket' });
  }
};

/**
 * @desc    Super Admin: Get all support tickets across all merchants
 * @route   GET /api/super-admin/support-tickets
 */
exports.getAllTicketsSuperAdmin = async (req, res) => {
  try {
    const { status, category, priority, search, page = 1, limit = 20 } = req.query;

    const query = {};

    if (status && status !== 'all') query.status = status;
    if (category && category !== 'all') query.category = category;
    if (priority && priority !== 'all') query.priority = priority;

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { ticketId: searchRegex },
        { subject: searchRegex },
        { merchantEmail: searchRegex },
        { merchantName: searchRegex }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const parsedLimit = parseInt(limit, 10);

    const [tickets, totalCount] = await Promise.all([
      SupportTicket.find(query)
        .populate('admin', 'name email companyName subscriptionPlan')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      SupportTicket.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: tickets,
      pagination: {
        page: parseInt(page, 10),
        limit: parsedLimit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / parsedLimit) || 1
      }
    });
  } catch (error) {
    console.error('Error fetching all tickets for super admin:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch tickets' });
  }
};
