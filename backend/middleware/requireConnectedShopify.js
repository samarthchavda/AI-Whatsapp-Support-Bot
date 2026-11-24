const Integration = require('../models/Integration');

const requireConnectedShopify = async (req, res, next) => {
  try {
    const connected = await Integration.exists({
      adminId: req.admin._id,
      platform: 'shopify',
      isActive: true
    });

    if (!connected) {
      return res.status(409).json({
        success: false,
        code: 'STORE_CONNECTION_REQUIRED',
        error: 'Connect an active Shopify store to use abandoned cart recovery.'
      });
    }

    return next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Store connection could not be checked. Please try again.'
    });
  }
};

module.exports = requireConnectedShopify;
