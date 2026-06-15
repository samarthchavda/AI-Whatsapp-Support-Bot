const Order = require('../models/Order');
const Customer = require('../models/Customer');
const WebhookLog = require('../models/WebhookLog');
const Counter = require('../models/Counter');
const Admin = require('../models/Admin');
const Template = require('../models/Template');
const whatsappCloudAPI = require('./whatsappCloudAPI');
const { getNextOrderId } = require('./orderIdService');
const whatsappWebBot = require('./whatsappWebBot');

class WebhookService {
  /**
   * Map Shopify order data to our Order schema
   */
  mapShopifyOrder(shopifyData) {
    const order = shopifyData.order || shopifyData;
    
    return {
      externalOrderId: order.id?.toString() || order.order_number?.toString(),
      externalOrderNumber: order.name || order.order_number?.toString() || order.id?.toString(),
      customerName: order.customer?.first_name && order.customer?.last_name 
        ? `${order.customer.first_name} ${order.customer.last_name}`.trim()
        : order.customer?.name || order.billing_address?.name || 'Customer',
      customerPhone: this.normalizePhone(
        order.phone ||
        order.customer?.phone || 
        order.shipping_address?.phone || 
        order.billing_address?.phone ||
        order.customer?.default_address?.phone
      ),
      customerEmail: order.customer?.email || order.email,
      totalAmount: parseFloat(order.total_price || order.current_total_price || 0),
      items: (order.line_items || []).map(item => ({
        productId: item.product_id?.toString(),
        productName: item.name || item.title,
        quantity: parseInt(item.quantity) || 1,
        price: parseFloat(item.price)
      })),
      shippingAddress: order.shipping_address ? {
        street: order.shipping_address.address1,
        city: order.shipping_address.city,
        state: order.shipping_address.province,
        zipCode: order.shipping_address.zip,
        country: order.shipping_address.country
      } : undefined,
      paymentStatus: this.mapShopifyPaymentStatus(order.financial_status),
      status: order.cancelled_at ? 'cancelled' : this.mapShopifyOrderStatus(order.fulfillment_status),
      notes: order.note,
      orderDate: order.created_at ? new Date(order.created_at) : new Date()
    };
  }

  /**
   * Map WooCommerce order data to our Order schema
   */
  mapWooCommerceOrder(wooData) {
    let trackingNumber = null;
    let carrier = null;
    let trackingUrl = null;
    
    if (wooData.meta_data && Array.isArray(wooData.meta_data)) {
      // Find Advanced Shipment Tracking meta
      const astMeta = wooData.meta_data.find(m => m.key === '_wc_shipment_tracking_items');
      if (astMeta) {
        const value = astMeta.value;
        if (Array.isArray(value) && value[0]) {
          trackingNumber = value[0].tracking_number;
          carrier = value[0].tracking_provider;
          trackingUrl = value[0].custom_tracking_link || value[0].tracking_link;
        } else if (typeof value === 'object' && value) {
          trackingNumber = value.tracking_number;
          carrier = value.tracking_provider;
          trackingUrl = value.custom_tracking_link || value.tracking_link;
        }
      }
      
      // Simple tracking key fallback
      if (!trackingNumber) {
        const trackingNumMeta = wooData.meta_data.find(m => m.key === '_tracking_number');
        if (trackingNumMeta) {
          trackingNumber = trackingNumMeta.value;
        }
      }
      
      if (!carrier) {
        const carrierMeta = wooData.meta_data.find(m => m.key === '_tracking_provider' || m.key === '_tracking_company');
        if (carrierMeta) {
          carrier = carrierMeta.value;
        }
      }
    }

    return {
      externalOrderId: wooData.id?.toString() || wooData.number?.toString(),
      externalOrderNumber: wooData.number || wooData.id?.toString(),
      customerName: `${wooData.billing?.first_name || ''} ${wooData.billing?.last_name || ''}`.trim() || 'Customer',
      customerPhone: this.normalizePhone(
        wooData.billing?.phone || 
        wooData.shipping?.phone
      ),
      customerEmail: wooData.billing?.email,
      totalAmount: parseFloat(wooData.total || 0),
      items: (wooData.line_items || []).map(item => ({
        productId: item.product_id?.toString(),
        productName: item.name,
        quantity: parseInt(item.quantity) || 1,
        price: parseFloat(item.price || item.total)
      })),
      shippingAddress: wooData.shipping ? {
        street: wooData.shipping.address_1,
        city: wooData.shipping.city,
        state: wooData.shipping.state,
        zipCode: wooData.shipping.postcode,
        country: wooData.shipping.country
      } : undefined,
      paymentStatus: this.mapWooCommercePaymentStatus(wooData.status),
      status: this.mapWooCommerceOrderStatus(wooData.status),
      notes: wooData.customer_note,
      orderDate: wooData.date_created ? new Date(wooData.date_created) : new Date(),
      trackingNumber,
      carrier,
      trackingUrl
    };
  }

  /**
   * Map custom/generic order data
   */
  mapCustomOrder(customData) {
    return {
      externalOrderId: customData.order_id || customData.id || customData.order_number,
      customerName: customData.customer_name || customData.name || 'Customer',
      customerPhone: this.normalizePhone(customData.customer_phone || customData.phone),
      customerEmail: customData.customer_email || customData.email,
      totalAmount: parseFloat(customData.total_amount || customData.total || customData.amount || 0),
      items: (customData.items || customData.products || []).map(item => ({
        productId: item.product_id || item.id,
        productName: item.product_name || item.name || item.title,
        quantity: parseInt(item.quantity || item.qty) || 1,
        price: parseFloat(item.price || item.unit_price || 0)
      })),
      shippingAddress: customData.shipping_address || customData.address ? {
        street: customData.shipping_address?.street || customData.address?.street,
        city: customData.shipping_address?.city || customData.address?.city,
        state: customData.shipping_address?.state || customData.address?.state,
        zipCode: customData.shipping_address?.zip || customData.address?.zip,
        country: customData.shipping_address?.country || customData.address?.country
      } : undefined,
      paymentStatus: customData.payment_status || 'pending',
      status: customData.status || 'pending',
      notes: customData.notes || customData.note,
      orderDate: customData.order_date || customData.created_at ? new Date(customData.order_date || customData.created_at) : new Date()
    };
  }

  /**
   * Normalize phone number
   */
  normalizePhone(phone) {
    if (!phone) return null;
    
    // Remove all non-digit characters
    let cleaned = phone.toString().replace(/\D/g, '');
    
    // Remove leading zeros
    cleaned = cleaned.replace(/^0+/, '');
    
    // If it's a 10-digit number, assume it needs country code
    if (cleaned.length === 10) {
      // You can customize this based on your primary market
      cleaned = '1' + cleaned; // Default to US (+1)
    }
    
    return cleaned;
  }

  /**
   * Map Shopify payment status
   */
  mapShopifyPaymentStatus(status) {
    const statusMap = {
      'paid': 'completed',
      'pending': 'pending',
      'authorized': 'pending',
      'partially_paid': 'pending',
      'refunded': 'refunded',
      'voided': 'failed',
      'partially_refunded': 'refunded'
    };
    return statusMap[status?.toLowerCase()] || 'pending';
  }

  /**
   * Map Shopify order status
   */
  mapShopifyOrderStatus(status) {
    const statusMap = {
      'fulfilled': 'delivered',
      'partial': 'processing',
      'unfulfilled': 'pending',
      null: 'pending'
    };
    return statusMap[status?.toLowerCase()] || 'pending';
  }

  /**
   * Map WooCommerce payment status
   */
  mapWooCommercePaymentStatus(status) {
    const statusMap = {
      'completed': 'completed',
      'processing': 'completed',
      'on-hold': 'pending',
      'pending': 'pending',
      'failed': 'failed',
      'cancelled': 'failed',
      'refunded': 'refunded'
    };
    return statusMap[status?.toLowerCase()] || 'pending';
  }

  /**
   * Map WooCommerce order status
   */
  mapWooCommerceOrderStatus(status) {
    const statusMap = {
      'completed': 'delivered',
      'processing': 'processing',
      'on-hold': 'pending',
      'pending': 'pending',
      'cancelled': 'cancelled',
      'refunded': 'cancelled',
      'failed': 'cancelled'
    };
    return statusMap[status?.toLowerCase()] || 'pending';
  }

  /**
   * Process webhook and create order
   */
  async processWebhook(source, data, adminId = null) {
    const startTime = Date.now();
    let mappedData;
    
    // Map data based on source
    switch (source.toLowerCase()) {
      case 'shopify':
        mappedData = this.mapShopifyOrder(data);
        break;
      case 'woocommerce':
        mappedData = this.mapWooCommerceOrder(data);
        break;
      case 'custom':
        mappedData = this.mapCustomOrder(data);
        break;
      default:
        throw new Error(`Unsupported webhook source: ${source}`);
    }

    // Find default/demo admin if not provided
    if (!adminId) {
      let adminDoc = await Admin.findOne({ email: 'demo@store.com' });
      if (!adminDoc) adminDoc = await Admin.findOne();
      adminId = adminDoc ? adminDoc._id : null;
    }

    if (!adminId) {
      throw new Error('No admin user found in database. Please seed or create an admin first.');
    }

    if (!mappedData.externalOrderId) {
      throw new Error('External order ID is required');
    }

    // Check if order already exists
    let order = await Order.findOne({ 
      externalOrderId: mappedData.externalOrderId, 
      admin: adminId 
    });

    let isUpdate = false;
    let oldStatus = null;
    let customer = null;

    if (order) {
      isUpdate = true;
      oldStatus = order.status;

      // Update existing order details
      if (mappedData.status) order.status = mappedData.status;
      if (mappedData.paymentStatus) order.paymentStatus = mappedData.paymentStatus;
      if (mappedData.externalOrderNumber) order.externalOrderNumber = mappedData.externalOrderNumber;
      if (mappedData.totalAmount !== undefined && mappedData.totalAmount !== null) {
        order.totalAmount = mappedData.totalAmount;
      }
      if (mappedData.items && mappedData.items.length > 0) {
        order.items = mappedData.items;
      }
      
      if (mappedData.notes) order.notes = mappedData.notes;
      if (mappedData.trackingNumber) order.trackingNumber = mappedData.trackingNumber;
      if (mappedData.shippingAddress) order.shippingAddress = mappedData.shippingAddress;
      
      if (mappedData.status === 'delivered' && oldStatus !== 'delivered') {
        order.deliveredDate = new Date();
      }
      
      await order.save();

      // Retrieve customer
      customer = await Customer.findById(order.customerId);

      // If totalAmount changed, adjust customer spent stats
      if (mappedData.totalAmount !== undefined && mappedData.totalAmount !== null && customer) {
        const spentDiff = mappedData.totalAmount - (order.totalAmount || 0);
        if (spentDiff !== 0) {
          customer.totalSpent += spentDiff;
          await customer.save();
        }
      }
    } else {
      // Fallback for missing phone numbers
      const customerPhone = mappedData.customerPhone
        || mappedData.customerEmail
        || `external-order-${mappedData.externalOrderId}`;

      // Find or create customer
      customer = await Customer.findOne({ phone: customerPhone, admin: adminId });
      
      if (!customer) {
        customer = new Customer({
          name: mappedData.customerName || 'Customer',
          phone: customerPhone,
          email: mappedData.customerEmail,
          admin: adminId
        });
        await customer.save();
      }

      // Generate internal order ID
      const orderId = await getNextOrderId({
        CounterModel: Counter,
        OrderModel: Order,
        adminId: adminId
      });

      // Create new order
      order = new Order({
        orderId,
        customerId: customer._id,
        customerPhone,
        customerEmail: mappedData.customerEmail || customer.email,
        customerName: mappedData.customerName || customer.name,
        externalOrderId: mappedData.externalOrderId,
        externalOrderNumber: mappedData.externalOrderNumber,
        items: mappedData.items,
        totalAmount: mappedData.totalAmount,
        status: mappedData.status,
        shippingAddress: mappedData.shippingAddress,
        paymentStatus: mappedData.paymentStatus,
        orderDate: mappedData.orderDate,
        notes: mappedData.notes,
        admin: adminId
      });

      if (mappedData.trackingNumber) {
        order.trackingNumber = mappedData.trackingNumber;
      }

      await order.save();

      // Update customer stats
      customer.totalOrders += 1;
      customer.totalSpent += mappedData.totalAmount;
      customer.lastOrderDate = new Date();
      await customer.save();
    }

    // Mark matching AbandonedCart as recovered
    try {
      const AbandonedCart = require('../models/AbandonedCart');
      const checkoutIdentifier = data.checkout_token || data.checkout_id?.toString() || data.cart_token || data.token || data.id?.toString();
      
      let cartMatch = null;
      if (checkoutIdentifier) {
        cartMatch = await AbandonedCart.findOne({
          admin: adminId,
          cartId: checkoutIdentifier,
          status: { $ne: 'recovered' }
        });
      }

      // Fallback: match by phone if order is shopify/woocommerce and no cart matched by token
      if (!cartMatch && mappedData.customerPhone) {
        // Find most recent unrecovered abandoned cart for this customer in last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        cartMatch = await AbandonedCart.findOne({
          admin: adminId,
          customerPhone: mappedData.customerPhone,
          status: { $ne: 'recovered' },
          abandonedAt: { $gte: oneDayAgo }
        }).sort({ abandonedAt: -1 });
      }

      if (cartMatch) {
        cartMatch.status = 'recovered';
        cartMatch.recoveredAt = new Date();
        await cartMatch.save();
        console.log(`🛒 Recovered abandoned cart: ${cartMatch.cartId} via order ${order.orderId}`);
      }
    } catch (err) {
      console.error('Error recovering abandoned cart in processWebhook:', err);
    }

    const processingTime = Date.now() - startTime;

    return {
      order,
      customer,
      externalOrderId: mappedData.externalOrderId,
      processingTime,
      isUpdate,
      oldStatus
    };
  }

  /**
   * Process fulfillment update webhook
   */
  async processFulfillmentUpdate(source, externalOrderId, trackingInfo, adminId = null) {
    const startTime = Date.now();

    // Find default/demo admin if not provided
    if (!adminId) {
      let adminDoc = await Admin.findOne({ email: 'demo@store.com' });
      if (!adminDoc) adminDoc = await Admin.findOne();
      adminId = adminDoc ? adminDoc._id : null;
    }

    if (!adminId) {
      throw new Error('No admin user found in database.');
    }

    // Find the order
    const order = await Order.findOne({ 
      externalOrderId: externalOrderId.toString(), 
      admin: adminId 
    });

    if (!order) {
      throw new Error(`Order not found for external ID: ${externalOrderId}`);
    }

    const oldStatus = order.status;

    // Update tracking info
    if (trackingInfo.trackingNumber) order.trackingNumber = trackingInfo.trackingNumber;
    if (trackingInfo.status) order.status = trackingInfo.status;
    if (trackingInfo.estimatedDelivery) order.estimatedDelivery = trackingInfo.estimatedDelivery;

    if (trackingInfo.status === 'delivered' && oldStatus !== 'delivered') {
      order.deliveredDate = new Date();
    }

    await order.save();

    // Find customer to trigger WhatsApp message
    const customer = await Customer.findById(order.customerId);

    let whatsappResult = { success: false, error: 'Customer not found' };
    if (customer && (order.status !== oldStatus || trackingInfo.trackingNumber)) {
      whatsappResult = await this.sendTrackingUpdate(order, customer, trackingInfo);
    }

    return {
      order,
      customer,
      oldStatus,
      whatsappSent: whatsappResult.success,
      whatsappError: whatsappResult.error,
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Send WhatsApp tracking update message
   */
  async sendTrackingUpdate(order, customer, trackingInfo = {}) {
    try {
      // Determine the event type
      const eventType = order.status === 'cancelled'
        ? 'order_cancelled'
        : (order.status === 'delivered' ? 'order_delivered' : 'order_shipped');

      // Find mapped template for this event
      const template = await Template.findOne({
        adminId: order.admin,
        mappedEvent: eventType,
        status: 'APPROVED'
      });

      if (template) {
        console.log(`📋 Mapped template found for ${eventType}: ${template.name}`);
        
        let parameters = [];
        if (eventType === 'order_shipped') {
          // {{1}} = Customer Name, {{2}} = Order ID, {{3}} = Carrier, {{4}} = Tracking Number
          const carrier = trackingInfo.carrier || order.carrier || 'our courier partner';
          const trackingNumber = order.trackingNumber || trackingInfo.trackingNumber || 'N/A';
          parameters = [
            customer.name || 'Customer',
            order.orderId,
            carrier,
            trackingNumber
          ];
        } else if (eventType === 'order_cancelled' || eventType === 'order_delivered') {
          // {{1}} = Customer Name, {{2}} = Order ID
          parameters = [
            customer.name || 'Customer',
            order.orderId
          ];
        }

        const result = await whatsappCloudAPI.sendTemplateMessage(
          order.customerPhone,
          template.name,
          template.language || 'en_US',
          parameters
        );

        return {
          success: result.success,
          error: result.error || null
        };
      }

      // Fallback to plain text message via Web Bot if no template is mapped
      const message = this.generateTrackingMessage(order, customer, trackingInfo);
      const result = await whatsappWebBot.sendMessage(order.customerPhone, message);
      
      return {
        success: result.success,
        error: result.error || null
      };
    } catch (error) {
      console.error('Error sending WhatsApp tracking update:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate tracking/shipment update message
   */
  generateTrackingMessage(order, customer, trackingInfo = {}) {
    const carrier = trackingInfo.carrier || 'our courier partner';
    const trackingNumber = order.trackingNumber || trackingInfo.trackingNumber || 'N/A';
    
    // Check if cancelled
    if (order.status === 'cancelled') {
      return `❌ *Order Cancelled*

Hi ${customer.name}! 👋

We regret to inform you that your order *${order.orderId}* has been cancelled.

If you have any questions or feel this was done in error, please reply to this message.

Thank you!`;
    }

    // Check if delivered
    if (order.status === 'delivered') {
      return `📦 *Order Delivered!*

Hi ${customer.name}! 👋

Great news! Your order *${order.orderId}* has been successfully delivered.

*Delivered Items:*
${order.items.map(item => `• ${item.productName} (x${item.quantity})`).join('\n')}

We hope you love your purchase! If you have any feedback or questions, please feel free to reply directly to this message.

Thank you for shopping with us! 🙏`;
    }

    // Default to Shipped/In Transit
    return `🚚 *Your Order has Shipped!*

Hi ${customer.name}! 👋

Exciting news! Your order *${order.orderId}* has been shipped and is on its way to you.

*Shipping Details:*
📦 Tracking Number: *${trackingNumber}*
🚚 Carrier: *${carrier}*
${trackingInfo.trackingUrl ? `🔗 Track here: ${trackingInfo.trackingUrl}\n` : ''}
*Status:* ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}

We hope you receive it soon! If you have any questions, you can reply directly to this message.

Thank you! 🙏`;
  }

  /**
   * Send WhatsApp confirmation message
   */
  async sendOrderConfirmation(order, customer) {
    try {
      // Find mapped template for 'order_confirmation' event
      const template = await Template.findOne({
        adminId: order.admin,
        mappedEvent: 'order_confirmation',
        status: 'APPROVED'
      });

      if (template) {
        console.log(`📋 Mapped template found for order_confirmation: ${template.name}`);
        // Default placeholders: {{1}} is Customer Name, {{2}} is Order ID
        const parameters = [
          customer.name || 'Customer',
          order.orderId
        ];

        const result = await whatsappCloudAPI.sendTemplateMessage(
          order.customerPhone,
          template.name,
          template.language || 'en_US',
          parameters
        );

        return {
          success: result.success,
          error: result.error || null
        };
      }

      // Fallback to plain text message via Web Bot if no template is mapped
      const message = this.generateConfirmationMessage(order, customer);
      const result = await whatsappWebBot.sendMessage(order.customerPhone, message);
      
      return {
        success: result.success,
        error: result.error || null
      };
    } catch (error) {
      console.error('Error sending WhatsApp confirmation:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate confirmation message
   */
  generateConfirmationMessage(order, customer) {
    const itemsList = order.items
      .map(item => `• ${item.productName} (x${item.quantity}) - $${item.price.toFixed(2)}`)
      .join('\n');

    return `🎉 *Order Confirmed!*

Hi ${customer.name}! 👋

Your order has been successfully placed.

*Order Details:*
📦 Order ID: ${order.orderId}
💰 Total Amount: $${order.totalAmount.toFixed(2)}
📅 Order Date: ${order.orderDate.toLocaleDateString()}

*Items:*
${itemsList}

*Status:* ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
${order.paymentStatus === 'completed' ? '✅ Payment Confirmed' : '⏳ Payment Pending'}

${order.shippingAddress ? `
*Shipping Address:*
${order.shippingAddress.street}
${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}
${order.shippingAddress.country}
` : ''}

You can track your order anytime by sending us a message with your order ID.

Need help? Just reply to this message! 💬

Thank you for your order! 🙏`;
  }

  /**
   * Process checkout webhook and upsert AbandonedCart
   */
  async processCheckout(source, data, adminId = null) {
    // Find default/demo admin if not provided
    if (!adminId) {
      let adminDoc = await Admin.findOne({ email: 'demo@store.com' });
      if (!adminDoc) adminDoc = await Admin.findOne();
      adminId = adminDoc ? adminDoc._id : null;
    }

    if (!adminId) {
      throw new Error('No admin user found in database. Please seed or create an admin first.');
    }

    const AbandonedCart = require('../models/AbandonedCart');

    // Extract checkout ID/token
    const cartId = data.token || data.id?.toString();
    if (!cartId) {
      throw new Error('Cart ID/token is required');
    }

    // Extract customer info
    const customerName = data.customer?.first_name && data.customer?.last_name
      ? `${data.customer.first_name} ${data.customer.last_name}`.trim()
      : data.customer?.name || data.billing_address?.name || data.shipping_address?.name || 'Customer';

    const rawPhone = data.phone || 
      data.customer?.phone || 
      data.shipping_address?.phone || 
      data.billing_address?.phone ||
      data.customer?.default_address?.phone;

    const customerPhone = this.normalizePhone(rawPhone);
    const customerEmail = data.customer?.email || data.email;

    // We only want to track checkouts that have a contact phone number, since we need to send recovery messages on WhatsApp.
    if (!customerPhone) {
      console.log(`⚠️ Shopify checkout ${cartId} skipped: No phone number present.`);
      return null;
    }

    // Extract items
    const items = (data.line_items || []).map(item => ({
      productId: item.product_id?.toString(),
      productName: item.name || item.title,
      quantity: parseInt(item.quantity) || 1,
      price: parseFloat(item.price || 0)
    }));

    const totalAmount = parseFloat(data.total_price || data.total_line_items_price || 0);
    const checkoutUrl = data.abandon_checkout_url || null;

    // If checkout has completed_at timestamp, it means it's not abandoned (already converted).
    if (data.completed_at) {
      console.log(`🛒 Shopify checkout ${cartId} is already completed. Marking/Upserting as recovered.`);
      
      const cart = await AbandonedCart.findOneAndUpdate(
        { admin: adminId, cartId },
        {
          admin: adminId,
          cartId,
          customerPhone,
          customerName,
          customerEmail,
          items,
          totalAmount,
          checkoutUrl,
          status: 'recovered',
          recoveredAt: new Date(data.completed_at)
        },
        { upsert: true, new: true }
      );
      return cart;
    }

    // Otherwise, upsert it as abandoned. Keep existing status if it is already 'reminder_sent' or 'recovered'.
    const existingCart = await AbandonedCart.findOne({ admin: adminId, cartId });
    let status = 'abandoned';
    if (existingCart) {
      status = existingCart.status; // Keep 'reminder_sent' or 'recovered'
    }

    const cart = await AbandonedCart.findOneAndUpdate(
      { admin: adminId, cartId },
      {
        admin: adminId,
        cartId,
        customerPhone,
        customerName,
        customerEmail,
        items,
        totalAmount,
        checkoutUrl,
        status
      },
      { upsert: true, new: true }
    );

    console.log(`🛒 Shopify checkout ${cartId} saved/updated with status: ${status}`);
    return cart;
  }

  /**
   * Send WhatsApp cart recovery reminder message
   */
  async sendCartRecoveryMessage(cart) {
    try {
      // Find mapped template for 'abandoned_cart' event
      const template = await Template.findOne({
        adminId: cart.admin,
        mappedEvent: 'abandoned_cart',
        status: 'APPROVED'
      });

      if (template) {
        console.log(`📋 Mapped template found for abandoned_cart: ${template.name}`);
        // {{1}} = Customer Name, {{2}} = Checkout URL
        const parameters = [
          cart.customerName || 'Customer',
          cart.checkoutUrl || ''
        ];

        const result = await whatsappCloudAPI.sendTemplateMessage(
          cart.customerPhone,
          template.name,
          template.language || 'en_US',
          parameters
        );

        return {
          success: result.success,
          error: result.error || null
        };
      }

      // Fallback to plain text message via Web Bot if no template is mapped
      const message = `🛒 *Hi ${cart.customerName || 'there'}!* 👋\n\nWe noticed you left some items in your cart. You can complete your purchase anytime using this link:\n🔗 ${cart.checkoutUrl || ''}\n\nNeed help? Just reply to this message!`;
      const result = await whatsappWebBot.sendMessage(cart.customerPhone, message);
      
      return {
        success: result.success,
        error: result.error || null
      };
    } catch (error) {
      console.error('Error sending WhatsApp cart recovery message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new WebhookService();
