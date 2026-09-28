const permissionService = require('../services/permissionService');

/**
 * Middleware to require a specific page access.
 * Checks authentication, account validity (402 if inactive/expired), and page authorization (403).
 */
function requirePage(pageKey) {
  return async (req, res, next) => {
    try {
      if (!req.admin) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      // Check subscription validity
      const statusCheck = permissionService.validateAccountSubscription(req.admin);
      if (!statusCheck.valid) {
        return res.status(402).json({
          success: false,
          code: statusCheck.code,
          error: statusCheck.reason,
          requiresPayment: true
        });
      }

      const isAllowed = await permissionService.hasPageAccess(req.admin, pageKey);
      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          error: `Access denied. The "${pageKey}" module is not included in your current subscription plan.`,
          requiredPage: pageKey
        });
      }

      next();
    } catch (error) {
      console.error('RBAC page authorization error:', error);
      res.status(500).json({ success: false, error: 'Failed to verify page authorization' });
    }
  };
}

/**
 * Middleware to require a granular permission key.
 */
function requirePermission(permissionKey) {
  return async (req, res, next) => {
    try {
      if (!req.admin) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const statusCheck = permissionService.validateAccountSubscription(req.admin);
      if (!statusCheck.valid) {
        return res.status(402).json({
          success: false,
          code: statusCheck.code,
          error: statusCheck.reason,
          requiresPayment: true
        });
      }

      const isAllowed = await permissionService.hasPermission(req.admin, permissionKey);
      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          error: `Action forbidden. You do not possess the "${permissionKey}" permission.`,
          requiredPermission: permissionKey
        });
      }

      next();
    } catch (error) {
      console.error('RBAC permission authorization error:', error);
      res.status(500).json({ success: false, error: 'Failed to verify permission' });
    }
  };
}

/**
 * Middleware to require a specific plan feature flag.
 */
function requirePlanFeature(featureKey) {
  return async (req, res, next) => {
    try {
      if (!req.admin) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const isAllowed = await permissionService.hasPlanFeature(req.admin, featureKey);
      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          error: `Feature "${featureKey}" is not enabled on your subscription plan.`,
          requiredFeature: featureKey
        });
      }

      next();
    } catch (error) {
      console.error('RBAC feature authorization error:', error);
      res.status(500).json({ success: false, error: 'Failed to verify feature entitlement' });
    }
  };
}

/**
 * Middleware to enforce tenant resource ownership.
 * If resource not found or belongs to another merchant, returns 404 (does not leak existence).
 */
function requireTenantOwnership(Model, idParam = 'id') {
  return async (req, res, next) => {
    try {
      if (!req.admin) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      const resourceId = req.params[idParam];
      if (!resourceId) {
        return res.status(400).json({ success: false, error: `Missing :${idParam} parameter` });
      }

      // Query resource restricted strictly to tenant adminId
      const resource = await Model.findOne({
        _id: resourceId,
        adminId: req.admin._id
      });

      if (!resource) {
        return res.status(404).json({ success: false, error: 'Resource not found' });
      }

      req.tenantResource = resource;
      next();
    } catch (error) {
      if (error.name === 'CastError') {
        return res.status(404).json({ success: false, error: 'Resource not found' });
      }
      console.error('Tenant ownership check error:', error);
      res.status(500).json({ success: false, error: 'Failed to verify resource ownership' });
    }
  };
}

/**
 * Middleware to enforce numerical usage limits.
 */
function enforceUsageLimit(limitKey) {
  return async (req, res, next) => {
    try {
      if (!req.admin) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
      }

      if (req.admin.role === 'super_admin') {
        return next();
      }

      const plan = await permissionService.getAdminPricingPlan(req.admin);
      const limit = plan?.usageLimits?.[limitKey];

      if (limit === -1 || limit === Infinity || limit === undefined) {
        return next();
      }

      // Check current counter on admin or usage records
      let currentCount = 0;
      if (limitKey === 'maxWhatsAppConnections') {
        currentCount = (req.admin.whatsappConnections || []).length;
      } else if (limitKey === 'monthlyConversations') {
        currentCount = req.admin.monthlyConversationsCount || 0;
      } else if (limitKey === 'monthlyMessages') {
        currentCount = req.admin.totalMessagesProcessed || 0;
      }

      if (currentCount >= limit) {
        return res.status(429).json({
          success: false,
          error: `Usage limit exceeded for ${limitKey}. Current: ${currentCount}, Limit: ${limit}.`,
          limitKey,
          currentCount,
          limit
        });
      }

      next();
    } catch (error) {
      console.error('Usage limit enforcement error:', error);
      res.status(500).json({ success: false, error: 'Failed to verify usage limit' });
    }
  };
}

module.exports = {
  requirePage,
  requirePermission,
  requirePlanFeature,
  requireTenantOwnership,
  enforceUsageLimit
};
