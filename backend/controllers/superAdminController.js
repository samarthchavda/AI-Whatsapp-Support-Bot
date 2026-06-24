const Admin = require('../models/Admin');
const Conversation = require('../models/Conversation');
const Order = require('../models/Order');
const Broadcast = require('../models/Broadcast');
const Lead = require('../models/Lead');
const Announcement = require('../models/Announcement');
const emailService = require('../services/emailService');
const { getFrontendUrl } = require('../services/urlHelper');
const PageVisit = require('../models/PageVisit');
const whatsappCloudAPI = require('../services/whatsappCloudAPI');
const crypto = require('crypto');

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

// Get all users (business owners & admins)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await Admin.find({})
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
    const { name, email, password, role, subscriptionPlan, subscriptionStatus, monthlyPrice, geminiTokensLimit, webBotEnabled, shopifyEnabled, woocommerceEnabled } = req.body;

    // Check if user already exists
    const existingUser = await Admin.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    const validatedRole = ['admin', 'super_admin'].includes(role) ? role : 'admin';

    // Create new user
    const newUser = new Admin({
      name,
      email,
      password, // Will be hashed by pre-save hook
      role: validatedRole,
      subscriptionPlan: subscriptionPlan || 'starter',
      subscriptionStatus: subscriptionStatus || 'trial',
      monthlyPrice: monthlyPrice || 2999,
      geminiTokensLimit: geminiTokensLimit || 10000,
      geminiTokensUsed: 0,
      webBotEnabled: webBotEnabled === true || webBotEnabled === 'true',
      shopifyEnabled: shopifyEnabled !== false && shopifyEnabled !== 'false',
      woocommerceEnabled: woocommerceEnabled !== false && woocommerceEnabled !== 'false',
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
    const totalConversations = await Conversation.countDocuments({ admin: id });
    const totalOrders = await Order.countDocuments({ admin: id });
    const totalBroadcasts = await Broadcast.countDocuments({ admin: id });

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

    // Send email notification to user
    try {
      if (subscriptionStatus === 'active') {
        const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Inter', Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 700; }
            .content { padding: 40px; }
            .content h2 { color: #1f2937; font-size: 24px; margin-bottom: 16px; }
            .content p { color: #6b7280; line-height: 1.6; margin-bottom: 16px; }
            .details { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 24px 0; }
            .details-item { margin-bottom: 10px; font-size: 15px; }
            .details-label { font-weight: 600; color: #4b5563; }
            .details-value { color: #1f2937; }
            .footer { background: #f9fafb; padding: 24px; text-align: center; color: #9ca3af; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Subscription Activated</h1>
            </div>
            <div class="content">
              <h2>Hi ${user.name || 'Merchant'},</h2>
              <p>Your Kwickbot AI subscription has been successfully updated by the system administrator.</p>
              <p>Your account is now fully active with premium access to the configured plan features.</p>
              
              <div class="details">
                <h3 style="margin-top: 0; color: #1f2937; font-size: 16px;">Subscription Summary:</h3>
                <div class="details-item">
                  <span class="details-label">Plan Name:</span>
                  <span class="details-value">${user.subscriptionPlan ? user.subscriptionPlan.toUpperCase() : 'N/A'} Plan</span>
                </div>
                <div class="details-item">
                  <span class="details-label">Status:</span>
                  <span class="details-value" style="color: #10b981; font-weight: 600;">Active</span>
                </div>
                <div class="details-item">
                  <span class="details-label">Monthly Price:</span>
                  <span class="details-value">₹${user.monthlyPrice || 0} INR</span>
                </div>
                <div class="details-item">
                  <span class="details-label">Gemini Tokens Limit:</span>
                  <span class="details-value">${(user.geminiTokensLimit || 0).toLocaleString()} / month</span>
                </div>
              </div>
              
              <p style="text-align: center; margin: 30px 0;">
                <a href="${getFrontendUrl(req)}/dashboard" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">Go to Dashboard</a>
              </p>
              
              <p>If you have any questions or need billing support, feel free to reply directly to this email.</p>
              <p>Best regards,<br><strong>Kwickbot Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Kwickbot. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
        `;

        const emailText = `Hi ${user.name || 'Merchant'},\n\nYour Kwickbot AI subscription has been successfully updated by the system administrator.\n\nSubscription Summary:\n- Plan Name: ${user.subscriptionPlan ? user.subscriptionPlan.toUpperCase() : 'N/A'} Plan\n- Status: Active\n- Monthly Price: ₹${user.monthlyPrice || 0} INR\n- Gemini Tokens Limit: ${(user.geminiTokensLimit || 0).toLocaleString()} / month\n\nLogin to your dashboard here: ${getFrontendUrl(req)}/dashboard\n\nBest regards,\nKwickbot Team`;

        await emailService.sendEmail({
          to: user.email,
          subject: 'Your Kwickbot AI Subscription is Active!',
          html: emailHtml,
          text: emailText
        });
        console.log(`✅ Subscription activation email sent to ${user.email}`);
      }
    } catch (emailErr) {
      console.error('❌ Error sending subscription update email:', emailErr.message);
    }

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

// Toggle user WhatsApp Web Bot scanner access
exports.toggleUserWebBot = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await Admin.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    user.webBotEnabled = !user.webBotEnabled;
    await user.save();

    res.json({
      success: true,
      message: `WhatsApp Web Bot scanner ${user.webBotEnabled ? 'enabled' : 'disabled'} successfully`,
      data: user
    });
  } catch (error) {
    console.error('Error toggling user web bot status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle web bot status'
    });
  }
};

// Toggle user Shopify access
exports.toggleUserShopify = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await Admin.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    user.shopifyEnabled = user.shopifyEnabled === false ? true : false;
    await user.save();

    res.json({
      success: true,
      message: `Shopify integration access ${user.shopifyEnabled ? 'enabled' : 'disabled'} successfully`,
      data: user
    });
  } catch (error) {
    console.error('Error toggling user Shopify status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle Shopify status'
    });
  }
};

// Toggle user WooCommerce access
exports.toggleUserWooCommerce = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await Admin.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    user.woocommerceEnabled = user.woocommerceEnabled === false ? true : false;
    await user.save();

    res.json({
      success: true,
      message: `WooCommerce integration access ${user.woocommerceEnabled ? 'enabled' : 'disabled'} successfully`,
      data: user
    });
  } catch (error) {
    console.error('Error toggling user WooCommerce status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle WooCommerce status'
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

    // Blended rate: $0.15 per million tokens (Gemini 1.5 Flash input/output mix)
    const estimatedGeminiCost = totalGeminiTokens * 0.00000015;

    // Get current Gemini funds added setting from database
    const GlobalSettings = require('../models/GlobalSettings');
    const budgetSetting = await GlobalSettings.findOne({ key: 'geminiApiFundsAdded' });
    const geminiApiFundsAdded = budgetSetting ? Number(budgetSetting.value) : 0;
    const remainingFunds = geminiApiFundsAdded - estimatedGeminiCost;

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
        estimatedGeminiCost: Number(estimatedGeminiCost.toFixed(4)),
        geminiApiFundsAdded: Number(geminiApiFundsAdded.toFixed(2)),
        remainingFunds: Number(remainingFunds.toFixed(4)),
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

// Get website traffic analytics
exports.getTrafficAnalytics = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Total Visits
    const totalVisits = await PageVisit.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    // 2. Daily visits (last 30 days)
    const dailyVisits = await PageVisit.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Fill in missing days
    const dailyVisitsData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const found = dailyVisits.find(v => v._id === dateStr);
      dailyVisitsData.push({
        date: dateStr,
        day: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        count: found ? found.count : 0
      });
    }

    // 3. Top pages
    const topPages = await PageVisit.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: '$pagePath',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // 4. Top Referrers
    const topReferrers = await PageVisit.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          referrer: { $ne: null, $ne: '', $ne: 'Direct' }
        }
      },
      {
        $group: {
          _id: '$referrer',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    // 5. Unique visitors (count unique IP addresses)
    const uniqueIPsResult = await PageVisit.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: '$ipAddress'
        }
      },
      {
        $count: 'count'
      }
    ]);
    const uniqueVisitors = uniqueIPsResult.length > 0 ? uniqueIPsResult[0].count : 0;

    res.json({
      success: true,
      data: {
        totalVisits,
        uniqueVisitors,
        dailyVisits: dailyVisitsData,
        topPages: topPages.map(item => ({ page: item._id, count: item.count })),
        topReferrers: topReferrers.map(item => ({ referrer: item._id, count: item.count }))
      }
    });
  } catch (error) {
    console.error('Error fetching traffic analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch traffic analytics'
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

// Global settings
const GlobalSettings = require('../models/GlobalSettings');

exports.getGlobalSettings = async (req, res) => {
  try {
    const settings = await GlobalSettings.find({});
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.key] = s.value;
    });

    // Default value if not set
    if (settingsMap['webBotEnabled'] === undefined) {
      settingsMap['webBotEnabled'] = false;
    }
    if (settingsMap['geminiApiFundsAdded'] === undefined) {
      settingsMap['geminiApiFundsAdded'] = 0;
    }

    res.json({
      success: true,
      data: settingsMap
    });
  } catch (error) {
    console.error('Error fetching global settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    });
  }
};

exports.updateGlobalSettings = async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid settings object'
      });
    }

    const whatsappWebBot = require('../services/whatsappWebBot');

    for (const [key, value] of Object.entries(settings)) {
      if (value === '' || value === null || value === undefined) {
        await GlobalSettings.deleteOne({ key });
      } else {
        await GlobalSettings.findOneAndUpdate(
          { key },
          { key, value },
          { upsert: true, new: true }
        );
      }

      // Handle dynamic activation/deactivation of WhatsApp Web Bot
      if (key === 'webBotEnabled') {
        if (value === true) {
          if (whatsappWebBot && !whatsappWebBot.isReady) {
            console.log('📱 Enabling WhatsApp Web Bot dynamically...');
            whatsappWebBot.initialize(global.io);
          }
        } else {
          if (whatsappWebBot && whatsappWebBot.client) {
            console.log('📱 Disabling WhatsApp Web Bot dynamically...');
            try {
              whatsappWebBot.isReady = false;
              whatsappWebBot.status = 'disconnected';
              await whatsappWebBot.client.destroy();
              whatsappWebBot.client = null;
            } catch (err) {
              console.error('Error destroying WhatsApp Web Bot client:', err.message);
            }
          }
        }
      }
    }

    res.json({
      success: true,
      message: 'Global settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating global settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
};

// Impersonate merchant user
exports.impersonateUser = async (req, res) => {
  try {
    const jwt = require('jsonwebtoken');
    const actor = req.admin; // The super admin
    const { id } = req.params; // The target merchant ID

    const targetUser = await Admin.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'Target merchant not found'
      });
    }

    if (targetUser.role === 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Cannot impersonate another Super Admin'
      });
    }

    // Sign a temporary access token for the target user using ACCESS_TOKEN_SECRET
    const getAccessTokenSecret = () => process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    
    // Include isImpersonated flag in JWT payload
    const token = jwt.sign(
      { 
        id: targetUser._id, 
        tokenType: 'access', 
        isImpersonated: true,
        impersonatorEmail: actor.email 
      },
      getAccessTokenSecret(),
      { expiresIn: '1h' } // Give impersonation 1 hour duration
    );

    // Log this action to audit logs
    const { logAction } = require('../services/auditLogService');
    await logAction({
      action: 'user_impersonation',
      actor,
      target: targetUser.email,
      details: {
        targetName: targetUser.name,
        targetId: targetUser._id
      },
      req
    });

    res.json({
      success: true,
      message: `Impersonating user ${targetUser.email}`,
      data: {
        token,
        user: {
          _id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role
        }
      }
    });

  } catch (error) {
    console.error('Error in user impersonation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to impersonate user'
    });
  }
};

// Get audit logs
exports.getAuditLogs = async (req, res) => {
  try {
    const AuditLog = require('../models/AuditLog');
    const logs = await AuditLog.find({})
      .sort({ createdAt: -1 })
      .limit(100); // Limit to top 100 logs for performance

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs'
    });
  }
};

// Export database backup as JSON
exports.exportDatabase = async (req, res) => {
  try {
    const actor = req.admin; // The super admin triggering this
    const AILog = require('../models/AILog');
    const GlobalSettings = require('../models/GlobalSettings');
    const AuditLog = require('../models/AuditLog');

    // Fetch all collections
    const [admins, conversations, orders, broadcasts, ailogs, globalSettings, auditlogs] = await Promise.all([
      Admin.find({}),
      Conversation.find({}),
      Order.find({}),
      Broadcast.find({}),
      AILog.find({}),
      GlobalSettings.find({}),
      AuditLog.find({})
    ]);

    const backupData = {
      version: '1.0.0',
      exportedAt: new Date(),
      actorEmail: actor.email,
      collections: {
        admins,
        conversations,
        orders,
        broadcasts,
        ailogs,
        globalSettings,
        auditlogs
      }
    };

    // Log this action to audit logs
    const { logAction } = require('../services/auditLogService');
    await logAction({
      action: 'db_backup_exported',
      actor,
      target: 'System Database',
      details: {
        recordCounts: {
          admins: admins.length,
          conversations: conversations.length,
          orders: orders.length,
          broadcasts: broadcasts.length,
          ailogs: ailogs.length,
          globalSettings: globalSettings.length,
          auditlogs: auditlogs.length
        }
      },
      req
    });

    // Send JSON file response
    const filename = `db_backup_${new Date().toISOString().slice(0,10)}_${Date.now()}.json`;
    res.setHeader('Content-disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-type', 'application/json');
    res.write(JSON.stringify(backupData, null, 2));
    res.end();

  } catch (error) {
    console.error('Error exporting database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export database backup'
    });
  }
};

// Restore database backup from JSON
exports.importDatabase = async (req, res) => {
  try {
    const fs = require('fs');
    const actor = req.admin; // The super admin triggering this
    const AILog = require('../models/AILog');
    const GlobalSettings = require('../models/GlobalSettings');
    const AuditLog = require('../models/AuditLog');

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No database backup file uploaded'
      });
    }

    const backupRaw = fs.readFileSync(req.file.path, 'utf8');
    const backupData = JSON.parse(backupRaw);

    if (!backupData.collections) {
      return res.status(400).json({
        success: false,
        error: 'Invalid database backup format'
      });
    }

    // Clean up uploaded temp file
    try {
      fs.unlinkSync(req.file.path);
    } catch (err) {
      console.warn('Failed to delete temp backup file:', err);
    }

    const { collections } = backupData;

    // Drop and seed collections sequentially
    // 1. Admins
    if (collections.admins && collections.admins.length > 0) {
      await Admin.deleteMany({});
      await Admin.insertMany(collections.admins);
    }

    // 2. Conversations
    if (collections.conversations && collections.conversations.length > 0) {
      await Conversation.deleteMany({});
      await Conversation.insertMany(collections.conversations);
    }

    // 3. Orders
    if (collections.orders && collections.orders.length > 0) {
      await Order.deleteMany({});
      await Order.insertMany(collections.orders);
    }

    // 4. Broadcasts
    if (collections.broadcasts && collections.broadcasts.length > 0) {
      await Broadcast.deleteMany({});
      await Broadcast.insertMany(collections.broadcasts);
    }

    // 5. AILogs
    if (collections.ailogs && collections.ailogs.length > 0) {
      await AILog.deleteMany({});
      await AILog.insertMany(collections.ailogs);
    }

    // 6. GlobalSettings
    if (collections.globalSettings && collections.globalSettings.length > 0) {
      await GlobalSettings.deleteMany({});
      await GlobalSettings.insertMany(collections.globalSettings);
    }

    // 7. AuditLogs
    if (collections.auditlogs && collections.auditlogs.length > 0) {
      await AuditLog.deleteMany({});
      await AuditLog.insertMany(collections.auditlogs);
    }

    // Log the restore event to audit logs (now inserted in database)
    const { logAction } = require('../services/auditLogService');
    await logAction({
      action: 'db_backup_restored',
      actor,
      target: 'System Database',
      details: {
        exportedAt: backupData.exportedAt,
        exportedBy: backupData.actorEmail
      },
      req
    });

    res.json({
      success: true,
      message: 'Database backup restored successfully!'
    });

  } catch (error) {
    console.error('Error importing database:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore database backup: ' + error.message
    });
  }
};

// --- Coupon / Discount Code Management ---

const Coupon = require('../models/Coupon');

// Get all coupons
exports.getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ success: true, data: coupons });
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch coupons' });
  }
};

// Create a new coupon
exports.createCoupon = async (req, res) => {
  try {
    const { code, discountPercent, expiresAt } = req.body;
    if (!code || !discountPercent) {
      return res.status(400).json({ success: false, error: 'Code and discount percentage are required' });
    }

    const uppercaseCode = code.toUpperCase().trim();

    // Check if code already exists
    const existing = await Coupon.findOne({ code: uppercaseCode });
    if (existing) {
      return res.status(400).json({ success: false, error: 'A coupon with this code already exists' });
    }

    const newCoupon = new Coupon({
      code: uppercaseCode,
      discountPercent: Number(discountPercent),
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });

    await newCoupon.save();

    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: newCoupon
    });
  } catch (error) {
    console.error('Error creating coupon:', error);
    res.status(500).json({ success: false, error: 'Failed to create coupon' });
  }
};

// Toggle coupon status (active/inactive)
exports.toggleCouponStatus = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, error: 'Coupon not found' });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.json({
      success: true,
      message: `Coupon is now ${coupon.isActive ? 'active' : 'inactive'}`,
      data: coupon
    });
  } catch (error) {
    console.error('Error toggling coupon status:', error);
    res.status(500).json({ success: false, error: 'Failed to update coupon status' });
  }
};

// Delete coupon
exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({ success: false, error: 'Coupon not found' });
    }

    res.json({ success: true, message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ success: false, error: 'Failed to delete coupon' });
  }
};

// ==========================================
// B2B CRM LEAD MANAGEMENT CONTROLLERS
// ==========================================

// Create new B2B Lead
exports.createLead = async (req, res) => {
  try {
    const { name, email, phone, businessName, websiteUrl, status, source, notes, remindAt } = req.body;

    if (!name || !businessName) {
      return res.status(400).json({ success: false, error: 'Contact Name and Business Name are required' });
    }

    const lead = new Lead({
      name,
      email,
      phone,
      businessName,
      websiteUrl,
      status: status || 'new',
      source: source || 'other',
      notes: notes || '',
      remindAt
    });

    await lead.save();

    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: lead
    });
  } catch (error) {
    console.error('Error creating CRM lead:', error);
    res.status(500).json({ success: false, error: 'Failed to create CRM lead', message: error.message });
  }
};

// Get all B2B Leads with filtering and pagination
exports.getAllLeads = async (req, res) => {
  try {
    const { search, status, source, page = 1, limit = 50 } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (source) {
      query.source = source;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { websiteUrl: { $regex: search, $options: 'i' } }
      ];
    }

    const leads = await Lead.find(query)
      .sort({ remindAt: 1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Lead.countDocuments(query);

    res.json({
      success: true,
      data: leads,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page)
    });
  } catch (error) {
    console.error('Error fetching CRM leads:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch CRM leads' });
  }
};

// Get single lead details
exports.getLeadDetails = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    res.json({ success: true, data: lead });
  } catch (error) {
    console.error('Error fetching CRM lead details:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch lead details' });
  }
};

// Update lead details
exports.updateLead = async (req, res) => {
  try {
    const { name, email, phone, businessName, websiteUrl, status, source, notes, remindAt } = req.body;

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    if (name) lead.name = name;
    if (email !== undefined) lead.email = email;
    if (phone !== undefined) lead.phone = phone;
    if (businessName) lead.businessName = businessName;
    if (websiteUrl !== undefined) lead.websiteUrl = websiteUrl;
    if (status) lead.status = status;
    if (source) lead.source = source;
    if (notes !== undefined) lead.notes = notes;
    if (remindAt !== undefined) lead.remindAt = remindAt;

    lead.updatedAt = Date.now();
    await lead.save();

    res.json({
      success: true,
      message: 'Lead updated successfully',
      data: lead
    });
  } catch (error) {
    console.error('Error updating CRM lead:', error);
    res.status(500).json({ success: false, error: 'Failed to update CRM lead' });
  }
};

// Delete B2B Lead
exports.deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (error) {
    console.error('Error deleting CRM lead:', error);
    res.status(500).json({ success: false, error: 'Failed to delete CRM lead' });
  }
};

// Convert Lead to Registered Client/Merchant
exports.convertLeadToClient = async (req, res) => {
  try {
    const { subscriptionPlan = 'starter', monthlyPrice = 2999, geminiTokensLimit = 10000 } = req.body;
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    if (lead.status === 'converted') {
      return res.status(400).json({ success: false, error: 'This lead has already been converted to a client' });
    }

    if (!lead.email) {
      return res.status(400).json({ success: false, error: 'Lead must have an email address to create a client account' });
    }

    // Verify if an admin with this email already exists
    const existingAdmin = await Admin.findOne({ email: lead.email });
    if (existingAdmin) {
      return res.status(400).json({ success: false, error: 'An account with this email address already exists' });
    }

    // Generate random password
    const generatedPassword = crypto.randomBytes(8).toString('hex').slice(0, 12);

    // Create new admin account
    const newAdmin = new Admin({
      name: lead.name,
      email: lead.email,
      password: generatedPassword, // Pre-save hook hashes this
      phone: lead.phone || '',
      businessName: lead.businessName,
      role: 'admin',
      subscriptionPlan: subscriptionPlan.toLowerCase(),
      subscriptionStatus: 'trial',
      monthlyPrice,
      geminiTokensLimit,
      isActive: true
    });

    await newAdmin.save();

    // Send onboarding credentials email
    try {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Inter', Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 700; }
            .content { padding: 40px; }
            .content h2 { color: #1f2937; font-size: 24px; margin-bottom: 16px; }
            .content p { color: #6b7280; line-height: 1.6; margin-bottom: 16px; }
            .credentials { background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 12px; padding: 24px; margin: 24px 0; }
            .credentials h3 { color: #1f2937; font-size: 18px; margin-bottom: 16px; }
            .credential-item { margin-bottom: 12px; }
            .credential-label { color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
            .credential-value { color: #1f2937; font-size: 16px; font-weight: 700; margin-top: 4px; background: white; padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; margin: 24px 0; }
            .footer { background: #f9fafb; padding: 24px; text-align: center; color: #9ca3af; font-size: 14px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 8px; }
            .warning p { color: #92400e; margin: 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Kwickbot!</h1>
            </div>
            <div class="content">
              <h2>Hi ${lead.name},</h2>
              <p>Your Kwickbot merchant account is ready! We've created your workspace, and you can now log in to connect your WhatsApp Business account and set up your AI support assistant.</p>
              
              <div class="credentials">
                <h3>🔐 Your Login Credentials</h3>
                <div class="credential-item">
                  <div class="credential-label">Email</div>
                  <div class="credential-value">${lead.email}</div>
                </div>
                <div class="credential-item">
                  <div class="credential-label">Password</div>
                  <div class="credential-value">${generatedPassword}</div>
                </div>
                <div class="credential-item">
                  <div class="credential-label">Subscription Plan</div>
                  <div class="credential-value">${subscriptionPlan}</div>
                </div>
              </div>

              <div class="warning">
                <p><strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.</p>
              </div>

              <a href="${getFrontendUrl(req)}/login" class="button">Login to Dashboard</a>

              <p>Best regards,<br><strong>Kwickbot Team</strong></p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Kwickbot. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const emailText = `Hi ${lead.name},\n\nYour Kwickbot merchant account is ready!\n\nYour Login Credentials:\n- Email: ${lead.email}\n- Password: ${generatedPassword}\n- Subscription Plan: ${subscriptionPlan}\n\nImportant: Please change your password after your first login.\n\nLogin to Dashboard here: ${getFrontendUrl(req)}/login\n\nBest regards,\nKwickbot Team`;

      await emailService.sendEmail({
        to: lead.email,
        subject: 'Welcome to Kwickbot - Your Account is Ready',
        html: emailHtml,
        text: emailText
      });
      console.log(`✅ Welcome email sent to converted lead ${lead.email}`);
    } catch (emailErr) {
      console.error('❌ Error sending welcome email to converted lead:', emailErr.message);
    }

    // Send onboarding credentials WhatsApp message
    if (lead.phone) {
      try {
        const whatsappMessage = `🎉 *Congratulations!* Your Kwickbot merchant account is ready.

Here are your login credentials:
📧 *Email:* ${lead.email}
🔑 *Password:* ${generatedPassword}

Please log in to your dashboard here to connect your WhatsApp bot:
🔗 ${getFrontendUrl(req)}/login

_Note: For security, please change your password after your first login._`;

        const waResult = await whatsappCloudAPI.sendMessage(lead.phone, whatsappMessage);
        if (waResult.success) {
          console.log(`✅ Onboarding WhatsApp message sent to converted lead ${lead.phone}`);
        } else {
          console.error(`❌ Onboarding WhatsApp message failed:`, waResult.error);
        }
      } catch (waErr) {
        console.error('❌ Error sending onboarding WhatsApp message to converted lead:', waErr.message);
      }
    }

    // Update lead conversion state
    lead.status = 'converted';
    lead.convertedAdminId = newAdmin._id;
    lead.updatedAt = Date.now();
    await lead.save();

    res.json({
      success: true,
      message: 'Lead converted successfully and admin account created.',
      data: {
        admin: {
          id: newAdmin._id,
          name: newAdmin.name,
          email: newAdmin.email,
          subscriptionPlan: newAdmin.subscriptionPlan
        },
        credentials: {
          email: lead.email,
          password: generatedPassword
        }
      }
    });
  } catch (error) {
    console.error('Error converting CRM lead:', error);
    res.status(500).json({ success: false, error: 'Failed to convert lead to client', message: error.message });
  }
};

// Verify a single merchant's WhatsApp connection credentials
exports.verifyUserWhatsAppConnection = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await Admin.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (!user.whatsappAccessToken || !user.whatsappPhoneNumberId) {
      user.whatsappConnected = false;
      await user.save();
      return res.json({
        success: true,
        status: 'unconfigured',
        message: 'WhatsApp credentials are not configured for this user.'
      });
    }

    // Call verify credentials
    const verifyResult = await whatsappCloudAPI.verifyCredentials({
      accessToken: user.whatsappAccessToken,
      phoneNumberId: user.whatsappPhoneNumberId
    });

    if (verifyResult.success) {
      user.whatsappConnected = true;
      user.whatsappConnectedAt = user.whatsappConnectedAt || new Date();
      await user.save();
      return res.json({
        success: true,
        status: 'connected',
        message: 'WhatsApp connection is healthy and verified!'
      });
    } else {
      user.whatsappConnected = false;
      await user.save();
      return res.json({
        success: true,
        status: 'disconnected',
        error: verifyResult.error,
        message: 'WhatsApp connection check failed. Token may be invalid or expired.'
      });
    }
  } catch (error) {
    console.error('Error verifying user WhatsApp connection:', error);
    res.status(500).json({ success: false, error: 'Failed to verify connection', message: error.message });
  }
};

// Alert merchant about offline connection via email
exports.alertUserConnectionOffline = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await Admin.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Inter', Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
          .header { background: #ef4444; padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 700; }
          .content { padding: 40px; }
          .content h2 { color: #1f2937; font-size: 20px; margin-bottom: 16px; }
          .content p { color: #6b7280; line-height: 1.6; margin-bottom: 16px; }
          .alert-box { background: #fef2f2; border: 1px solid #fee2e2; border-left: 4px solid #ef4444; padding: 20px; border-radius: 8px; margin: 24px 0; }
          .alert-title { color: #991b1b; font-weight: 700; font-size: 15px; margin-bottom: 6px; }
          .alert-desc { color: #7f1d1d; font-size: 14px; margin: 0; }
          .button { display: inline-block; background: #ef4444; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; color: #9ca3af; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ WhatsApp Connection Interrupted</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.name},</h2>
            <p>Our automated monitoring system detected that your Kwickbot WhatsApp chatbot integration has gone offline.</p>
            
            <div class="alert-box">
              <div class="alert-title">Connection Status: Disconnected</div>
              <p class="alert-desc">Your Meta access token has expired, or the connection credentials are invalid. While disconnected, your bot cannot automatically respond to incoming customers.</p>
            </div>

            <p>To resolve this, please log in to your dashboard, navigate to <strong>WA Connect</strong> under your accounts section, and reconnect your credentials.</p>
            
            <a href="${getFrontendUrl(req)}/dashboard/whatsapp-connect" class="button">Reconnect WhatsApp</a>

            <p>Best regards,<br><strong>Kwickbot Support Team</strong></p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Kwickbot. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `Hello ${user.name},\n\nOur system detected that your Kwickbot WhatsApp connection has gone offline because your credentials could not be verified.\n\nWhile disconnected, your automated chatbot will not respond to customer queries. Please log in and reconnect your account:\n${getFrontendUrl(req)}/dashboard/whatsapp-connect\n\nBest regards,\nKwickbot Support Team`;

    await emailService.sendEmail({
      to: user.email,
      subject: '⚠️ ACTION REQUIRED: Your WhatsApp connection is offline',
      html: emailHtml,
      text: emailText
    });

    res.json({
      success: true,
      message: `Alert notification dispatched successfully to ${user.email}.`
    });
  } catch (error) {
    console.error('Error sending user connection alert:', error);
    res.status(500).json({ success: false, error: 'Failed to send alert', message: error.message });
  }
};

// Retrieve connection health statuses for all merchants
exports.getConnectionHealthStatus = async (req, res) => {
  try {
    const merchants = await Admin.find({ role: 'admin' }).select('name email whatsappConnected whatsappConnectedAt whatsappPhoneNumberId whatsappBusinessAccountId whatsappAccessToken updatedAt');
    
    let totalConfigured = 0;
    let healthyCount = 0;
    let offlineCount = 0;
    let unconfiguredCount = 0;

    const merchantsWithHealth = merchants.map(m => {
      const isConfigured = !!(m.whatsappAccessToken && m.whatsappPhoneNumberId);
      let status = 'unconfigured';
      
      if (isConfigured) {
        totalConfigured++;
        if (m.whatsappConnected) {
          healthyCount++;
          status = 'connected';
        } else {
          offlineCount++;
          status = 'disconnected';
        }
      } else {
        unconfiguredCount++;
      }

      return {
        _id: m._id,
        name: m.name,
        email: m.email,
        whatsappConnected: m.whatsappConnected,
        whatsappConnectedAt: m.whatsappConnectedAt,
        whatsappPhoneNumberId: m.whatsappPhoneNumberId,
        whatsappBusinessAccountId: m.whatsappBusinessAccountId,
        status,
        updatedAt: m.updatedAt
      };
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalConfigured,
          healthy: healthyCount,
          offline: offlineCount,
          unconfigured: unconfiguredCount,
          total: merchants.length
        },
        merchants: merchantsWithHealth
      }
    });
  } catch (error) {
    console.error('Error getting connection health stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch connection health' });
  }
};

// Create a new system announcement
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, content, type, expiresAt, isActive } = req.body;

    const announcement = new Announcement({
      title,
      content,
      type: type || 'info',
      isActive: isActive !== false,
      expiresAt: expiresAt || null,
      createdBy: req.admin._id
    });

    await announcement.save();

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: announcement
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ success: false, error: 'Failed to create announcement', message: error.message });
  }
};

// Fetch all announcements (for Super Admin list view)
exports.getAllAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: announcements
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch announcements' });
  }
};

// Toggle announcement status
exports.toggleAnnouncementStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({ success: false, error: 'Announcement not found' });
    }

    announcement.isActive = !announcement.isActive;
    await announcement.save();

    res.json({
      success: true,
      message: `Announcement has been ${announcement.isActive ? 'activated' : 'deactivated'}`,
      data: announcement
    });
  } catch (error) {
    console.error('Error toggling announcement status:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle status' });
  }
};

// Delete announcement
exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Announcement.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({ success: false, error: 'Announcement not found' });
    }

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ success: false, error: 'Failed to delete announcement' });
  }
};
