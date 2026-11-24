const { AuditLog } = require('../models');

// Same shape as the main backend's audit entries, so they show in one log
async function audit(req, action, target, details = {}) {
  try {
    await AuditLog.create({
      action,
      actor: req.admin?._id,
      actorEmail: req.admin?.email,
      target,
      details: { ...details, via: 'super-admin-api' },
      ipAddress: req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
      userAgent: req.headers['user-agent'] || null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Audit log write failed:', error.message);
  }
}

module.exports = { audit };
