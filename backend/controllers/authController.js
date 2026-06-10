const Admin = require('../models/Admin');
const {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyRefreshToken
} = require('../middleware/auth');

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const parseCookies = (cookieHeader = '') => cookieHeader.split(';').reduce((cookies, cookiePair) => {
  const [rawKey, ...rawValueParts] = cookiePair.trim().split('=');

  if (!rawKey) {
    return cookies;
  }

  const key = decodeURIComponent(rawKey);
  const value = decodeURIComponent(rawValueParts.join('='));
  cookies[key] = value;
  return cookies;
}, {});

const getRefreshCookieName = () => process.env.REFRESH_TOKEN_COOKIE_NAME || 'refreshToken';

const isProduction = () => process.env.NODE_ENV === 'production';

const getRefreshCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction(),
  sameSite: isProduction() ? 'none' : 'lax',
  path: '/api/auth',
  maxAge: REFRESH_TOKEN_TTL_MS
});

const clearRefreshCookie = (res) => {
  res.clearCookie(getRefreshCookieName(), {
    httpOnly: true,
    secure: isProduction(),
    sameSite: isProduction() ? 'none' : 'lax',
    path: '/api/auth'
  });
};

const buildAdminPayload = (admin) => ({
  id: admin._id,
  email: admin.email,
  name: admin.name,
  role: admin.role,
  lastLogin: admin.lastLogin,
  createdAt: admin.createdAt,
  subscriptionPlan: admin.subscriptionPlan,
  subscriptionStatus: admin.subscriptionStatus,
  monthlyPrice: admin.monthlyPrice,
  geminiTokensUsed: admin.geminiTokensUsed || 0,
  geminiTokensLimit: admin.geminiTokensLimit || 10000,
  totalMessagesProcessed: admin.totalMessagesProcessed || 0,
  businessName: admin.businessName,
  businessPhone: admin.businessPhone,
  storeUrl: admin.storeUrl,
  storeCategory: admin.storeCategory,
  supportEmail: admin.supportEmail,
  currency: admin.currency || 'USD',
  timezone: admin.timezone || 'UTC',
  theme: admin.theme || 'light'
});

const pruneExpiredRefreshTokens = (admin) => {
  const now = new Date();
  admin.refreshTokens = (admin.refreshTokens || []).filter((session) => !session.expiresAt || session.expiresAt > now);
};

const storeRefreshToken = (admin, refreshToken, req) => {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  admin.refreshTokens = admin.refreshTokens || [];
  admin.refreshTokens.push({
    hash: hashToken(refreshToken),
    createdAt: new Date(),
    expiresAt,
    userAgent: req.get('user-agent') || '',
    ipAddress: req.ip || req.connection?.remoteAddress || ''
  });
};

const issueSessionTokens = (admin, req) => {
  const accessToken = generateAccessToken(admin._id);
  const refreshToken = generateRefreshToken(admin._id);

  storeRefreshToken(admin, refreshToken, req);

  return { accessToken, refreshToken };
};

const extractRefreshToken = (req) => {
  const cookieToken = parseCookies(req.headers.cookie || '')[getRefreshCookieName()];
  return cookieToken || req.body?.refreshToken || null;
};

/**
 * Login admin
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() });

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account disabled',
        message: 'Your account has been disabled. Contact administrator.'
      });
    }

    const isPasswordValid = await admin.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    admin.lastLogin = new Date();
    pruneExpiredRefreshTokens(admin);

    const { accessToken, refreshToken } = issueSessionTokens(admin, req);
    await admin.save();

    res.cookie(getRefreshCookieName(), refreshToken, getRefreshCookieOptions());

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        token: accessToken,
        expiresIn: 900,
        admin: buildAdminPayload(admin)
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Refresh access token using the refresh token cookie
 */
exports.refresh = async (req, res) => {
  try {
    const refreshToken = extractRefreshToken(req);

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token missing',
        message: 'Please sign in again'
      });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      clearRefreshCookie(res);
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token',
        message: 'Please sign in again'
      });
    }

    const refreshHash = hashToken(refreshToken);
    const admin = await Admin.findOne({
      _id: decoded.id,
      isActive: true,
      'refreshTokens.hash': refreshHash
    });

    if (!admin) {
      clearRefreshCookie(res);
      return res.status(401).json({
        success: false,
        error: 'Session not found',
        message: 'Please sign in again'
      });
    }

    pruneExpiredRefreshTokens(admin);
    admin.refreshTokens = admin.refreshTokens.filter((session) => session.hash !== refreshHash);

    const { accessToken, refreshToken: rotatedRefreshToken } = issueSessionTokens(admin, req);
    await admin.save();

    res.cookie(getRefreshCookieName(), rotatedRefreshToken, getRefreshCookieOptions());

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
        token: accessToken,
        expiresIn: 900,
        admin: buildAdminPayload(admin)
      }
    });
  } catch (error) {
    console.error('Refresh error:', error);
    clearRefreshCookie(res);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get current admin profile
 */
exports.getProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }
    res.json({
      success: true,
      data: {
        admin: buildAdminPayload(admin)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Change password and revoke all refresh sessions
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long'
      });
    }

    const admin = await Admin.findById(req.admin._id);

    const isPasswordValid = await admin.comparePassword(currentPassword);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    admin.password = newPassword;
    admin.refreshTokens = [];
    await admin.save();

    clearRefreshCookie(res);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Logout current session by removing the refresh token from MongoDB and clearing the cookie
 */
exports.logout = async (req, res) => {
  try {
    const refreshToken = extractRefreshToken(req);

    if (refreshToken) {
      const refreshHash = hashToken(refreshToken);
      const admin = await Admin.findOne({ 'refreshTokens.hash': refreshHash });

      if (admin) {
        admin.refreshTokens = (admin.refreshTokens || []).filter((session) => session.hash !== refreshHash);
        await admin.save();
      }
    }

    clearRefreshCookie(res);

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    clearRefreshCookie(res);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get available plans (regular admin/merchant view)
 */
exports.getPlans = async (req, res) => {
  try {
    const PricingPlan = require('../models/PricingPlan');
    let plans = await PricingPlan.find({ isActive: true });
    
    // Seed default plans if none exist in the database
    if (plans.length === 0) {
      plans = [
        {
          name: 'starter',
          displayName: 'Starter Plan',
          description: 'Perfect for small e-commerce stores starting out.',
          monthlyPrice: 29,
          badge: null,
          features: {
            maxConversations: 500,
            maxMessages: 2000,
            geminiTokensPerMonth: 10000,
            maxWhatsAppConnections: 1,
            advancedAnalytics: false,
            liveChat: true,
            knowledgeBase: true,
            integrations: true
          }
        },
        {
          name: 'professional',
          displayName: 'Professional Plan',
          description: 'Great for growing businesses looking for premium support.',
          monthlyPrice: 79,
          badge: 'POPULAR',
          features: {
            maxConversations: 3000,
            maxMessages: 15000,
            geminiTokensPerMonth: 50000,
            maxWhatsAppConnections: 2,
            advancedAnalytics: true,
            liveChat: true,
            knowledgeBase: true,
            integrations: true,
            prioritySupport: true
          }
        },
        {
          name: 'enterprise',
          displayName: 'Enterprise Plan',
          description: 'For large-scale operations requiring maximum power and volume.',
          monthlyPrice: 199,
          badge: 'BEST VALUE',
          features: {
            maxConversations: -1,
            maxMessages: -1,
            geminiTokensPerMonth: 200000,
            maxWhatsAppConnections: 5,
            advancedAnalytics: true,
            customBranding: true,
            liveChat: true,
            knowledgeBase: true,
            integrations: true,
            apiAccess: true,
            prioritySupport: true
          }
        }
      ];
    }
    
    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Upgrade/Downgrade merchant subscription plan
 */
exports.upgradePlan = async (req, res) => {
  try {
    const { planName } = req.body;
    const allowedPlans = ['starter', 'professional', 'enterprise'];
    if (!allowedPlans.includes(planName)) {
      return res.status(400).json({ success: false, error: 'Invalid plan selected' });
    }

    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }

    const PricingPlan = require('../models/PricingPlan');
    const planDetails = await PricingPlan.findOne({ name: planName, isActive: true });

    if (!planDetails) {
      const fallbacks = {
        starter: { price: 29, limit: 10000 },
        professional: { price: 79, limit: 50000 },
        enterprise: { price: 199, limit: 200000 }
      };
      
      const fallback = fallbacks[planName];
      admin.subscriptionPlan = planName;
      admin.monthlyPrice = fallback.price;
      admin.geminiTokensLimit = fallback.limit;
    } else {
      admin.subscriptionPlan = planName;
      admin.monthlyPrice = planDetails.monthlyPrice;
      admin.geminiTokensLimit = planDetails.features.geminiTokensPerMonth;
    }

    admin.subscriptionStatus = 'active';
    admin.subscriptionStartDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    admin.subscriptionEndDate = endDate;

    await admin.save();

    res.json({
      success: true,
      message: `Successfully upgraded to ${planName.toUpperCase()} plan!`,
      data: {
        admin: buildAdminPayload(admin)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update admin profile & settings
 */
exports.updateProfile = async (req, res) => {
  try {
    const { name, businessName, businessPhone, storeUrl, storeCategory, supportEmail, currency, timezone, theme } = req.body;
    
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }

    if (name !== undefined) admin.name = name;
    if (businessName !== undefined) admin.businessName = businessName;
    if (businessPhone !== undefined) admin.businessPhone = businessPhone;
    if (storeUrl !== undefined) admin.storeUrl = storeUrl;
    if (storeCategory !== undefined) admin.storeCategory = storeCategory;
    if (supportEmail !== undefined) admin.supportEmail = supportEmail;
    if (currency !== undefined) admin.currency = currency;
    if (timezone !== undefined) admin.timezone = timezone;
    if (theme !== undefined) admin.theme = theme;

    await admin.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        admin: buildAdminPayload(admin)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};