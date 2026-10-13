const axios = require('axios');
const crypto = require('crypto');

/**
 * Service to relay incoming Meta WhatsApp webhook events (customer messages, delivery statuses)
 * asynchronously to third-party merchant developer endpoints.
 */
class WebhookRelayService {
  /**
   * Generates HMAC-SHA256 signature for the webhook payload
   */
  generateSignature(payload, secret) {
    if (!secret) return '';
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', secret).update(payloadString).digest('hex');
  }

  /**
   * Generates a new secure webhook secret
   */
  generateSecret() {
    return 'whsec_' + crypto.randomBytes(16).toString('hex');
  }

  /**
   * Relays an incoming customer message to the merchant's configured webhook URL
   */
  async relayIncomingMessage(admin, message, contactName = 'Customer') {
    try {
      if (!admin || !admin.developerWebhookUrl || admin.isDeveloperWebhookActive === false) {
        return;
      }

      const events = admin.developerWebhookEvents || ['messages.received'];
      if (!events.includes('messages.received') && !events.includes('*')) {
        return;
      }

      let textBody = null;
      if (message.type === 'text') {
        textBody = message.text?.body || '';
      } else if (message.type === 'button') {
        textBody = message.button?.text || '';
      } else if (message.type === 'interactive') {
        textBody = message.interactive?.button_reply?.title || message.interactive?.list_reply?.title || '';
      }

      const payload = {
        event: 'messages.received',
        timestamp: message.timestamp ? Number(message.timestamp) : Math.floor(Date.now() / 1000),
        messageId: message.id,
        senderPhone: message.from,
        senderName: contactName,
        type: message.type,
        text: textBody,
        media: ['image', 'video', 'document', 'audio', 'sticker'].includes(message.type) ? message[message.type] : null,
        raw: message
      };

      await this.dispatchWebhook(admin.developerWebhookUrl, payload, admin.developerWebhookSecret);
    } catch (err) {
      console.warn('⚠️ [WebhookRelay] Failed to relay incoming message:', err.message);
    }
  }

  /**
   * Relays a message status update (sent, delivered, read, failed) to merchant webhook
   */
  async relayStatusUpdate(admin, status) {
    try {
      if (!admin || !admin.developerWebhookUrl || admin.isDeveloperWebhookActive === false) {
        return;
      }

      const statusType = status.status; // 'sent', 'delivered', 'read', 'failed'
      const eventKey = `messages.${statusType}`;
      const events = admin.developerWebhookEvents || [];

      // Check if subscribed to specific status or all
      const isSubscribed = events.includes(eventKey) || events.includes('*') || (statusType === 'failed' && events.includes('messages.failed'));
      if (!isSubscribed) {
        return;
      }

      const payload = {
        event: eventKey,
        status: statusType,
        timestamp: status.timestamp ? Number(status.timestamp) : Math.floor(Date.now() / 1000),
        messageId: status.id,
        recipientPhone: status.recipient_id,
        pricing: status.pricing || null,
        conversation: status.conversation || null,
        errors: status.errors || null
      };

      await this.dispatchWebhook(admin.developerWebhookUrl, payload, admin.developerWebhookSecret);
    } catch (err) {
      console.warn('⚠️ [WebhookRelay] Failed to relay status update:', err.message);
    }
  }

  /**
   * Sends a test ping to verify endpoint connectivity
   */
  async sendTestPing(webhookUrl, secret) {
    if (!webhookUrl) {
      throw new Error('Destination webhook URL is required');
    }

    const payload = {
      event: 'webhook.test_ping',
      timestamp: Math.floor(Date.now() / 1000),
      message: 'Hello from Kwickbot! This is a test webhook ping.',
      sampleData: {
        messageId: 'wamid.TEST_PING_' + Date.now(),
        status: 'delivered',
        recipientPhone: '919876543210'
      }
    };

    const startTime = Date.now();
    const result = await this.dispatchWebhook(webhookUrl, payload, secret);
    const latencyMs = Date.now() - startTime;

    return {
      success: result.success,
      statusCode: result.statusCode,
      latencyMs,
      response: result.responseBody,
      error: result.error
    };
  }

  /**
   * Internal HTTP POST dispatcher with HMAC-SHA256 signature
   */
  async dispatchWebhook(url, payload, secret) {
    try {
      const payloadString = JSON.stringify(payload);
      const signature = this.generateSignature(payloadString, secret);

      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Kwickbot-Webhook-Relay/1.0',
        'X-Kwickbot-Signature': `sha256=${signature}`,
        'X-Kwickbot-Event': payload.event || 'message'
      };

      const response = await axios.post(url, payload, {
        headers,
        timeout: 5000,
        maxContentLength: 500000
      });

      return {
        success: response.status >= 200 && response.status < 300,
        statusCode: response.status,
        responseBody: typeof response.data === 'string' ? response.data.slice(0, 300) : response.data
      };
    } catch (error) {
      return {
        success: false,
        statusCode: error.response?.status || 0,
        error: error.response?.data ? (typeof error.response.data === 'string' ? error.response.data.slice(0, 300) : error.response.data) : error.message
      };
    }
  }
}

module.exports = new WebhookRelayService();
