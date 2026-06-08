const webhookService = require('../services/webhookService');
const WebhookLog = require('../models/WebhookLog');

/**
 * Handle external order webhooks
 */
exports.handleExternalOrder = async (req, res) => {
  const startTime = Date.now();
  const source = req.params.source || 'custom';
  const webhookData = req.body;
  
  let webhookLog = null;
  let order = null;

  try {
    // Validate request body
    if (!webhookData || Object.keys(webhookData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Empty request body',
        message: 'Webhook payload is required'
      });
    }

    console.log(`📦 Processing ${source} webhook...`);

    // Process the webhook and create order
    const result = await webhookService.processWebhook(source, webhookData);
    order = result.order;

    console.log(`✅ Order created: ${order.orderId} (External: ${result.externalOrderId})`);

    // Send WhatsApp confirmation
    let whatsappResult = { success: false, error: 'Not attempted' };
    
    if (order.customerPhone) {
      console.log(`📱 Sending WhatsApp confirmation to ${order.customerPhone}...`);
      whatsappResult = await webhookService.sendOrderConfirmation(order, result.customer);
      
      if (whatsappResult.success) {
        console.log('✅ WhatsApp confirmation sent successfully');
      } else {
        console.warn('⚠️ WhatsApp confirmation failed:', whatsappResult.error);
      }
    }

    // Log webhook
    webhookLog = new WebhookLog({
      source,
      eventType: 'order_created',
      orderId: order.orderId,
      externalOrderId: result.externalOrderId,
      status: 'success',
      requestPayload: webhookData,
      responsePayload: {
        orderId: order.orderId,
        externalOrderId: result.externalOrderId,
        customerPhone: order.customerPhone
      },
      whatsappSent: whatsappResult.success,
      whatsappError: whatsappResult.error,
      ipAddress: req.webhookMeta?.ipAddress,
      userAgent: req.webhookMeta?.userAgent,
      processingTime: Date.now() - startTime
    });

    await webhookLog.save();

    // Return success response
    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: order.orderId,
        externalOrderId: result.externalOrderId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        totalAmount: order.totalAmount,
        status: order.status,
        whatsappSent: whatsappResult.success,
        processingTime: `${Date.now() - startTime}ms`
      }
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error.message);

    // Log failed webhook
    try {
      webhookLog = new WebhookLog({
        source,
        eventType: 'order_created',
        orderId: order?.orderId || null,
        externalOrderId: webhookData?.id || webhookData?.order_id || webhookData?.order_number || 'unknown',
        status: 'failed',
        requestPayload: webhookData,
        errorMessage: error.message,
        whatsappSent: false,
        ipAddress: req.webhookMeta?.ipAddress,
        userAgent: req.webhookMeta?.userAgent,
        processingTime: Date.now() - startTime
      });

      await webhookLog.save();
    } catch (logError) {
      console.error('Failed to log webhook error:', logError.message);
    }

    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to process webhook'
    });
  }
};

/**
 * Get webhook logs
 */
exports.getWebhookLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, source, status } = req.query;
    
    let query = {};
    
    if (source) {
      query.source = source;
    }
    
    if (status) {
      query.status = status;
    }

    const logs = await WebhookLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-requestPayload -responsePayload') // Exclude large payloads
      .exec();

    const count = await WebhookLog.countDocuments(query);

    res.json({
      success: true,
      logs,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get webhook log by ID (with full payload)
 */
exports.getWebhookLogById = async (req, res) => {
  try {
    const log = await WebhookLog.findById(req.params.id);
    
    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Webhook log not found'
      });
    }

    res.json({
      success: true,
      log
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get webhook statistics
 */
exports.getWebhookStats = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const stats = await WebhookLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$source',
          total: { $sum: 1 },
          successful: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          whatsappSent: {
            $sum: { $cond: ['$whatsappSent', 1, 0] }
          },
          avgProcessingTime: { $avg: '$processingTime' }
        }
      }
    ]);

    const totalStats = await WebhookLog.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          successful: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          whatsappSent: {
            $sum: { $cond: ['$whatsappSent', 1, 0] }
          },
          avgProcessingTime: { $avg: '$processingTime' }
        }
      }
    ]);

    res.json({
      success: true,
      period: `Last ${days} days`,
      bySource: stats,
      overall: totalStats[0] || {
        total: 0,
        successful: 0,
        failed: 0,
        whatsappSent: 0,
        avgProcessingTime: 0
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
 * Test webhook endpoint (for development)
 */
exports.testWebhook = async (req, res) => {
  const testData = {
    shopify: {
      id: 'TEST-' + Date.now(),
      order_number: 'TEST-' + Math.floor(Math.random() * 10000),
      customer: {
        first_name: 'Test',
        last_name: 'Customer',
        phone: '+1234567890',
        email: 'test@example.com'
      },
      total_price: '99.99',
      line_items: [
        {
          product_id: '123',
          name: 'Test Product',
          quantity: 1,
          price: '99.99'
        }
      ],
      financial_status: 'paid',
      fulfillment_status: null,
      created_at: new Date().toISOString()
    },
    woocommerce: {
      id: Date.now(),
      number: 'TEST-' + Math.floor(Math.random() * 10000),
      billing: {
        first_name: 'Test',
        last_name: 'Customer',
        phone: '+1234567890',
        email: 'test@example.com'
      },
      total: '99.99',
      line_items: [
        {
          product_id: 123,
          name: 'Test Product',
          quantity: 1,
          price: 99.99
        }
      ],
      status: 'processing',
      date_created: new Date().toISOString()
    },
    custom: {
      order_id: 'TEST-' + Date.now(),
      customer_name: 'Test Customer',
      customer_phone: '+1234567890',
      customer_email: 'test@example.com',
      total_amount: 99.99,
      items: [
        {
          product_name: 'Test Product',
          quantity: 1,
          price: 99.99
        }
      ],
      status: 'pending',
      order_date: new Date().toISOString()
    }
  };

  const source = req.params.source || 'custom';
  req.body = testData[source] || testData.custom;
  
  return exports.handleExternalOrder(req, res);
};
