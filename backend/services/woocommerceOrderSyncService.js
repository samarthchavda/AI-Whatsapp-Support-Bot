const axios = require('axios');
const Integration = require('../models/Integration');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Counter = require('../models/Counter');
const webhookService = require('./webhookService');
const { getNextOrderId } = require('./orderIdService');

class WooCommerceOrderSyncService {
  normalizeStoreUrl(url) {
    if (!url) return null;
    let normalized = url.trim();
    if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
      normalized = 'https://' + normalized;
    }
    // Remove trailing slash
    normalized = normalized.replace(/\/+$/, '');
    return normalized;
  }

  async fetchAllOrders(integration) {
    const storeUrl = this.normalizeStoreUrl(integration.storeUrl);
    const [consumerKey, consumerSecret] = (integration.apiKey || '').split(':');

    if (!consumerKey || !consumerSecret) {
      const error = new Error('WooCommerce sync requires the API key to be entered in the format: ConsumerKey:ConsumerSecret');
      error.status = 400;
      throw error;
    }

    const orders = [];
    let page = 1;
    let hasNextPage = true;
    let safetyCounter = 0;

    while (hasNextPage) {
      safetyCounter += 1;
      if (safetyCounter > 20) {
        throw new Error('Stopped WooCommerce pagination after 20 pages to avoid runaway sync');
      }

      const endpoint = `${storeUrl}/wp-json/wc/v3/orders`;
      let response;
      try {
        response = await axios.get(endpoint, {
          auth: {
            username: consumerKey,
            password: consumerSecret
          },
          params: {
            per_page: 100,
            page: page
          },
          timeout: 30000
        });
      } catch (error) {
        const status = error.response?.status;
        const wooMessage = error.response?.data?.message || error.message;
        const wrappedError = new Error(`WooCommerce API request failed: ${wooMessage}`);
        wrappedError.status = status || 502;
        throw wrappedError;
      }

      const batch = response.data || [];
      orders.push(...batch);

      if (batch.length < 100) {
        hasNextPage = false;
      } else {
        page += 1;
      }
    }

    return orders;
  }

  async upsertWooCommerceOrder(integration, wooOrder) {
    const adminId = integration.adminId;
    const mappedData = webhookService.mapWooCommerceOrder(wooOrder);

    if (!mappedData.externalOrderId) {
      throw new Error('WooCommerce order is missing an external order ID');
    }

    let order = await Order.findOne({
      externalOrderId: mappedData.externalOrderId,
      admin: adminId
    });

    let isNewOrder = false;

    if (order) {
      if (mappedData.status) order.status = mappedData.status;
      if (mappedData.paymentStatus) order.paymentStatus = mappedData.paymentStatus;
      if (mappedData.externalOrderNumber) order.externalOrderNumber = mappedData.externalOrderNumber;
      if (mappedData.totalAmount !== undefined && mappedData.totalAmount !== null) order.totalAmount = mappedData.totalAmount;
      if (mappedData.items && mappedData.items.length > 0) order.items = mappedData.items;
      if (mappedData.notes) order.notes = mappedData.notes;
      if (mappedData.trackingNumber) order.trackingNumber = mappedData.trackingNumber;
      if (mappedData.shippingAddress) order.shippingAddress = mappedData.shippingAddress;
      if (mappedData.status === 'delivered' && !order.deliveredDate) {
        order.deliveredDate = new Date();
      }

      await order.save();
    } else {
      const customerPhone = mappedData.customerPhone
        || mappedData.customerEmail
        || `woocommerce-order-${mappedData.externalOrderId}`;

      let customer = await Customer.findOne({ phone: customerPhone, admin: adminId });

      if (!customer) {
        customer = new Customer({
          name: mappedData.customerName || 'Customer',
          phone: customerPhone,
          email: mappedData.customerEmail,
          admin: adminId
        });
        await customer.save();
      }

      const orderId = await getNextOrderId({
        CounterModel: Counter,
        OrderModel: Order,
        adminId
      });

      order = new Order({
        orderId,
        customerId: customer._id,
        customerPhone,
        customerEmail: mappedData.customerEmail || customer.email,
        customerName: mappedData.customerName || customer.name,
        externalOrderId: mappedData.externalOrderId,
        externalOrderNumber: mappedData.externalOrderNumber,
        items: mappedData.items || [],
        totalAmount: mappedData.totalAmount || 0,
        status: mappedData.status || 'pending',
        shippingAddress: mappedData.shippingAddress,
        paymentStatus: mappedData.paymentStatus || 'pending',
        orderDate: mappedData.orderDate || new Date(),
        notes: mappedData.notes,
        admin: adminId,
        createdBy: adminId,
        createdByName: integration.metadata?.storeName || 'WooCommerce'
      });

      if (mappedData.trackingNumber) {
        order.trackingNumber = mappedData.trackingNumber;
      }

      await order.save();

      customer.totalOrders = (customer.totalOrders || 0) + 1;
      customer.totalSpent = (customer.totalSpent || 0) + (mappedData.totalAmount || 0);
      customer.lastOrderDate = new Date();
      await customer.save();

      isNewOrder = true;
    }

    return {
      order,
      isNewOrder,
      externalOrderId: mappedData.externalOrderId
    };
  }

  async syncIntegrationOrders(integrationId) {
    const integration = (integrationId && typeof integrationId === 'object' && typeof integrationId.platform === 'string')
      ? integrationId
      : await Integration.findById(integrationId);

    if (!integration) {
      throw new Error('Integration not found');
    }

    if (integration.platform !== 'woocommerce') {
      throw new Error('Only WooCommerce integrations can be synced with this service');
    }

    if (!integration.isActive) {
      throw new Error('Integration is inactive');
    }

    const orders = await this.fetchAllOrders(integration);
    
    // Auto-update admin's currency preference based on synced orders
    if (orders.length > 0) {
      const storeCurrency = orders[0].currency;
      if (storeCurrency) {
        const Admin = require('../models/Admin');
        await Admin.findByIdAndUpdate(integration.adminId, { currency: storeCurrency });
      }
    }
    let created = 0;
    let updated = 0;
    const errors = [];

    for (const wooOrder of orders) {
      try {
        const result = await this.upsertWooCommerceOrder(integration, wooOrder);
        if (result.isNewOrder) created += 1;
        else updated += 1;
      } catch (error) {
        errors.push({
          externalOrderId: wooOrder?.id?.toString() || wooOrder?.number?.toString() || 'unknown',
          error: error.message
        });
      }
    }

    integration.lastSyncedAt = new Date();
    integration.metadata = integration.metadata || {};
    integration.metadata.totalOrdersSynced = (integration.metadata.totalOrdersSynced || 0) + created + updated;
    await integration.save();

    return {
      integration,
      fetched: orders.length,
      created,
      updated,
      errors
    };
  }
}

module.exports = new WooCommerceOrderSyncService();
