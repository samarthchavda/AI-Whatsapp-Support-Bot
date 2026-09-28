const IntegrationEvent = require('../models/IntegrationEvent');
const { logAction } = require('./auditLogService');

/**
 * Calculates exponential backoff delay in milliseconds
 * Formula: min(2^retryCount * 60 seconds, 24 hours)
 */
function calculateNextRetryDate(retryCount) {
  const baseSeconds = 60; // 1 minute base
  const delaySeconds = Math.min(Math.pow(2, retryCount) * baseSeconds, 86400); // max 24h
  return new Date(Date.now() + delaySeconds * 1000);
}

/**
 * Register or find an integration event with idempotency protection.
 * If an event with the same adminId + idempotencyKey already exists, returns existing event.
 */
async function registerEvent({
  adminId,
  connectionId = null,
  provider = 'custom',
  eventType,
  direction = 'outbound',
  idempotencyKey = null,
  externalRecordId = null,
  internalRecordId = null,
  requestPayload = null,
  maxRetries = 5
}) {
  if (idempotencyKey) {
    const existing = await IntegrationEvent.findOne({ adminId, idempotencyKey });
    if (existing) {
      return {
        event: existing,
        isDuplicate: true
      };
    }
  }

  const requestSummary = requestPayload
    ? JSON.stringify(requestPayload).substring(0, 2000)
    : null;

  const event = new IntegrationEvent({
    adminId,
    connectionId,
    provider,
    eventType,
    direction,
    idempotencyKey,
    externalRecordId,
    internalRecordId,
    requestSummary,
    status: 'pending',
    maxRetries
  });

  await event.save();

  return {
    event,
    isDuplicate: false
  };
}

/**
 * Marks an event as completed with response summary
 */
async function markEventCompleted(event, responsePayload = null) {
  event.status = 'completed';
  event.processedAt = new Date();
  event.nextRetryAt = null;
  if (responsePayload) {
    event.responseSummary = (typeof responsePayload === 'object' ? JSON.stringify(responsePayload) : String(responsePayload)).substring(0, 2000);
  }
  await event.save();
  return event;
}

/**
 * Marks an event as failed and schedules next exponential retry or moves to dead_letter
 */
async function markEventFailed(event, error) {
  event.retryCount = (event.retryCount || 0) + 1;
  event.errorCode = error.code || 'EVENT_PROCESSING_FAILED';
  event.errorMessageSanitized = (error.message || String(error)).substring(0, 1000);

  if (event.retryCount >= event.maxRetries) {
    event.status = 'dead_letter';
    event.nextRetryAt = null;
  } else {
    event.status = 'failed';
    event.nextRetryAt = calculateNextRetryDate(event.retryCount);
  }

  await event.save();
  return event;
}

/**
 * Supervised manual replay of a failed/dead_letter integration event
 */
async function replayEvent(admin, eventId) {
  const event = await IntegrationEvent.findOne({
    _id: eventId,
    adminId: admin._id
  });

  if (!event) {
    throw new Error('Event not found');
  }

  if (event.status !== 'failed' && event.status !== 'dead_letter') {
    throw new Error(`Cannot replay event in "${event.status}" status. Only failed or dead_letter events can be replayed.`);
  }

  // Reset status to pending for immediate re-execution
  event.status = 'pending';
  event.nextRetryAt = new Date();
  event.errorMessageSanitized = null;
  event.errorCode = null;
  await event.save();

  await logAction({
    action: 'integration_event_replayed',
    actor: admin,
    target: event._id.toString(),
    details: {
      eventType: event.eventType,
      provider: event.provider,
      retryCount: event.retryCount
    }
  });

  return event;
}

module.exports = {
  calculateNextRetryDate,
  registerEvent,
  markEventCompleted,
  markEventFailed,
  replayEvent
};
