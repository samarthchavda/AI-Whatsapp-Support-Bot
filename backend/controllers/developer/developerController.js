const WebhookEndpoint = require('../../models/WebhookEndpoint');
const ApiUsageRecord = require('../../models/ApiUsageRecord');
const IntegrationEvent = require('../../models/IntegrationEvent');
const { generateRandomSecret, generateHmacSignature } = require('../../utils/cryptoUtil');
const { validateSSRF } = require('../../utils/ssrfValidator');
const { getMonthlyUsageSummary } = require('../../services/usageTrackerService');
const { replayEvent } = require('../../services/eventPipelineService');
const { logAction } = require('../../services/auditLogService');
const axios = require('axios');

// 1. Webhook Endpoints CRUD
exports.getWebhooks = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const webhooks = await WebhookEndpoint.find({ adminId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: webhooks
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch webhooks' });
  }
};

exports.createWebhook = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const { name, url, subscribedEvents } = req.body;

    if (!name || !url) {
      return res.status(400).json({ success: false, error: 'Webhook name and destination URL are required' });
    }

    const ssrfCheck = await validateSSRF(url);
    if (!ssrfCheck.isValid) {
      return res.status(400).json({ success: false, error: `Invalid webhook destination URL: ${ssrfCheck.error}` });
    }

    const rawSecret = 'whsec_' + generateRandomSecret(24);
    const webhook = new WebhookEndpoint({
      adminId,
      name: name.trim(),
      url: ssrfCheck.sanitizedUrl,
      subscribedEvents: subscribedEvents || ['*'],
      isActive: true
    });

    webhook.setSigningSecret(rawSecret);
    await webhook.save();

    await logAction({
      action: 'webhook_endpoint_created',
      actor: req.admin,
      target: webhook._id.toString(),
      details: { name: webhook.name, url: webhook.url }
    });

    const resp = webhook.toJSON();
    // Only return plaintext secret once on creation
    resp.signingSecret = rawSecret;

    res.status(201).json({
      success: true,
      message: 'Webhook endpoint created successfully. Save your signing secret securely.',
      data: resp
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create webhook endpoint' });
  }
};

exports.updateWebhook = async (req, res) => {
  try {
    const webhook = await WebhookEndpoint.findOne({
      _id: req.params.id,
      adminId: req.admin._id
    });

    if (!webhook) {
      return res.status(404).json({ success: false, error: 'Webhook not found' });
    }

    const { name, url, subscribedEvents, isActive } = req.body;
    if (name) webhook.name = name.trim();
    if (subscribedEvents) webhook.subscribedEvents = subscribedEvents;
    if (isActive !== undefined) webhook.isActive = Boolean(isActive);

    if (url) {
      const ssrfCheck = await validateSSRF(url);
      if (!ssrfCheck.isValid) {
        return res.status(400).json({ success: false, error: `Invalid webhook destination URL: ${ssrfCheck.error}` });
      }
      webhook.url = ssrfCheck.sanitizedUrl;
    }

    await webhook.save();

    res.json({
      success: true,
      message: 'Webhook endpoint updated successfully',
      data: webhook
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update webhook' });
  }
};

exports.rotateWebhookSecret = async (req, res) => {
  try {
    const webhook = await WebhookEndpoint.findOne({
      _id: req.params.id,
      adminId: req.admin._id
    });

    if (!webhook) {
      return res.status(404).json({ success: false, error: 'Webhook not found' });
    }

    const newSecret = 'whsec_' + generateRandomSecret(24);
    webhook.setSigningSecret(newSecret);
    await webhook.save();

    await logAction({
      action: 'webhook_secret_rotated',
      actor: req.admin,
      target: webhook._id.toString(),
      details: { webhookId: webhook._id }
    });

    const resp = webhook.toJSON();
    resp.signingSecret = newSecret;

    res.json({
      success: true,
      message: 'Webhook signing secret rotated successfully',
      data: resp
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to rotate webhook secret' });
  }
};

exports.testWebhook = async (req, res) => {
  try {
    const webhook = await WebhookEndpoint.findOne({
      _id: req.params.id,
      adminId: req.admin._id
    });

    if (!webhook) {
      return res.status(404).json({ success: false, error: 'Webhook not found' });
    }

    const ssrfCheck = await validateSSRF(webhook.url);
    if (!ssrfCheck.isValid) {
      return res.status(400).json({ success: false, error: `Target URL is invalid or blocked: ${ssrfCheck.error}` });
    }

    const signingSecret = webhook.getSigningSecret();
    const testPayload = {
      event: 'webhook.test',
      timestamp: Date.now(),
      data: {
        message: 'This is a test webhook verification event from Kwickbot',
        endpointId: webhook._id.toString()
      }
    };

    const signature = generateHmacSignature(testPayload, signingSecret);

    let deliveryStatus = 'failed';
    let statusCode = null;
    let responseText = null;

    try {
      const resp = await axios.post(webhook.url, testPayload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Kwickbot-Signature': signature,
          'User-Agent': 'Kwickbot-Webhook-Delivery/1.0'
        },
        timeout: 10000
      });
      deliveryStatus = resp.status >= 200 && resp.status < 300 ? 'success' : 'failed';
      statusCode = resp.status;
      responseText = JSON.stringify(resp.data).substring(0, 500);
    } catch (httpErr) {
      statusCode = httpErr.response?.status || 500;
      responseText = (httpErr.message || 'Connection failed').substring(0, 500);
    }

    webhook.lastDeliveryAt = new Date();
    if (deliveryStatus !== 'success') {
      webhook.failureCount = (webhook.failureCount || 0) + 1;
    }
    await webhook.save();

    res.json({
      success: deliveryStatus === 'success',
      statusCode,
      responseSummary: responseText,
      deliveredAt: webhook.lastDeliveryAt
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to dispatch test webhook' });
  }
};

exports.deleteWebhook = async (req, res) => {
  try {
    const result = await WebhookEndpoint.findOneAndDelete({
      _id: req.params.id,
      adminId: req.admin._id
    });

    if (!result) {
      return res.status(404).json({ success: false, error: 'Webhook not found' });
    }

    res.json({
      success: true,
      message: 'Webhook endpoint deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to delete webhook' });
  }
};

// 2. API Usage & Event Logs
exports.getUsage = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const summary = await getMonthlyUsageSummary(adminId, req.query.period);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch API usage' });
  }
};

exports.getLogs = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const skip = (page - 1) * limit;

    const query = { adminId };
    if (req.query.metric) query.metric = req.query.metric;

    const [logs, total] = await Promise.all([
      ApiUsageRecord.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ApiUsageRecord.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch API logs' });
  }
};

exports.getFailedWebhooks = async (req, res) => {
  try {
    const adminId = req.admin._id;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {
      adminId,
      eventType: { $regex: /webhook/i },
      status: { $in: ['failed', 'dead_letter'] }
    };

    const [events, total] = await Promise.all([
      IntegrationEvent.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      IntegrationEvent.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: events,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch failed webhooks' });
  }
};

exports.retryFailedWebhook = async (req, res) => {
  try {
    const event = await replayEvent(req.admin, req.params.id);
    res.json({
      success: true,
      message: 'Failed webhook queued for retry',
      data: event
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message || 'Failed to retry webhook' });
  }
};
