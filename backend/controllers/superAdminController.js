const Admin = require('../models/Admin');
const Conversation = require('../models/Conversation');
const Order = require('../models/Order');
const Broadcast = require('../models/Broadcast');

// Middleware to check super admin role
exports.requireSuperAdmin = (req, res, next) => {
  if (req.admin.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Super admin privileges required.'
    });
  }
  next();
};

// Get all users (business owners)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await Admin.find({ role: { $ne: 'super_admin' } })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
};

// Create new user
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, subscriptionPlan, subscriptionStatus, monthlyPrice, geminiTokensLimit } = req.body;

    // Check if user already exists
    const existingUser = await Admin.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Create new user
    const newUser = new Admin({
      name,
      email,
      password, // Will be hashed by pre-save hook
      role: 'admin', // Regular admin/client role
      subscriptionPlan: subscriptionPlan || 'starter',
      subscriptionStatus: subscriptionStatus || 'trial',
      monthlyPrice: monthlyPrice || 29,
      geminiTokensLimit: geminiTokensLimit || 10000,
      geminiTokensUsed: 0,
      isActive: true,
      subscriptionStartDate: new Date()
    });

    await newUser.save();

    // Return user without password
    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create user'
    });
  }
};

// Get user details by ID
exports.getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await Admin.findById(id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get user statistics
    const totalConversations = await Conversation.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalBroadcasts = await Broadcast.countDocuments();

    // Calculate token usage percentage
    const tokenUsagePercentage = user.geminiTokensLimit > 0
      ? ((user.geminiTokensUsed / user.geminiTokensLimit) * 100).toFixed(1)
      : 0;

    // Calculate days until subscription ends
    let daysUntilExpiry = null;
    if (user.subscriptionEndDate) {
      const now = new Date();
      const endDate = new Date(user.subscriptionEndDate);
      daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    }

    res.json({
      success: true,
      data: {
        user,
        stats: {
          totalConversations,
          totalOrders,
          totalBroadcasts,
          tokenUsagePercentage,
          daysUntilExpiry
        }
      }
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user details'
    });
  }
};

// Update user subscription
exports.updateUserSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      subscriptionPlan, 
      subscriptionStatus, 
      monthlyPrice, 
      customDiscount,
      geminiTokensLimit 
    } = req.body;

    const user = await Admin.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update subscription fields
    if (subscriptionPlan) user.subscriptionPlan = subscriptionPlan;
    if (subscriptionStatus) user.subscriptionStatus = subscriptionStatus;
    if (monthlyPrice !== undefined) user.monthlyPrice = monthlyPrice;
    if (customDiscount !== undefined) user.customDiscount = customDiscount;
    if (geminiTokensLimit !== undefined) user.geminiTokensLimit = geminiTokensLimit;

    // Set subscription dates
    if (subscriptionStatus === 'active' && !user.subscriptionStartDate) {
      user.subscriptionStartDate = new Date();
    }

    // Set end date (30 days from now for monthly plans)
    if (subscriptionStatus === 'active') {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
      user.subscriptionEndDate = endDate;
    }

    await user.save();

    res.json({
      success: true,
      message: 'User subscription updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error updating user subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user subscription'
    });
  }
};

// Reset user token usage
exports.resetUserTokens = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await Admin.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    user.geminiTokensUsed = 0;
    user.lastTokenReset = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'User token usage reset successfully',
      data: user
    });
  } catch (error) {
    console.error('Error resetting user tokens:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset user tokens'
    });
  }
};

// Toggle user active status
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await Admin.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: user
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle user status'
    });
  }
};

// Get global analytics
exports.getGlobalAnalytics = async (req, res) => {
  try {
    // Get all non-super-admin users
    const allUsers = await Admin.find({ role: { $ne: 'super_admin' } });

    // Calculate total revenue (monthly)
    const totalRevenue = allUsers.reduce((sum, user) => {
      if (user.subscriptionStatus === 'active') {
        const price = user.monthlyPrice || 0;
        const discount = user.customDiscount || 0;
        const finalPrice = price - (price * discount / 100);
        return sum + finalPrice;
      }
      return sum;
    }, 0);

    // Count active bots (users with WhatsApp connected)
    const totalActiveBots = allUsers.filter(user => user.whatsappConnected).length;

    // Count total messages processed
    const totalMessagesProcessed = allUsers.reduce((sum, user) => {
      return sum + (user.totalMessagesProcessed || 0);
    }, 0);

    // Count users by plan
    const usersByPlan = {
      starter: allUsers.filter(u => u.subscriptionPlan === 'starter').length,
      professional: allUsers.filter(u => u.subscriptionPlan === 'professional').length,
      enterprise: allUsers.filter(u => u.subscriptionPlan === 'enterprise').length,
      custom: allUsers.filter(u => u.subscriptionPlan === 'custom').length
    };

    // Count users by status
    const usersByStatus = {
      active: allUsers.filter(u => u.subscriptionStatus === 'active').length,
      trial: allUsers.filter(u => u.subscriptionStatus === 'trial').length,
      inactive: allUsers.filter(u => u.subscriptionStatus === 'inactive').length,
      cancelled: allUsers.filter(u => u.subscriptionStatus === 'cancelled').length
    };

    // Total Gemini tokens used across all users
    const totalGeminiTokens = allUsers.reduce((sum, user) => {
      return sum + (user.geminiTokensUsed || 0);
    }, 0);

    // Get recent signups (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentSignups = allUsers.filter(user => 
      new Date(user.createdAt) >= sevenDaysAgo
    ).length;

    res.json({
      success: true,
      data: {
        totalRevenue: totalRevenue.toFixed(2),
        totalActiveBots,
        totalMessagesProcessed,
        totalUsers: allUsers.length,
        totalGeminiTokens,
        recentSignups,
        usersByPlan,
        usersByStatus
      }
    });
  } catch (error) {
    console.error('Error fetching global analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch global analytics'
    });
  }
};

// Create pricing plan (update user with custom plan)
exports.createCustomPlan = async (req, res) => {
  try {
    const { userId, planName, monthlyPrice, geminiTokensLimit, features } = req.body;

    const user = await Admin.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    user.subscriptionPlan = 'custom';
    user.monthlyPrice = monthlyPrice;
    user.geminiTokensLimit = geminiTokensLimit;
    user.businessName = planName; // Store custom plan name in business name
    
    await user.save();

    res.json({
      success: true,
      message: 'Custom plan created successfully',
      data: user
    });
  } catch (error) {
    console.error('Error creating custom plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create custom plan'
    });
  }
};

// Apply discount to user
exports.applyDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const { discount } = req.body;

    if (discount < 0 || discount > 100) {
      return res.status(400).json({
        success: false,
        error: 'Discount must be between 0 and 100'
      });
    }

    const user = await Admin.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    user.customDiscount = discount;
    await user.save();

    res.json({
      success: true,
      message: 'Discount applied successfully',
      data: user
    });
  } catch (error) {
    console.error('Error applying discount:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply discount'
    });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await Admin.findByIdAndDelete(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
};

// Get all pricing plans
exports.getAllPlans = async (req, res) => {
  try {
    const PricingPlan = require('../models/PricingPlan');
    const plans = await PricingPlan.find({ isActive: true }).sort({ monthlyPrice: 1 });

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch plans'
    });
  }
};

// Create or update pricing plan
exports.createOrUpdatePlan = async (req, res) => {
  try {
    const PricingPlan = require('../models/PricingPlan');
    const { id } = req.params;
    const planData = req.body;

    let plan;
    if (id) {
      // Update existing plan
      plan = await PricingPlan.findByIdAndUpdate(id, planData, { new: true });
    } else {
      // Create new plan
      plan = new PricingPlan(planData);
      await plan.save();
    }

    res.json({
      success: true,
      message: id ? 'Plan updated successfully' : 'Plan created successfully',
      data: plan
    });
  } catch (error) {
    console.error('Error saving plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save plan'
    });
  }
};

// Delete pricing plan
exports.deletePlan = async (req, res) => {
  try {
    const PricingPlan = require('../models/PricingPlan');
    const { id } = req.params;

    const plan = await PricingPlan.findByIdAndDelete(id);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    res.json({
      success: true,
      message: 'Plan deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete plan'
    });
  }
};
