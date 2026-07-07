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
    const result = await webhookService.processWebhook(source, webhookData, req.adminId);
    order = result.order;

    let whatsappResult = { success: false, error: 'Not attempted' };

    if (result.isUpdate) {
      console.log(`✅ Order updated: ${order.orderId} (External: ${result.externalOrderId})`);

      const statusChanged = result.oldStatus !== order.status;
      const isShippedOrDelivered = order.status === 'shipped' || order.status === 'delivered';
      const isCancelled = order.status === 'cancelled';

      if (order.customerPhone && (statusChanged && (isShippedOrDelivered || isCancelled))) {
        console.log(`📱 Sending WhatsApp tracking/cancellation update to ${order.customerPhone}...`);
        whatsappResult = await webhookService.sendTrackingUpdate(order, result.customer, {
          trackingNumber: order.trackingNumber,
          status: order.status
        });

        if (whatsappResult.success) {
          console.log('✅ WhatsApp tracking update sent successfully');
        } else {
          console.warn('⚠️ WhatsApp tracking update failed:', whatsappResult.error);
        }
      }
    } else {
      console.log(`✅ Order created: ${order.orderId} (External: ${result.externalOrderId})`);

      // Send WhatsApp confirmation
      if (order.customerPhone) {
        console.log(`📱 Sending WhatsApp confirmation to ${order.customerPhone}...`);
        whatsappResult = await webhookService.sendOrderConfirmation(order, result.customer);

        if (whatsappResult.success) {
          console.log('✅ WhatsApp confirmation sent successfully');
        } else {
          console.warn('⚠️ WhatsApp confirmation failed:', whatsappResult.error);
        }
      }
    }

    // Log webhook
    webhookLog = new WebhookLog({
      source,
      eventType: result.isUpdate ? 'order_updated' : 'order_created',
      orderId: order.orderId,
      externalOrderId: result.externalOrderId,
      status: 'success',
      requestPayload: webhookData,
      responsePayload: {
        orderId: order.orderId,
        externalOrderId: result.externalOrderId,
        customerPhone: order.customerPhone,
        isUpdate: result.isUpdate,
        whatsappSent: whatsappResult.success
      },
      whatsappSent: whatsappResult.success,
      whatsappError: whatsappResult.error,
      ipAddress: req.webhookMeta?.ipAddress,
      userAgent: req.webhookMeta?.userAgent,
      processingTime: Date.now() - startTime
    });

    await webhookLog.save();

    // Return success response
    return res.status(result.isUpdate ? 200 : 201).json({
      success: true,
      message: result.isUpdate ? 'Order updated successfully' : 'Order created successfully',
      data: {
        orderId: order.orderId,
        externalOrderId: result.externalOrderId,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        totalAmount: order.totalAmount,
        status: order.status,
        whatsappSent: whatsappResult.success,
        isUpdate: result.isUpdate,
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

      // Notify super admins of webhook failure
      try {
        const superAdminBotService = require('../services/superAdminBotService');
        await superAdminBotService.notifySystemError(
          source,
          error.message,
          `Order ID: ${webhookLog.externalOrderId}`
        );
      } catch (botErr) {
        console.error('Error notifying super admins of system error:', botErr.message);
      }
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

/**
 * Handle Shopify fulfillment webhook
 */
exports.handleShopifyFulfillment = async (req, res) => {
  const startTime = Date.now();
  const webhookData = req.body;
  
  let webhookLog = null;
  
  try {
    if (!webhookData || Object.keys(webhookData).length === 0) {
      return res.status(400).json({ success: false, error: 'Empty payload' });
    }
    
    console.log('📦 Processing Shopify fulfillment webhook...');
    
    const fulfillment = webhookData.fulfillment || webhookData;
    const externalOrderId = fulfillment.order_id?.toString();
    
    if (!externalOrderId) {
      return res.status(400).json({ success: false, error: 'Order ID is missing in fulfillment payload' });
    }
    
    const trackingInfo = {
      trackingNumber: fulfillment.tracking_number || (fulfillment.tracking_numbers && fulfillment.tracking_numbers[0]),
      carrier: fulfillment.tracking_company,
      trackingUrl: fulfillment.tracking_url || (fulfillment.tracking_urls && fulfillment.tracking_urls[0]),
      status: fulfillment.shipment_status === 'delivered' ? 'delivered' : 'shipped'
    };
    
    const result = await webhookService.processFulfillmentUpdate('shopify', externalOrderId, trackingInfo, req.adminId);
    
    // Log webhook
    webhookLog = new WebhookLog({
      source: 'shopify',
      eventType: 'fulfillment_updated',
      orderId: result.order.orderId,
      externalOrderId,
      status: 'success',
      requestPayload: webhookData,
      responsePayload: {
        orderId: result.order.orderId,
        externalOrderId,
        status: result.order.status,
        whatsappSent: result.whatsappSent
      },
      whatsappSent: result.whatsappSent,
      whatsappError: result.whatsappError,
      ipAddress: req.webhookMeta?.ipAddress,
      userAgent: req.webhookMeta?.userAgent,
      processingTime: Date.now() - startTime
    });
    await webhookLog.save();
    
    return res.status(200).json({
      success: true,
      message: 'Fulfillment processed successfully',
      data: {
        orderId: result.order.orderId,
        status: result.order.status,
        whatsappSent: result.whatsappSent,
        processingTime: `${Date.now() - startTime}ms`
      }
    });
  } catch (error) {
    console.error('❌ Shopify fulfillment webhook error:', error.message);
    
    try {
      webhookLog = new WebhookLog({
        source: 'shopify',
        eventType: 'fulfillment_updated',
        externalOrderId: webhookData?.fulfillment?.order_id?.toString() || webhookData?.order_id?.toString() || 'unknown',
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
    
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Handle Generic/Custom fulfillment update
 */
exports.handleGenericFulfillment = async (req, res) => {
  const startTime = Date.now();
  const source = req.params.source || 'custom';
  const webhookData = req.body;
  
  let webhookLog = null;
  
  try {
    if (!webhookData || Object.keys(webhookData).length === 0) {
      return res.status(400).json({ success: false, error: 'Empty payload' });
    }
    
    console.log(`📦 Processing ${source} generic fulfillment update...`);
    
    const externalOrderId = webhookData.order_id || webhookData.externalOrderId || webhookData.orderId;
    const trackingNumber = webhookData.tracking_number || webhookData.trackingNumber;
    const carrier = webhookData.carrier || webhookData.tracking_company;
    const trackingUrl = webhookData.tracking_url || webhookData.trackingUrl;
    const status = webhookData.status || 'shipped';
    
    if (!externalOrderId) {
      return res.status(400).json({ success: false, error: 'order_id is required' });
    }
    
    const trackingInfo = {
      trackingNumber,
      carrier,
      trackingUrl,
      status: status.toLowerCase() === 'delivered' ? 'delivered' : 'shipped'
    };
    
    const result = await webhookService.processFulfillmentUpdate(source, externalOrderId, trackingInfo, req.adminId);
    
    // Log webhook
    webhookLog = new WebhookLog({
      source,
      eventType: 'fulfillment_updated',
      orderId: result.order.orderId,
      externalOrderId: externalOrderId.toString(),
      status: 'success',
      requestPayload: webhookData,
      responsePayload: {
        orderId: result.order.orderId,
        externalOrderId: externalOrderId.toString(),
        status: result.order.status,
        whatsappSent: result.whatsappSent
      },
      whatsappSent: result.whatsappSent,
      whatsappError: result.whatsappError,
      ipAddress: req.webhookMeta?.ipAddress,
      userAgent: req.webhookMeta?.userAgent,
      processingTime: Date.now() - startTime
    });
    await webhookLog.save();
    
    return res.status(200).json({
      success: true,
      message: 'Fulfillment update processed successfully',
      data: {
        orderId: result.order.orderId,
        status: result.order.status,
        whatsappSent: result.whatsappSent,
        processingTime: `${Date.now() - startTime}ms`
      }
    });
  } catch (error) {
    console.error(`❌ ${source} generic fulfillment update error:`, error.message);
    
    try {
      webhookLog = new WebhookLog({
        source,
        eventType: 'fulfillment_updated',
        externalOrderId: webhookData?.order_id?.toString() || 'unknown',
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
    
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Handle Shopify checkout webhooks
 */
exports.handleShopifyCheckout = async (req, res) => {
  const startTime = Date.now();
  const webhookData = req.body;
  let webhookLog = null;

  try {
    if (!webhookData || Object.keys(webhookData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Empty request body',
        message: 'Webhook payload is required'
      });
    }

    console.log(`🛒 Processing Shopify checkout webhook...`);

    // Call webhookService.processCheckout
    await webhookService.processCheckout('shopify', webhookData, req.adminId);

    // Log webhook
    webhookLog = new WebhookLog({
      source: 'shopify',
      eventType: 'checkout_updated',
      externalOrderId: webhookData.id?.toString() || webhookData.token || 'unknown',
      status: 'success',
      requestPayload: webhookData,
      responsePayload: {
        success: true,
        message: 'Checkout processed successfully'
      },
      ipAddress: req.webhookMeta?.ipAddress,
      userAgent: req.webhookMeta?.userAgent,
      processingTime: Date.now() - startTime
    });
    await webhookLog.save();

    return res.status(200).json({
      success: true,
      message: 'Checkout processed successfully',
      processingTime: `${Date.now() - startTime}ms`
    });

  } catch (error) {
    console.error('❌ Shopify checkout webhook error:', error.message);

    try {
      webhookLog = new WebhookLog({
        source: 'shopify',
        eventType: 'checkout_updated',
        externalOrderId: webhookData?.id?.toString() || webhookData?.token || 'unknown',
        status: 'failed',
        requestPayload: webhookData,
        errorMessage: error.message,
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
      message: 'Failed to process checkout webhook'
    });
  }
};

