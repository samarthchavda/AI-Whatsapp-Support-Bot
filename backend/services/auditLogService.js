const AuditLog = require('../models/AuditLog');

/**
 * Log a system action to MongoDB and emit via Socket.IO
 * @param {Object} param0 
 * @param {string} param0.action - Action name (e.g. 'status_toggled')
 * @param {Object} param0.actor - Actor mongoose document or { _id, email }
 * @param {string} [param0.target] - Target description or target user name
 * @param {Object} [param0.details] - Any extra parameters or details
 * @param {Object} [param0.req] - Express request object to extract IP/UserAgent
 * @returns {Promise<Object>} Created AuditLog document
 */
async function logAction({ action, actor, target = null, details = {}, req = null }) {
  try {
    if (!actor) {
      console.warn('⚠️ Attempted to log audit action without an actor');
      return null;
    }

    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress) : null;
    const userAgent = req ? req.headers['user-agent'] : null;

    const auditEntry = new AuditLog({
      action,
      actor: actor._id,
      actorEmail: actor.email,
      target,
      details,
      ipAddress,
      userAgent
    });

    await auditEntry.save();
    console.log(`📋 [AUDIT LOG] Actor: ${actor.email} | Action: ${action} | Target: ${target}`);

    // Emit live to Socket.IO if enabled
    if (global.io) {
      global.io.emit('audit_log', {
        _id: auditEntry._id,
        action,
        actorEmail: actor.email,
        target,
        details,
        ipAddress,
        createdAt: auditEntry.createdAt
      });
    }

    return auditEntry;
  } catch (error) {
    console.error('❌ Failed to save audit log:', error);
    return null;
  }
}

module.exports = {
  logAction
};
