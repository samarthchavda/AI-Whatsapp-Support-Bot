const Admin = require('../../models/Admin');
const emailService = require('../../services/emailService');
const { getFrontendUrl } = require('../../services/urlHelper');
const {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyRefreshToken
} = require('../../middleware/auth');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const auditLogService = require('../../services/auditLogService');
const { resetRateLimitKey, incrementRateLimitKey } = require('../../middleware/mongoRateLimiter');

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DUMMY_HASH = '$2a$10$IzpFmyKFRqZDqwBHY.1gkuLalXSlc.n2PlJI51SNHdoXL0JkpL..O';
const GENERIC_LOGIN_ERROR = {
  success: false,
  error: 'Invalid credentials',
  message: 'Email or password is incorrect'
};

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
  subscriptionStartDate: admin.subscriptionStartDate,
  subscriptionEndDate: admin.subscriptionEndDate,
  monthlyPrice: admin.monthlyPrice,
  geminiTokensUsed: admin.geminiTokensUsed || 0,
  geminiTokensLimit: admin.geminiTokensLimit || 10000,
  totalMessagesProcessed: admin.totalMessagesProcessed || 0,
  businessName: admin.businessName,
  businessPhone: admin.businessPhone,
  storeUrl: admin.storeUrl,
  storeCategory: admin.storeCategory,
  supportEmail: admin.supportEmail,
  currency: admin.currency || 'INR',
  timezone: admin.timezone || 'UTC',
  theme: admin.theme || 'light',
  webBotEnabled: admin.webBotEnabled === true,
  aiBotEnabled: admin.aiBotEnabled !== false,
  aiDraftMode: admin.aiDraftMode === true,
  shopifyEnabled: admin.shopifyEnabled !== false,
  woocommerceEnabled: admin.woocommerceEnabled !== false,
  profileCompleted: admin.profileCompleted === true,
  profileCompletedAt: admin.profileCompletedAt,
  trialStartedAt: admin.trialStartedAt,
  allowedPages: Array.isArray(admin.allowedPages) ? admin.allowedPages : null,
  customBranding: admin.customBranding || { logoUrl: null, brandName: null, removeCredits: false }
});

const ABSOLUTE_SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // 7 days max absolute lifetime
const IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours idle timeout for admin dashboard
const MAX_SIMULTANEOUS_SESSIONS = 5;

const pruneExpiredRefreshTokens = (admin) => {
  const now = new Date();
  admin.refreshTokens = (admin.refreshTokens || []).filter((session) => {
    if (!session) return false;
    const isAbsExpired = session.expiresAt && new Date(session.expiresAt) <= now;
    const isIdleExpired = session.lastActivity && (now.getTime() - new Date(session.lastActivity).getTime() > IDLE_TIMEOUT_MS);
    return !isAbsExpired && !isIdleExpired;
  });
};

const storeRefreshToken = (admin, refreshToken, req, existingSessionId = null) => {
  const crypto = require('crypto');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ABSOLUTE_SESSION_LIFETIME_MS);
  const idleExpiresAt = new Date(now.getTime() + IDLE_TIMEOUT_MS);
  const sessionId = existingSessionId || (crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'));

  admin.refreshTokens = admin.refreshTokens || [];
  pruneExpiredRefreshTokens(admin);

  if (!existingSessionId && admin.refreshTokens.length >= MAX_SIMULTANEOUS_SESSIONS) {
    admin.refreshTokens.sort((a, b) => new Date(a.lastActivity || a.createdAt) - new Date(b.lastActivity || b.createdAt));
    while (admin.refreshTokens.length >= MAX_SIMULTANEOUS_SESSIONS) {
      admin.refreshTokens.shift();
    }
  }

  admin.refreshTokens.push({
    sessionId,
    hash: hashToken(refreshToken),
    previousHashes: [],
    createdAt: now,
    lastActivity: now,
    expiresAt,
    idleExpiresAt,
    userAgent: req.get('user-agent') || '',
    ipAddress: req.ip || req.connection?.remoteAddress || ''
  });

  return sessionId;
};

const issueSessionTokens = (admin, req) => {
  const crypto = require('crypto');
  const sessionId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
  const accessToken = generateAccessToken(admin._id, { sessionId });
  const refreshToken = generateRefreshToken(admin._id, { sessionId });

  storeRefreshToken(admin, refreshToken, req, sessionId);

  return { accessToken, refreshToken, sessionId };
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

    const normalizedEmail = (email || '').toLowerCase().trim();
    const admin = await Admin.findOne({ email: normalizedEmail });

    // Dummy compare to guarantee constant response timing whether email exists or not
    const targetHash = admin ? admin.password : DUMMY_HASH;
    const isPasswordValid = await bcrypt.compare(password, targetHash);

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '127.0.0.1';
    const actorId = admin ? admin._id : new mongoose.Types.ObjectId();

    // Check account lockout
    if (admin && admin.lockedUntil && admin.lockedUntil > new Date()) {
      await auditLogService.logAction({
        action: 'account_lockout_attempt',
        actor: { _id: admin._id, email: admin.email },
        details: { ip: clientIp },
        req
      });
      return res.status(401).json(GENERIC_LOGIN_ERROR);
    }

    // Role & Domain Enforcement Check
    const host = req.get('host') || '';
    const origin = req.get('origin') || req.get('referer') || '';
    const isSuperAdminDomain = host.startsWith('admin.') || origin.includes('admin.kwickbot.in');

    let domainMismatch = false;
    if (admin) {
      if (isSuperAdminDomain && admin.role !== 'super_admin') {
        domainMismatch = true;
      }
      if (!isSuperAdminDomain && admin.role === 'super_admin') {
        domainMismatch = true;
      }
    }

    if (!admin || !isPasswordValid || domainMismatch || !admin.isActive) {
      // Record failed attempt on admin if exists
      if (admin && admin.isActive) {
        admin.failedLoginAttempts = (admin.failedLoginAttempts || 0) + 1;
        
        // Exponential lockout starting at 5 attempts
        if (admin.failedLoginAttempts >= 5) {
          const lockMinutes = 15 * Math.pow(2, Math.min(admin.failedLoginAttempts - 5, 6)); // 15m, 30m, 60m...
          admin.lockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000);
          
          await auditLogService.logAction({
            action: 'account_lockout',
            actor: { _id: admin._id, email: admin.email },
            details: { failedAttempts: admin.failedLoginAttempts, lockMinutes, ip: clientIp },
            req
          });
        }
        await admin.save();
      }

      await auditLogService.logAction({
        action: 'login_failure',
        actor: { _id: actorId, email: normalizedEmail },
        details: { ip: clientIp, domainMismatch: !!domainMismatch },
        req
      });

      // Increment shared rate limits
      await incrementRateLimitKey(`rl:login:ip:${clientIp}`, 15 * 60 * 1000);
      await incrementRateLimitKey(`rl:login:account:${normalizedEmail}`, 15 * 60 * 1000);

      if (domainMismatch) {
        if (isSuperAdminDomain && admin.role !== 'super_admin') {
          return res.status(403).json({
            success: false,
            error: 'Access Denied',
            message: 'Only Super Admin accounts are allowed to log in on admin.kwickbot.in.'
          });
        }
        if (!isSuperAdminDomain && admin.role === 'super_admin') {
          return res.status(403).json({
            success: false,
            error: 'Access Denied',
            message: 'Super Admin account detected. Please log in via https://admin.kwickbot.in'
          });
        }
      }

      return res.status(401).json(GENERIC_LOGIN_ERROR);
    }

    // SUCCESSFUL LOGIN
    admin.failedLoginAttempts = 0;
    admin.lockedUntil = null;
    admin.lastLogin = new Date();
    pruneExpiredRefreshTokens(admin);

    const { accessToken, refreshToken } = issueSessionTokens(admin, req);
    await admin.save();

    // Reset rate limits on successful login
    await resetRateLimitKey(`rl:login:ip:${clientIp}`);
    await resetRateLimitKey(`rl:login:account:${normalizedEmail}`);

    await auditLogService.logAction({
      action: 'login_success',
      actor: { _id: admin._id, email: admin.email },
      details: { ip: clientIp },
      req
    });

    res.cookie(getRefreshCookieName(), refreshToken, getRefreshCookieOptions());

    return res.json({
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
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip || '127.0.0.1';

    const admin = await Admin.findById(decoded.id);

    if (!admin || !admin.isActive) {
      clearRefreshCookie(res);
      return res.status(401).json({
        success: false,
        error: 'Session not found',
        message: 'Please sign in again'
      });
    }

    // Look for matching active session
    let session = (admin.refreshTokens || []).find(s => s.hash === refreshHash || (decoded.sessionId && s.sessionId === decoded.sessionId && s.hash === refreshHash));

    if (!session) {
      // Requirement 5 & 6: REUSE DETECTION for previously rotated token!
      const reusedSession = (admin.refreshTokens || []).find(s => Array.isArray(s.previousHashes) && s.previousHashes.includes(refreshHash));

      if (reusedSession) {
        console.warn(`🚨 REFRESH TOKEN REUSE DETECTED for user ${admin.email} (Session: ${reusedSession.sessionId})`);
        
        // Revoke the entire session family for security
        admin.refreshTokens = admin.refreshTokens.filter(s => s.sessionId !== reusedSession.sessionId);
        await admin.save();

        await auditLogService.logAction({
          action: 'refresh_token_reuse_detected',
          actor: { _id: admin._id, email: admin.email },
          details: { sessionId: reusedSession.sessionId, ip: clientIp },
          req
        });

        clearRefreshCookie(res);
        return res.status(401).json({
          success: false,
          error: 'Security violation',
          message: 'Refresh token reuse detected. Your session has been revoked for security.'
        });
      }

      clearRefreshCookie(res);
      return res.status(401).json({
        success: false,
        error: 'Session not found',
        message: 'Please sign in again'
      });
    }

    const now = Date.now();

    // Check absolute session lifetime limit
    if (session.expiresAt && new Date(session.expiresAt).getTime() <= now) {
      admin.refreshTokens = admin.refreshTokens.filter(s => s.sessionId !== session.sessionId);
      await admin.save();
      clearRefreshCookie(res);
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Maximum session lifetime reached. Please login again'
      });
    }

    // Check idle timeout limit
    if (session.lastActivity && (now - new Date(session.lastActivity).getTime() > IDLE_TIMEOUT_MS)) {
      admin.refreshTokens = admin.refreshTokens.filter(s => s.sessionId !== session.sessionId);
      await admin.save();
      clearRefreshCookie(res);
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        message: 'Session expired due to inactivity. Please login again'
      });
    }

    // ROTATE TOKEN within existing session family
    const newAccessToken = generateAccessToken(admin._id, { sessionId: session.sessionId });
    const newRefreshToken = generateRefreshToken(admin._id, { sessionId: session.sessionId });

    session.previousHashes = session.previousHashes || [];
    session.previousHashes.push(refreshHash);
    if (session.previousHashes.length > 10) {
      session.previousHashes.shift();
    }

    session.hash = hashToken(newRefreshToken);
    session.lastActivity = new Date();
    session.idleExpiresAt = new Date(Date.now() + IDLE_TIMEOUT_MS);
    session.ipAddress = clientIp;
    session.userAgent = req.get('user-agent') || session.userAgent;

    await admin.save();

    res.cookie(getRefreshCookieName(), newRefreshToken, getRefreshCookieOptions());

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        token: newAccessToken,
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
      let decoded;
      try {
        decoded = verifyRefreshToken(refreshToken);
      } catch (e) {}

      const sessionId = decoded?.sessionId;

      const admin = await Admin.findOne({
        $or: [
          { 'refreshTokens.hash': refreshHash },
          { 'refreshTokens.previousHashes': refreshHash },
          { 'refreshTokens.sessionId': sessionId }
        ]
      });

      if (admin) {
        admin.refreshTokens = (admin.refreshTokens || []).filter((session) => {
          if (sessionId && session.sessionId === sessionId) return false;
          if (session.hash === refreshHash) return false;
          if (Array.isArray(session.previousHashes) && session.previousHashes.includes(refreshHash)) return false;
          return true;
        });
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
    const PricingPlan = require('../../models/PricingPlan');
    const plans = await PricingPlan.find({ isActive: true, isPublished: true })
      .sort({ category: 1, displayOrder: 1 });
    
    let rzpKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkey';
    try {
      const GlobalSettings = require('../../models/GlobalSettings');
      const keyIdSetting = await GlobalSettings.findOne({ key: 'razorpay_key_id' });
      if (keyIdSetting && keyIdSetting.value) rzpKeyId = keyIdSetting.value;
    } catch (err) {
      console.error('Error fetching dynamic Razorpay key ID from DB:', err.message);
    }

    res.json({
      success: true,
      data: plans,
      razorpayKeyId: rzpKeyId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Public read-only endpoint for website pricing page (no auth token required)
 */
exports.getPublicPlans = async (req, res) => {
  try {
    const PricingPlan = require('../../models/PricingPlan');
    const plans = await PricingPlan.find({ isActive: true, isPublished: true })
      .select('-__v -createdAt -updatedAt')
      .sort({ category: 1, displayOrder: 1 });

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error('Error fetching public plans:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch public pricing plans'
    });
  }
};

/**
 * Upgrade/Downgrade merchant subscription plan
 */
exports.upgradePlan = async (req, res) => {
  try {
    const { planName, couponCode } = req.body;
    const allowedPlans = ['starter', 'growth', 'scale'];
    if (!allowedPlans.includes(planName)) {
      return res.status(400).json({ success: false, error: 'Invalid plan selected' });
    }

    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Admin not found' });
    }

    // Restrict plan modifications to super admin role only
    if (admin.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only Super Admin can change subscription plans.'
      });
    }

    let discountPercent = 0;
    if (couponCode) {
      const Coupon = require('../../models/Coupon');
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
      if (coupon && (!coupon.expiresAt || coupon.expiresAt > new Date())) {
        discountPercent = coupon.discountPercent;
      }
    }

    const PricingPlan = require('../../models/PricingPlan');
    const planDetails = await PricingPlan.findOne({ name: planName, isActive: true });

    let originalPrice = 1499;
    if (!planDetails) {
      const fallbacks = {
        starter: { price: 1499, limit: 50000 },
        growth: { price: 2999, limit: 200000 },
        scale: { price: 9999, limit: -1 }
      };
      
      const fallback = fallbacks[planName];
      admin.subscriptionPlan = planName;
      originalPrice = fallback.price;
      admin.geminiTokensLimit = fallback.limit;
    } else {
      admin.subscriptionPlan = planName;
      originalPrice = planDetails.monthlyPrice;
      admin.geminiTokensLimit = planDetails.features.geminiTokensPerMonth;
    }

    admin.monthlyPrice = originalPrice - (originalPrice * discountPercent / 100);
    admin.customDiscount = discountPercent;
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
    const { name, businessName, businessPhone, storeUrl, storeCategory, supportEmail, currency, timezone, theme, aiBotEnabled, aiDraftMode, customBranding } = req.body;
    
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
    if (aiBotEnabled !== undefined) admin.aiBotEnabled = aiBotEnabled;
    if (aiDraftMode !== undefined) admin.aiDraftMode = aiDraftMode;

    if (customBranding !== undefined) {
      const subscriptionService = require('../../services/subscriptionService');
      const isAllowed = subscriptionService.isFeatureAllowed(admin.subscriptionPlan, 'customBranding');
      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          error: 'Custom Branding (White-Labeling) is only available on the Scale plan. Please upgrade your subscription to unlock this feature.'
        });
      }
      admin.customBranding = {
        logoUrl: customBranding.logoUrl !== undefined ? customBranding.logoUrl : admin.customBranding?.logoUrl,
        brandName: customBranding.brandName !== undefined ? customBranding.brandName : admin.customBranding?.brandName,
        removeCredits: customBranding.removeCredits !== undefined ? customBranding.removeCredits : admin.customBranding?.removeCredits
      };
    }

    // Check if the profile is newly completed (all required fields present)
    const isNowCompleted = !!(
      (businessName !== undefined ? businessName : admin.businessName) &&
      (businessPhone !== undefined ? businessPhone : admin.businessPhone) &&
      (storeUrl !== undefined ? storeUrl : admin.storeUrl) &&
      (supportEmail !== undefined ? supportEmail : admin.supportEmail)
    );

    if (isNowCompleted && !admin.profileCompleted) {
      admin.profileCompleted = true;
      admin.profileCompletedAt = new Date();
      admin.trialStartedAt = new Date();
      admin.subscriptionStatus = 'trial';
      admin.subscriptionStartDate = new Date();
      admin.subscriptionEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14-day free trial
    }

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

/**
 * Forgot password request
 */
exports.forgotPassword = async (req, res) => {
  try {
    const crypto = require('crypto');
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    const normalizedEmail = (email || '').toLowerCase().trim();
    const admin = await Admin.findOne({ email: normalizedEmail });
    const actorId = admin ? admin._id : new mongoose.Types.ObjectId();

    await auditLogService.logAction({
      action: 'password_reset_request',
      actor: { _id: actorId, email: normalizedEmail },
      details: { accountExists: !!admin },
      req
    });

    const GENERIC_FORGOT_SUCCESS = {
      success: true,
      message: 'If an account with that email address exists, password reset instructions have been sent.'
    };

    if (!admin) {
      return res.json(GENERIC_FORGOT_SUCCESS);
    }

    // Generate crypto token
    const resetToken = crypto.randomBytes(20).toString('hex');
    admin.resetPasswordToken = resetToken;
    admin.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiration
    await admin.save();

    // Reset URL
    const resetUrl = `${getFrontendUrl(req)}/reset-password/${resetToken}`;

    const mailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Inter', Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 700; }
          .content { padding: 40px; }
          .content h2 { color: #1f2937; font-size: 20px; margin-bottom: 16px; }
          .content p { color: #4b5563; line-height: 1.6; margin-bottom: 16px; }
          .button { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); color: white !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; text-align: center; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${admin.name},</h2>
            <p>You requested a password reset for your Kwickbot admin account. Click the button below to set a new password. This link is valid for 1 hour.</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button" style="color: white !important;">Reset Password</a>
            </div>
            
            <p>If you didn't request this reset, you can safely ignore this email. Your password will remain unchanged.</p>
            <p>If the button doesn't work, copy and paste this URL into your browser:</p>
            <p style="word-break: break-all; color: #4f46e5;">${resetUrl}</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Kwickbot. All rights reserved.</p>
            <p>This is an automated system notification.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailText = `Hello ${admin.name},\n\nYou requested a password reset for your Kwickbot admin account.\n\nPlease set a new password using the link below:\n${resetUrl}\n\nThis link is valid for 1 hour.\n\nIf you did not request this, you can safely ignore this email.\n\nBest regards,\nKwickbot Team`;

    // Send the mail using unified email service
    try {
      const emailResult = await emailService.sendEmail({
        to: admin.email,
        subject: 'Reset Your Account Password',
        html: mailHtml,
        text: mailText
      });
      if (!emailResult.success) {
        console.warn(`⚠️ Email skipped or failed. Printing password reset URL: ${resetUrl}`);
      }
    } catch (emailErr) {
      console.error('❌ Error sending password reset email:', emailErr.message);
      console.warn(`⚠️ Printing password reset URL: ${resetUrl}`);
    }

    return res.json(GENERIC_FORGOT_SUCCESS);

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Reset password
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'New password is required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    const admin = await Admin.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!admin) {
      return res.status(400).json({
        success: false,
        error: 'Password reset token is invalid or has expired'
      });
    }

    // Hash of new password is handled by adminSchema pre('save') hook
    admin.password = password;
    admin.resetPasswordToken = null;
    admin.resetPasswordExpires = null;
    admin.refreshTokens = []; // Clear active sessions to force re-login
    admin.failedLoginAttempts = 0;
    admin.lockedUntil = null;
    await admin.save();

    await auditLogService.logAction({
      action: 'password_reset_success',
      actor: { _id: admin._id, email: admin.email },
      req
    });

    res.json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Verify Coupon Code validity
 */
exports.verifyCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, error: 'Promo code is required' });
    }
    
    const Coupon = require('../../models/Coupon');
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) {
      return res.status(404).json({ success: false, error: 'Invalid coupon code' });
    }
    
    if (!coupon.isActive) {
      return res.status(400).json({ success: false, error: 'This coupon is no longer active' });
    }
    
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return res.status(400).json({ success: false, error: 'This coupon has expired' });
    }
    
    res.json({
      success: true,
      message: 'Coupon verified successfully!',
      data: {
        code: coupon.code,
        discountPercent: coupon.discountPercent
      }
    });
  } catch (error) {
    console.error('Error verifying coupon:', error);
    res.status(500).json({ success: false, error: 'Failed to verify coupon' });
  }
};

/**
 * Create Razorpay Order for Plan Subscription
 */
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { planName, planId, billingCycle = 'monthly', couponCode } = req.body;

    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Merchant admin not found' });
    }

    const PricingPlan = require('../../models/PricingPlan');
    let planDetails = null;

    if (planId) {
      planDetails = await PricingPlan.findById(planId);
    }
    if (!planDetails && planName) {
      planDetails = await PricingPlan.findOne({
        $or: [{ name: planName }, { slug: planName }],
        isActive: true
      });
    }

    if (!planDetails) {
      return res.status(404).json({ success: false, error: 'Selected pricing plan not found or inactive' });
    }

    if (planDetails.contactSales) {
      return res.status(400).json({ success: false, error: 'Contact Sales plans must be processed through custom setup' });
    }

    const cycle = (billingCycle === 'yearly') ? 'yearly' : 'monthly';
    if (Array.isArray(planDetails.allowedBillingCycles) && !planDetails.allowedBillingCycles.includes(cycle)) {
      return res.status(400).json({ success: false, error: `The selected plan does not support ${cycle} billing` });
    }

    // Server-side calculated base price (Never trust frontend price)
    let basePrice = (cycle === 'yearly' && planDetails.yearlyPrice)
      ? planDetails.yearlyPrice
      : planDetails.monthlyPrice;

    if (planDetails.setupFee && planDetails.setupFee > 0) {
      basePrice += planDetails.setupFee;
    }

    let finalPrice = basePrice;
    let discountAmount = 0;

    if (couponCode) {
      const Coupon = require('../../models/Coupon');
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
      if (!coupon) {
        return res.status(400).json({ success: false, error: 'Invalid coupon code' });
      }
      if (!coupon.isActive) {
        return res.status(400).json({ success: false, error: 'This coupon is no longer active' });
      }
      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        return res.status(400).json({ success: false, error: 'This coupon has expired' });
      }

      discountAmount = (basePrice * coupon.discountPercent) / 100;
      finalPrice = basePrice - discountAmount;
    }

    const amountInPaise = Math.round(finalPrice * 100);
    const currency = planDetails.currency || 'INR';

    const Razorpay = require('razorpay');
    let rzpKeyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_mockkey';
    let rzpKeySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_mocksecret';
    try {
      const GlobalSettings = require('../../models/GlobalSettings');
      const keyIdSetting = await GlobalSettings.findOne({ key: 'razorpay_key_id' });
      const keySecretSetting = await GlobalSettings.findOne({ key: 'razorpay_key_secret' });
      if (keyIdSetting && keyIdSetting.value) rzpKeyId = keyIdSetting.value;
      if (keySecretSetting && keySecretSetting.value) rzpKeySecret = keySecretSetting.value;
    } catch (err) {
      console.error('Error fetching dynamic Razorpay credentials from DB:', err.message);
    }

    const razorpay = new Razorpay({
      key_id: rzpKeyId,
      key_secret: rzpKeySecret
    });

    const options = {
      amount: amountInPaise,
      currency: currency,
      receipt: `sub_${admin._id.toString().slice(-6)}_${Date.now()}`,
      notes: {
        adminId: admin._id.toString(),
        planId: planDetails._id.toString(),
        planName: planDetails.name,
        billingCycle: cycle,
        couponCode: couponCode || ''
      }
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      data: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        planName: planDetails.name,
        planId: planDetails._id,
        billingCycle: cycle,
        discountAmount,
        finalPrice
      }
    });

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate payment' });
  }
};

/**
 * Verify Razorpay Signature and Upgrade Plan
 */
exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const { planName, planId, billingCycle = 'monthly', razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;
    
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Missing payment details for verification' });
    }

    // Verify signature
    const crypto = require('crypto');
    let keySecret = process.env.RAZORPAY_KEY_SECRET || 'rzp_mocksecret';
    try {
      const GlobalSettings = require('../../models/GlobalSettings');
      const keySecretSetting = await GlobalSettings.findOne({ key: 'razorpay_key_secret' });
      if (keySecretSetting && keySecretSetting.value) keySecret = keySecretSetting.value;
    } catch (err) {
      console.error('Error fetching dynamic Razorpay secret from DB:', err.message);
    }
    const hmac = crypto.createHmac('sha256', keySecret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Payment signature mismatch' });
    }

    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Merchant admin not found' });
    }

    const PricingPlan = require('../../models/PricingPlan');
    let planDetails = null;

    if (planId) {
      planDetails = await PricingPlan.findById(planId);
    }
    if (!planDetails && planName) {
      planDetails = await PricingPlan.findOne({
        $or: [{ name: planName }, { slug: planName }],
        isActive: true
      });
    }

    if (!planDetails) {
      return res.status(404).json({ success: false, error: 'Selected pricing plan not found' });
    }

    const cycle = (billingCycle === 'yearly') ? 'yearly' : 'monthly';
    const originalPrice = (cycle === 'yearly' && planDetails.yearlyPrice)
      ? planDetails.yearlyPrice
      : planDetails.monthlyPrice;

    const tokensLimit = planDetails.usageLimits?.geminiTokensPerMonth ?? 50000;
    const durationDays = cycle === 'yearly' ? 365 : 30;

    // Save price snapshot and update admin subscription details
    admin.pricingPlanId = planDetails._id;
    admin.subscriptionPlan = planDetails.name;
    admin.billingCycle = cycle;
    admin.monthlyPrice = originalPrice;
    admin.geminiTokensLimit = tokensLimit;
    admin.allowedPages = (planDetails.allowedPages && planDetails.allowedPages.length > 0)
      ? planDetails.allowedPages
      : admin.allowedPages;
    admin.subscriptionStatus = 'active';
    admin.subscriptionStartDate = new Date();
    admin.subscriptionEndDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    admin.totalMessagesProcessed = 0;
    admin.geminiTokensUsed = 0;
    admin.limitNotificationSent = false;
    await admin.save();

    // Create invoice history record
    const Invoice = require('../../models/Invoice');
    const lastInvoice = await Invoice.findOne().sort({ createdAt: -1 });
    let nextNum = 1001;
    if (lastInvoice && lastInvoice.invoiceNumber) {
      const parsed = parseInt(lastInvoice.invoiceNumber.replace('INV-', ''));
      if (!isNaN(parsed)) nextNum = parsed + 1;
    }

    const invoice = new Invoice({
      invoiceNumber: `INV-${nextNum}`,
      customerId: admin._id,
      customerPhone: admin.phone || admin.businessPhone || '9999999999',
      customerName: admin.name || admin.businessName || 'Merchant',
      customerEmail: admin.email,
      subtotal: originalPrice,
      totalAmount: originalPrice,
      status: 'paid',
      paymentStatus: 'completed',
      paymentTerms: 'Due on Receipt',
      dueDate: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
      items: [
        {
          description: `Kwickbot ${planDetails.displayName} Subscription (${cycle.toUpperCase()})`,
          quantity: 1,
          unitPrice: originalPrice,
          amount: originalPrice
        }
      ]
    });
    await invoice.save();

    // Notify super admins via WhatsApp of subscription upgrade
    try {
      const superAdminBotService = require('../../services/superAdminBotService');
      await superAdminBotService.notifySubscriptionUpgrade(admin, planName, originalPrice);
    } catch (waErr) {
      console.error('Error notifying super admins of subscription upgrade:', waErr.message);
    }

    // Generate Invoice PDF
    let pdfUrl = null;
    try {
      const invoicePdfService = require('../../services/invoicePdfService');
      await invoicePdfService.generateInvoicePDF(invoice, admin);
      
      const getBackendUrl = (req) => {
        if (process.env.BACKEND_URL) return process.env.BACKEND_URL;
        return `${req.protocol}://${req.get('host')}`;
      };
      
      pdfUrl = `${getBackendUrl(req)}/uploads/invoices/${invoice.invoiceNumber}.pdf`;
      console.log(`✅ Invoice PDF generated successfully: ${pdfUrl}`);
    } catch (pdfError) {
      console.error('❌ Error generating invoice PDF:', pdfError.message);
    }

    // Send WhatsApp Invoice notification
    try {
      const whatsappCloudAPI = require('../../services/whatsappCloudAPI');
      const targetPhone = admin.phone || admin.businessPhone;
      if (targetPhone) {
        const formattedStartDate = new Date(admin.subscriptionStartDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
        const formattedEndDate = new Date(admin.subscriptionEndDate).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });

        const whatsappMessage = `🧾 *Kwickbot AI - Invoice & Subscription Confirmation*

Dear *${admin.name}*,

Thank you for upgrading! Your payment has been successfully processed and your subscription is active.

💳 *Invoice Details:*
• *Invoice Number:* ${invoice.invoiceNumber}
• *Plan Name:* ${planName.toUpperCase()} Plan
• *Amount Paid:* ₹${originalPrice} (INR)
• *Payment Status:* Paid
• *Billing Cycle:* ${formattedStartDate} to ${formattedEndDate}

🤖 *Usage Limits:*
• *Gemini AI Tokens:* ${tokensLimit.toLocaleString()} / month

Your AI support bot is now fully operational. You can manage your channels and templates directly from your dashboard:
🔗 ${getFrontendUrl(req)}/dashboard

If you need any assistance, feel free to reply to this message.

Best regards,
*Kwickbot Team*`;

        // 1. Send the text notification
        const waResult = await whatsappCloudAPI.sendMessage(targetPhone, whatsappMessage);
        if (waResult.success) {
          console.log(`✅ Invoice WhatsApp text sent to ${targetPhone}`);
        } else {
          console.error(`❌ Invoice WhatsApp text failed:`, waResult.error);
        }

        // 2. Send the PDF Document invoice if successfully created
        if (pdfUrl) {
          const docResult = await whatsappCloudAPI.sendDocument(
            targetPhone, 
            pdfUrl, 
            `Invoice-${invoice.invoiceNumber}.pdf`
          );
          if (docResult.success) {
            console.log(`✅ Invoice PDF document sent to WhatsApp: ${targetPhone}`);
          } else {
            console.error(`❌ Invoice PDF document send failed:`, docResult.error);
          }
        }
      }
    } catch (waError) {
      console.error('❌ Error sending invoice WhatsApp notification:', waError.message);
    }


    res.json({
      success: true,
      message: 'Payment verified and plan upgraded successfully!',
      data: {
        subscriptionPlan: admin.subscriptionPlan,
        subscriptionStatus: admin.subscriptionStatus,
        monthlyPrice: admin.monthlyPrice
      }
    });

  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    res.status(500).json({ success: false, error: 'Failed to verify payment' });
  }
};

// Get Merchant API Key
exports.getApiKey = async (req, res) => {
  try {
    const crypto = require('crypto');
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Merchant not found' });
    }

    if (!admin.apiKey) {
      admin.apiKey = 'kw_live_' + crypto.randomBytes(16).toString('hex');
      await admin.save();
    }

    res.json({
      success: true,
      apiKey: admin.apiKey
    });
  } catch (error) {
    console.error('Error fetching API key:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch API key' });
  }
};

// Regenerate or Custom Set Merchant API Key
exports.regenerateApiKey = async (req, res) => {
  try {
    const crypto = require('crypto');
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Merchant not found' });
    }

    const { customKey } = req.body;
    if (customKey && typeof customKey === 'string' && customKey.trim().length > 0) {
      admin.apiKey = customKey.trim();
    } else {
      admin.apiKey = 'kw_live_' + crypto.randomBytes(16).toString('hex');
    }

    await admin.save();

    res.json({
      success: true,
      message: 'API Key updated successfully!',
      apiKey: admin.apiKey
    });
  } catch (error) {
    console.error('Error updating API key:', error);
    res.status(500).json({ success: false, error: 'Failed to update API key' });
  }
};

// Get Effective Access Payload (Canonical Modules, Granular Permissions, Usage Limits)
exports.getEffectiveAccess = async (req, res) => {
  try {
    const permissionService = require('../../services/permissionService');
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    const payload = await permissionService.getEffectiveAccessPayload(admin);
    res.json(payload);
  } catch (error) {
    console.error('Error fetching effective access:', error);
    res.status(500).json({ success: false, error: 'Failed to resolve effective permissions' });
  }
};