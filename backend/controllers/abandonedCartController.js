const AbandonedCart = require('../models/AbandonedCart');
const webhookService = require('../services/webhookService');

// Get all abandoned carts for tenant
exports.getAllAbandonedCarts = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    
    let query = { admin: req.admin._id };
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      query.$or = [
        { customerName: new RegExp(search, 'i') },
        { customerPhone: new RegExp(search, 'i') },
        { customerEmail: new RegExp(search, 'i') }
      ];
    }

    const [carts, count] = await Promise.all([
      AbandonedCart.find(query)
        .sort({ abandonedAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean()
        .exec(),
      AbandonedCart.countDocuments(query)
    ]);

    res.json({
      success: true,
      carts,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get stats for abandoned carts
exports.getAbandonedCartStats = async (req, res) => {
  try {
    const adminId = req.admin._id;

    // Get total count and counts by status
    const totalCount = await AbandonedCart.countDocuments({ admin: adminId });
    const recoveredCount = await AbandonedCart.countDocuments({ admin: adminId, status: 'recovered' });
    const reminderSentCount = await AbandonedCart.countDocuments({ admin: adminId, status: 'reminder_sent' });
    const abandonedCount = await AbandonedCart.countDocuments({ admin: adminId, status: 'abandoned' });

    // Aggregation for total values
    const revenueStats = await AbandonedCart.aggregate([
      { $match: { admin: adminId } },
      {
        $group: {
          _id: null,
          totalAbandonedRevenue: {
            $sum: {
              $cond: [{ $ne: ['$status', 'recovered'] }, '$totalAmount', 0]
            }
          },
          totalRecoveredRevenue: {
            $sum: {
              $cond: [{ $eq: ['$status', 'recovered'] }, '$totalAmount', 0]
            }
          }
        }
      }
    ]);

    const stats = revenueStats[0] || { totalAbandonedRevenue: 0, totalRecoveredRevenue: 0 };
    const recoveryRate = totalCount > 0 ? (recoveredCount / totalCount) * 100 : 0;

    res.json({
      success: true,
      stats: {
        totalCarts: totalCount,
        recoveredCarts: recoveredCount,
        reminderSentCarts: reminderSentCount,
        abandonedCarts: abandonedCount,
        recoveryRate: parseFloat(recoveryRate.toFixed(2)),
        recoveredRevenue: stats.totalRecoveredRevenue,
        abandonedRevenue: stats.totalAbandonedRevenue,
        totalRevenue: stats.totalRecoveredRevenue + stats.totalAbandonedRevenue
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Send manual recovery message
exports.sendManualReminder = async (req, res) => {
  try {
    const cart = await AbandonedCart.findOne({
      _id: req.params.id,
      admin: req.admin._id
    });

    if (!cart) {
      return res.status(404).json({ success: false, error: 'Abandoned cart not found' });
    }

    if (cart.status === 'recovered') {
      return res.status(400).json({ success: false, error: 'Cart has already been recovered' });
    }

    console.log(`📱 Triggering manual cart recovery reminder for ${cart.customerPhone}`);
    const result = await webhookService.sendCartRecoveryMessage(cart);

    if (result.success) {
      cart.status = 'reminder_sent';
      cart.reminderSentAt = new Date();
      await cart.save();

      return res.json({
        success: true,
        message: 'Reminder sent successfully'
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to send recovery message'
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
