const Order = require('../models/Order');
const Customer = require('../models/Customer');
const WebhookLog = require('../models/WebhookLog');
const Counter = require('../models/Counter');
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
      customerName: order.customer?.first_name && order.customer?.last_name 
        ? `${order.customer.first_name} ${order.customer.last_name}`.trim()
        : order.customer?.name || order.billing_address?.name || 'Customer',
      customerPhone: this.normalizePhone(
        order.customer?.phone || 
        order.billing_address?.phone || 
        order.shipping_address?.phone
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
      status: this.mapShopifyOrderStatus(order.fulfillment_status),
      notes: order.note,
      orderDate: order.created_at ? new Date(order.created_at) : new Date()
    };
  }

  /**
   * Map WooCommerce order data to our Order schema
   */
  mapWooCommerceOrder(wooData) {
    return {
      externalOrderId: wooData.id?.toString() || wooData.number?.toString(),
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
      orderDate: wooData.date_created ? new Date(wooData.date_created) : new Date()
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
  async processWebhook(source, data) {
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

    // Validate required fields
    if (!mappedData.customerPhone) {
      throw new Error('Customer phone number is required');
    }
    if (!mappedData.externalOrderId) {
      throw new Error('External order ID is required');
    }

    // Find or create customer
    let customer = await Customer.findOne({ phone: mappedData.customerPhone });
    
    if (!customer) {
      customer = new Customer({
        name: mappedData.customerName,
        phone: mappedData.customerPhone,
        email: mappedData.customerEmail
      });
      await customer.save();
    }

    // Generate internal order ID
    const orderId = await getNextOrderId({
      CounterModel: Counter,
      OrderModel: Order
    });

    // Create order
    const order = new Order({
      orderId,
      customerId: customer._id,
      customerPhone: mappedData.customerPhone,
      customerName: mappedData.customerName,
      items: mappedData.items,
      totalAmount: mappedData.totalAmount,
      status: mappedData.status,
      shippingAddress: mappedData.shippingAddress,
      paymentStatus: mappedData.paymentStatus,
      orderDate: mappedData.orderDate,
      notes: mappedData.notes
    });

    await order.save();

    // Update customer stats
    customer.totalOrders += 1;
    customer.totalSpent += mappedData.totalAmount;
    customer.lastOrderDate = new Date();
    await customer.save();

    const processingTime = Date.now() - startTime;

    return {
      order,
      customer,
      externalOrderId: mappedData.externalOrderId,
      processingTime
    };
  }

  /**
   * Send WhatsApp confirmation message
   */
  async sendOrderConfirmation(order, customer) {
    try {
      const message = this.generateConfirmationMessage(order, customer);
      
      // Try to send via WhatsApp Web Bot
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
}

module.exports = new WebhookService();
