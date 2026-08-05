const MerchantProductLead = require('../../models/MerchantProductLead');

/**
 * Get all product inquiry leads for merchant
 */
exports.getLeads = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const { status, page = 1, limit = 25, search = '' } = req.query;

    // Check Plan Gating: Available for 'growth' and 'scale' plans only (Not 'starter')
    if (req.admin.subscriptionPlan === 'starter') {
      return res.status(403).json({
        success: false,
        error: 'PLAN_RESTRICTED',
        message: 'WhatsApp Product Leads CRM is exclusively available on Growth and Scale plans. Upgrade your plan to unlock full lead management.',
        plan: req.admin.subscriptionPlan
      });
    }

    const query = { adminId };
    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { customerPhone: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { productName: { $regex: search, $options: 'i' } },
        { userMessage: { $regex: search, $options: 'i' } }
      ];
    }

    const leads = await MerchantProductLead.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await MerchantProductLead.countDocuments(query);
    const newCount = await MerchantProductLead.countDocuments({ adminId, status: 'new' });
    const contactedCount = await MerchantProductLead.countDocuments({ adminId, status: 'contacted' });
    const convertedCount = await MerchantProductLead.countDocuments({ adminId, status: 'converted' });

    res.json({
      success: true,
      data: leads,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      metrics: {
        total,
        new: newCount,
        contacted: contactedCount,
        converted: convertedCount
      }
    });
  } catch (error) {
    console.error('Error fetching merchant leads:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leads' });
  }
};

/**
 * Update lead status
 */
exports.updateLeadStatus = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const { id } = req.params;
    const { status } = req.body;

    const lead = await MerchantProductLead.findOne({ _id: id, adminId });
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    lead.status = status;
    lead.updatedAt = Date.now();
    await lead.save();

    res.json({ success: true, message: 'Lead status updated successfully', data: lead });
  } catch (error) {
    console.error('Error updating lead status:', error);
    res.status(500).json({ success: false, error: 'Failed to update lead status' });
  }
};

/**
 * Delete a lead
 */
exports.deleteLead = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const { id } = req.params;

    const lead = await MerchantProductLead.findOneAndDelete({ _id: id, adminId });
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ success: false, error: 'Failed to delete lead' });
  }
};
