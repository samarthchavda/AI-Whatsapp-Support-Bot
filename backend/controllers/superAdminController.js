const Admin = require('../models/Admin');
const Conversation = require('../models/Conversation');
const Order = require('../models/Order');
const Broadcast = require('../models/Broadcast');
const Lead = require('../models/Lead');
const Announcement = require('../models/Announcement');
const emailService = require('../services/emailService');
const { getFrontendUrl } = require('../services/urlHelper');
const PageVisit = require('../models/PageVisit');
const Integration = require('../models/Integration');
const AuditLog = require('../models/AuditLog');
const WebhookLog = require('../models/WebhookLog');
const os = require('os');
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
      monthlyPrice: monthlyPrice || 1499,
      geminiTokensLimit: geminiTokensLimit || 50000,
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

    // Calculate total revenue from actual completed subscription payments/invoices
    const Invoice = require('../models/Invoice');
    const adminIds = allUsers.map(user => user._id);
    const paidInvoices = await Invoice.find({
      customerId: { $in: adminIds },
      $or: [
        { paymentStatus: 'completed' },
        { status: 'paid' }
      ]
    });

    const totalRevenue = paidInvoices.reduce((sum, invoice) => {
      return sum + (invoice.totalAmount || 0);
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
    const whitelistedKeys = [
      'whatsapp_access_token',
      'whatsapp_phone_number_id',
      'whatsapp_business_account_id',
      'whatsapp_webhook_verify_token',
      'razorpay_key_id',
      'razorpay_key_secret',
      'geminiApiFundsAdded',
      'webBotEnabled'
    ];

    // Explicit security whitelist query: retrieve only whitelisted configuration keys
    const settings = await GlobalSettings.find({ key: { $in: whitelistedKeys } });
    const settingsMap = {};
    
    // Initialize defaults
    settingsMap['webBotEnabled'] = false;
    settingsMap['geminiApiFundsAdded'] = 0;

    settings.forEach(s => {
      const sensitiveWords = ['password', 'secret', 'token', 'key', 'credential'];
      const isSensitive = sensitiveWords.some(word => s.key.toLowerCase().includes(word));
      
      if (isSensitive && s.value) {
        // Expose a masked placeholder indicator so the UI knows a credential is set
        settingsMap[s.key] = '******';
      } else {
        settingsMap[s.key] = s.value;
      }
    });

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

    const whitelistedKeys = [
      'whatsapp_access_token',
      'whatsapp_phone_number_id',
      'whatsapp_business_account_id',
      'whatsapp_webhook_verify_token',
      'razorpay_key_id',
      'razorpay_key_secret',
      'geminiApiFundsAdded',
      'webBotEnabled'
    ];

    const whatsappWebBot = require('../services/whatsappWebBot');

    for (const [key, value] of Object.entries(settings)) {
      // Security Whitelist restriction on input setting keys
      if (!whitelistedKeys.includes(key)) {
        continue;
      }

      if (value === '******') {
        // Skip updating masked values to avoid overwriting database secrets with placeholders
        continue;
      }

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
    const { subscriptionPlan = 'starter', monthlyPrice = 1499, geminiTokensLimit = 50000 } = req.body;
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

// Get WhatsApp operations monitoring stats
exports.getWhatsAppMonitoringStatus = async (req, res) => {
  try {
    const merchants = await Admin.find({ role: 'admin' })
      .select('name email businessPhone whatsappConnected whatsappConnectedAt whatsappBusinessAccountId totalMessagesProcessed updatedAt');

    const totalAccounts = merchants.length;
    const connectedAccounts = merchants.filter(m => m.whatsappConnected).length;
    const disconnectedAccounts = totalAccounts - connectedAccounts;
    const totalMessages = merchants.reduce((sum, m) => sum + (m.totalMessagesProcessed || 0), 0);

    res.json({
      success: true,
      data: {
        merchants: merchants.map(m => ({
          _id: m._id,
          name: m.name,
          email: m.email,
          businessPhone: m.businessPhone,
          whatsappConnected: m.whatsappConnected,
          whatsappConnectedAt: m.whatsappConnectedAt,
          whatsappBusinessAccountId: m.whatsappBusinessAccountId,
          totalMessagesProcessed: m.totalMessagesProcessed || 0,
          updatedAt: m.updatedAt
        })),
        summary: {
          totalAccounts,
          connectedAccounts,
          disconnectedAccounts,
          totalMessages
        }
      }
    });
  } catch (error) {
    console.error('Error fetching WhatsApp monitoring data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch WhatsApp monitoring data'
    });
  }
};

// Get Live Operations monitoring metrics
exports.getLiveOperationsStatus = async (req, res) => {
  try {
    // 1. Get all merchants
    const merchants = await Admin.find({ role: 'admin' }).select('name email updatedAt');

    // 2. Aggregate conversation stats
    const conversationStats = await Conversation.aggregate([
      {
        $group: {
          _id: '$admin',
          totalConversations: { $sum: 1 },
          activeConversations: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          escalatedConversations: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$status', 'escalated'] },
                    { $eq: ['$escalated', true] }
                  ]
                },
                1,
                0
              ]
            }
          },
          totalMessages: { $sum: { $size: '$messages' } },
          lastActivity: { $max: '$updatedAt' }
        }
      }
    ]);

    // Create a map for easy lookup
    const statsMap = {};
    conversationStats.forEach(stat => {
      if (stat._id) {
        statsMap[stat._id.toString()] = stat;
      }
    });

    // 3. Assemble merchant data
    const merchantRows = merchants.map(m => {
      const stats = statsMap[m._id.toString()] || {
        totalConversations: 0,
        activeConversations: 0,
        escalatedConversations: 0,
        totalMessages: 0,
        lastActivity: null
      };

      return {
        _id: m._id,
        name: m.name,
        email: m.email,
        conversationsCount: stats.totalConversations,
        activeConversationsCount: stats.activeConversations,
        escalatedConversationsCount: stats.escalatedConversations,
        messagesCount: stats.totalMessages,
        lastActivity: stats.lastActivity || m.updatedAt
      };
    });

    // 4. Summarize global stats
    const totalConversations = merchantRows.reduce((sum, m) => sum + m.conversationsCount, 0);
    const totalMessages = merchantRows.reduce((sum, m) => sum + m.messagesCount, 0);
    const activeConversations = merchantRows.reduce((sum, m) => sum + m.activeConversationsCount, 0);
    const escalatedConversations = merchantRows.reduce((sum, m) => sum + m.escalatedConversationsCount, 0);

    res.json({
      success: true,
      data: {
        merchants: merchantRows,
        summary: {
          totalConversations,
          totalMessages,
          activeConversations,
          escalatedConversations
        }
      }
    });
  } catch (error) {
    console.error('Error fetching Live Operations data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch live operations data'
    });
  }
};

// Get Integration Health monitoring metrics
exports.getIntegrationHealthStatus = async (req, res) => {
  try {
    // 1. Get all merchants
    const merchants = await Admin.find({ role: 'admin' }).select('name email shopifyEnabled woocommerceEnabled updatedAt');

    // 2. Get all integrations
    const integrations = await Integration.find({}).select('adminId platform isActive lastSyncedAt storeUrl');

    // Group integrations by merchant adminId
    const integrationsMap = {};
    integrations.forEach(integration => {
      const adminIdStr = integration.adminId.toString();
      if (!integrationsMap[adminIdStr]) {
        integrationsMap[adminIdStr] = [];
      }
      integrationsMap[adminIdStr].push(integration);
    });

    // 3. Assemble merchant rows
    const merchantRows = merchants.map(m => {
      const merchantIntegrations = integrationsMap[m._id.toString()] || [];
      
      const shopifyInt = merchantIntegrations.find(i => i.platform === 'shopify');
      const wooInt = merchantIntegrations.find(i => i.platform === 'woocommerce');

      let shopifyStatus = 'Not Connected';
      if (shopifyInt) {
        shopifyStatus = shopifyInt.isActive ? 'Active' : 'Inactive';
      }

      let wooStatus = 'Not Connected';
      if (wooInt) {
        wooStatus = wooInt.isActive ? 'Active' : 'Inactive';
      }

      // Calculate last sync
      const syncTimes = [shopifyInt?.lastSyncedAt, wooInt?.lastSyncedAt].filter(Boolean);
      const lastSync = syncTimes.length > 0 ? new Date(Math.max(...syncTimes.map(t => new Date(t)))) : null;

      // Determine merchant status
      let overallStatus = 'No Integrations';
      const hasIntegrations = shopifyInt || wooInt;
      if (hasIntegrations) {
        const hasActive = (shopifyInt?.isActive) || (wooInt?.isActive);
        const hasInactive = (shopifyInt && !shopifyInt.isActive) || (wooInt && !wooInt.isActive);
        
        if (hasActive && !hasInactive) {
          overallStatus = 'Healthy';
        } else if (hasInactive) {
          overallStatus = 'Issues';
        }
      }

      return {
        _id: m._id,
        name: m.name,
        email: m.email,
        shopifyStatus,
        wooStatus,
        lastSync,
        status: overallStatus
      };
    });

    // 4. Summarize global stats
    const totalShopify = integrations.filter(i => i.platform === 'shopify').length;
    const totalWoo = integrations.filter(i => i.platform === 'woocommerce').length;
    const activeIntegrations = integrations.filter(i => i.isActive).length;
    const failedIntegrations = integrations.length - activeIntegrations;

    res.json({
      success: true,
      data: {
        merchants: merchantRows,
        summary: {
          totalShopify,
          totalWoo,
          activeIntegrations,
          failedIntegrations
        }
      }
    });
  } catch (error) {
    console.error('Error fetching Integration Health data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch integration health data'
    });
  }
};

// Get AI Usage platform-wide monitoring metrics
exports.getAIUsageStatus = async (req, res) => {
  try {
    const merchants = await Admin.find({ role: 'admin' })
      .select('name email geminiTokensUsed geminiTokensLimit updatedAt');

    const totalUsed = merchants.reduce((sum, m) => sum + (m.geminiTokensUsed || 0), 0);
    
    // Ignore unlimited limits (-1 or Infinity) when calculating total limit
    const totalLimit = merchants.reduce((sum, m) => {
      const limit = m.geminiTokensLimit;
      if (limit === -1 || limit === Infinity) return sum;
      return sum + limit;
    }, 0);

    // Calculate usage percentage for each merchant
    const merchantRows = merchants.map(m => {
      const used = m.geminiTokensUsed || 0;
      const limit = m.geminiTokensLimit;
      
      let usagePct = 0;
      let isUnlimited = false;
      let remaining = 'Unlimited';
      
      if (limit === -1 || limit === Infinity) {
        isUnlimited = true;
      } else if (limit > 0) {
        usagePct = parseFloat(((used / limit) * 100).toFixed(1));
        remaining = Math.max(0, limit - used);
      }

      let status = 'Normal';
      if (!isUnlimited) {
        if (usagePct >= 95) {
          status = 'Critical';
        } else if (usagePct >= 80) {
          status = 'Warning';
        }
      }

      return {
        _id: m._id,
        name: m.name,
        email: m.email,
        geminiTokensUsed: used,
        geminiTokensLimit: limit,
        remaining,
        usagePct,
        status,
        updatedAt: m.updatedAt
      };
    });

    // Count near limit merchants (usage >= 80%)
    const nearLimitCount = merchantRows.filter(m => m.status === 'Warning' || m.status === 'Critical').length;

    // Calculate average usage % for merchants with limits
    const limitedMerchants = merchantRows.filter(m => m.geminiTokensLimit > 0);
    const avgUsagePct = limitedMerchants.length > 0
      ? parseFloat((limitedMerchants.reduce((sum, m) => sum + m.usagePct, 0) / limitedMerchants.length).toFixed(1))
      : 0;

    res.json({
      success: true,
      data: {
        merchants: merchantRows,
        summary: {
          totalUsed,
          totalLimit,
          avgUsagePct,
          nearLimitCount
        }
      }
    });
  } catch (error) {
    console.error('Error fetching AI Usage data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI usage data'
    });
  }
};

// Get Billing & Revenue platform-wide monitoring metrics
exports.getBillingRevenueStatus = async (req, res) => {
  try {
    const Invoice = require('../models/Invoice');
    
    // 1. Fetch all merchants
    const merchants = await Admin.find({ role: 'admin' })
      .select('name email subscriptionPlan subscriptionStatus monthlyPrice customDiscount trialStartedAt subscriptionEndDate createdAt');

    // 2. Fetch completed invoices for revenue
    const merchantIds = merchants.map(m => m._id);
    const paidInvoices = await Invoice.find({
      customerId: { $in: merchantIds },
      $or: [
        { paymentStatus: 'completed' },
        { status: 'paid' }
      ]
    });

    const totalRevenue = paidInvoices.reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);

    // 3. Assemble merchant rows
    const merchantRows = merchants.map(m => {
      const discount = m.customDiscount || 0;
      const basePrice = m.monthlyPrice || 0;
      const finalPrice = parseFloat((basePrice - (basePrice * discount / 100)).toFixed(2));

      // Calculate trial / expiry context
      let expiryDate = null;
      if (m.subscriptionStatus === 'trial') {
        // trial period typically lasts 14 days from trialStartedAt or createdAt
        const start = m.trialStartedAt || m.createdAt;
        const end = new Date(start);
        end.setDate(end.getDate() + 14);
        expiryDate = end;
      } else if (m.subscriptionEndDate) {
        expiryDate = m.subscriptionEndDate;
      }

      // Determine billing status
      let billingStatus = 'Inactive';
      if (m.subscriptionStatus === 'active') {
        billingStatus = 'Active';
      } else if (m.subscriptionStatus === 'trial') {
        billingStatus = 'Trial';
      } else if (m.subscriptionStatus === 'cancelled') {
        billingStatus = 'Cancelled';
      } else if (m.subscriptionStatus === 'inactive') {
        billingStatus = 'Expired';
      }

      return {
        _id: m._id,
        name: m.name,
        email: m.email,
        plan: m.subscriptionPlan || 'free',
        subscriptionStatus: m.subscriptionStatus || 'inactive',
        monthlyAmount: finalPrice,
        expiryDate,
        billingStatus
      };
    });

    // 4. Summarize global stats
    const activeSubs = merchants.filter(m => m.subscriptionStatus === 'active').length;
    const trialMerchants = merchants.filter(m => m.subscriptionStatus === 'trial').length;
    const expiredInactive = merchants.filter(m => m.subscriptionStatus === 'inactive' || m.subscriptionStatus === 'cancelled').length;

    res.json({
      success: true,
      data: {
        merchants: merchantRows,
        summary: {
          totalRevenue,
          activeSubs,
          trialMerchants,
          expiredInactive
        }
      }
    });
  } catch (error) {
    console.error('Error fetching Billing & Revenue data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch billing & revenue data'
    });
  }
};

// Get Audit Logs platform security monitoring metrics
exports.getAuditLogs = async (req, res) => {
  try {
    // 1. Fetch all audit log records sorted by newest first
    const logs = await AuditLog.find({})
      .populate({ path: 'actor', select: 'name email role' })
      .sort({ createdAt: -1 })
      .limit(500);

    // 2. Fetch all administrators to build a lookup mapping in case populated actor is missing
    const admins = await Admin.find({}).select('name email role');
    const adminMap = {};
    admins.forEach(a => {
      adminMap[a.email.toLowerCase()] = {
        name: a.name,
        role: a.role
      };
    });

    // 3. Process logs list and filter details
    const sanitizedLogs = logs.map(log => {
      const email = log.actorEmail ? log.actorEmail.toLowerCase() : '';
      const fallbackActor = adminMap[email] || { name: 'System / Guest', role: 'guest' };

      const actorName = log.actor?.name || fallbackActor.name;
      const actorRole = log.actor?.role || fallbackActor.role;

      // Filter out any sensitive information from details
      const cleanDetails = {};
      if (log.details && typeof log.details === 'object') {
        const sensitiveKeys = ['password', 'token', 'secret', 'key', 'apiKey', 'webhookSecret', 'credentials', 'auth'];
        Object.keys(log.details).forEach(key => {
          const isSensitive = sensitiveKeys.some(sk => key.toLowerCase().includes(sk));
          if (!isSensitive) {
            cleanDetails[key] = log.details[key];
          } else {
            cleanDetails[key] = '[REDACTED]';
          }
        });
      }

      return {
        _id: log._id,
        action: log.action,
        actorEmail: log.actorEmail,
        actorName,
        actorRole,
        target: log.target || 'N/A',
        ipAddress: log.ipAddress || 'Not available',
        userAgent: log.userAgent || 'Not available',
        details: cleanDetails,
        createdAt: log.createdAt
      };
    });

    // 4. Summarize stats
    const totalActivities = sanitizedLogs.length;
    
    // Admin actions are those made by super admins or guests/system logs acting on behalf of system
    const adminActions = sanitizedLogs.filter(log => log.actorRole === 'super_admin').length;
    
    // Merchant actions are those made by admins
    const merchantActions = sanitizedLogs.filter(log => log.actorRole === 'admin').length;

    // Recent activities (last 24 hours)
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    const recentActivities = sanitizedLogs.filter(log => new Date(log.createdAt) >= oneDayAgo).length;

    res.json({
      success: true,
      data: {
        logs: sanitizedLogs,
        summary: {
          totalActivities,
          adminActions,
          merchantActions,
          recentActivities
        }
      }
    });
  } catch (error) {
    console.error('Error fetching Audit Logs data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs data'
    });
  }
};

// Get System Health status, hardware utilization, service checks and recent error logs
exports.getSystemHealthStatus = async (req, res) => {
  try {
    const mongoose = require('mongoose');

    // 1. Hardware utilization metrics
    const processMemory = process.memoryUsage().heapUsed; // bytes
    const processMemoryMB = Math.round(processMemory / 1024 / 1024);

    const totalSystemMemory = os.totalmem();
    const freeSystemMemory = os.freemem();
    const usedSystemMemory = totalSystemMemory - freeSystemMemory;
    const systemMemoryUsagePct = parseFloat(((usedSystemMemory / totalSystemMemory) * 100).toFixed(1));

    // Formatted uptime
    const uptimeSeconds = process.uptime();
    const uptimeHours = Math.floor(uptimeSeconds / 3600);
    const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
    const uptimeSecs = Math.floor(uptimeSeconds % 60);
    const formattedUptime = `${uptimeHours}h ${uptimeMinutes}m ${uptimeSecs}s`;

    // CPU load average (1 minute)
    const loadAvg = os.loadavg()[0];
    const cpuCoresCount = os.cpus().length;
    const cpuUsagePct = parseFloat(((loadAvg / cpuCoresCount) * 100).toFixed(1));

    // 2. Database & Service status checks
    const dbState = mongoose.connection.readyState;
    const dbStatus = dbState === 1 ? 'Operational' : 'Down';

    // WhatsApp / Meta API state check based on merchant accounts
    const merchants = await Admin.find({ role: 'admin' }).select('whatsappConnected');
    const offlineMerchants = merchants.filter(m => m.whatsappConnected === false).length;
    const whatsAppStatus = offlineMerchants > 0 ? 'Degraded' : 'Operational';

    // Gemini API configuration check
    const geminiStatus = process.env.GEMINI_API_KEY ? 'Operational' : 'Not Available';

    // Shopify & WooCommerce checking based on active integrations
    const integrations = await Integration.find({}).select('platform isActive');
    const shopifyInts = integrations.filter(i => i.platform === 'shopify');
    const wooInts = integrations.filter(i => i.platform === 'woocommerce');

    const hasShopifyIssues = shopifyInts.some(i => !i.isActive);
    const shopifyStatus = shopifyInts.length === 0 ? 'Operational' : (hasShopifyIssues ? 'Degraded' : 'Operational');

    const hasWooIssues = wooInts.some(i => !i.isActive);
    const wooStatus = wooInts.length === 0 ? 'Operational' : (hasWooIssues ? 'Degraded' : 'Operational');

    // 3. Query Recent System Errors (failed webhook responses / WhatsApp delivery errors)
    const errorLogs = await WebhookLog.find({
      $or: [
        { status: 'failed' },
        { whatsappError: { $ne: null } }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('source eventType status errorMessage whatsappError externalOrderId createdAt');

    const recentErrors = errorLogs.map(log => ({
      _id: log._id,
      source: log.source,
      eventType: log.eventType,
      error: log.errorMessage || log.whatsappError || 'Unknown integration error',
      externalOrderId: log.externalOrderId || 'N/A',
      createdAt: log.createdAt
    }));

    res.json({
      success: true,
      data: {
        system: {
          backendStatus: 'Operational',
          databaseStatus: dbStatus,
          serverStatus: 'Operational',
          memoryUsage: `${processMemoryMB} MB`,
          systemMemory: `${(usedSystemMemory / 1024 / 1024 / 1024).toFixed(2)} GB / ${(totalSystemMemory / 1024 / 1024 / 1024).toFixed(2)} GB (${systemMemoryUsagePct}%)`,
          cpuUsage: `${cpuUsagePct}%`,
          uptime: formattedUptime,
          pid: process.pid
        },
        services: {
          mongodb: dbStatus,
          whatsapp: whatsAppStatus,
          gemini: geminiStatus,
          shopify: shopifyStatus,
          woocommerce: wooStatus
        },
        recentErrors
      }
    });
  } catch (error) {
    console.error('Error fetching System Health data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system health data'
    });
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

// Get Feature Flags using GlobalSettings
exports.getFeatureFlags = async (req, res) => {
  try {
    const predefinedFlags = ['webBotEnabled', 'shopifySyncEnabled', 'wooSyncEnabled', 'aiAutoResponseEnabled'];
    
    // Explicit security whitelist: fetch only the predefined flags to protect other sensitive settings/secrets
    const settings = await GlobalSettings.find({ key: { $in: predefinedFlags } });
    const settingsMap = {};
    settings.forEach(s => {
      settingsMap[s.key] = s;
    });

    const defaultFlags = [
      {
        key: 'webBotEnabled',
        name: 'Web Chatbot Widget',
        description: 'Controls whether the web chat client widget and socket listeners are active.',
        scope: 'Global'
      },
      {
        key: 'shopifySyncEnabled',
        name: 'Shopify Realtime Sync',
        description: 'Controls Shopify connection cron job triggers and customer data syncing.',
        scope: 'Global'
      },
      {
        key: 'wooSyncEnabled',
        name: 'WooCommerce Webhook Listeners',
        description: 'Controls WooCommerce real-time webhook routing for automated orders updates.',
        scope: 'Global'
      },
      {
        key: 'aiAutoResponseEnabled',
        name: 'AI Auto-Response Engine',
        description: 'Controls whether Gemini AI answers incoming messages without human agent escalation.',
        scope: 'Global'
      }
    ];

    const flagsList = defaultFlags.map(df => {
      const dbSetting = settingsMap[df.key];
      const isEnabled = dbSetting ? dbSetting.value === true : false;
      return {
        key: df.key,
        name: df.name,
        description: df.description,
        scope: df.scope,
        isEnabled,
        updatedAt: dbSetting ? dbSetting.updatedAt : null
      };
    });

    const totalFeatures = flagsList.length;
    const enabledCount = flagsList.filter(f => f.isEnabled).length;
    const disabledCount = totalFeatures - enabledCount;

    res.json({
      success: true,
      data: {
        flags: flagsList,
        summary: {
          totalFeatures,
          enabledCount,
          disabledCount
        }
      }
    });
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch feature flags'
    });
  }
};

// Toggle a Feature Flag value in GlobalSettings
exports.toggleFeatureFlag = async (req, res) => {
  try {
    const predefinedFlags = ['webBotEnabled', 'shopifySyncEnabled', 'wooSyncEnabled', 'aiAutoResponseEnabled'];
    const { key, isEnabled } = req.body;

    if (!key) {
      return res.status(400).json({ success: false, error: 'Feature key is required' });
    }

    // Security check: Only predefined whitelisted flags can be modified
    if (!predefinedFlags.includes(key)) {
      return res.status(400).json({
        success: false,
        error: 'Unauthorized key modification. Only predefined feature flags can be toggled.'
      });
    }

    // Retrieve old state to log old/new values in AuditLog
    const oldSetting = await GlobalSettings.findOne({ key });
    const oldValue = oldSetting ? oldSetting.value === true : false;
    const newValue = isEnabled === true;

    const updatedSetting = await GlobalSettings.findOneAndUpdate(
      { key },
      { value: newValue },
      { new: true, upsert: true }
    );

    // Save AuditLog log entry with actor details and state transitions
    try {
      const { logAction } = require('../services/auditLogService');
      await logAction({
        action: 'feature_flag_toggled',
        actor: req.admin,
        target: key,
        details: {
          flag: key,
          oldValue,
          newValue
        },
        req
      });
    } catch (auditErr) {
      console.error('Failed to log feature flag toggle to AuditLog:', auditErr.message);
    }

    res.json({
      success: true,
      data: updatedSetting
    });
  } catch (error) {
    console.error('Error toggling feature flag:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle feature flag'
    });
  }
};
