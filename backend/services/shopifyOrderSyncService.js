const axios = require('axios');
const Integration = require('../models/Integration');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Counter = require('../models/Counter');
const webhookService = require('./webhookService');
const { getNextOrderId } = require('./orderIdService');

class ShopifyOrderSyncService {
  normalizeShopDomain(storeUrl) {
    if (!storeUrl) return null;

    let cleanUrl = storeUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    try {
      const parsed = new URL(cleanUrl);
      let hostname = parsed.hostname.replace(/^www\./i, '').toLowerCase();

      // Check if it's admin.shopify.com format: admin.shopify.com/store/STORE_NAME
      if (hostname === 'admin.shopify.com') {
        const parts = parsed.pathname.split('/');
        const storeIndex = parts.indexOf('store');
        if (storeIndex !== -1 && parts[storeIndex + 1]) {
          return `${parts[storeIndex + 1].toLowerCase()}.myshopify.com`;
        }
      }

      return hostname;
    } catch (error) {
      return cleanUrl.replace(/^https?:\/\//i, '').replace(/\/+$/, '').toLowerCase();
    }
  }

  buildOrdersEndpoint(shopDomain, apiVersion = process.env.SHOPIFY_API_VERSION || '2024-07', pageInfo = null) {
    const baseUrl = `https://${shopDomain}/admin/api/${apiVersion}/orders.json`;
    if (pageInfo) {
      return `${baseUrl}?limit=250&page_info=${encodeURIComponent(pageInfo)}`;
    }

    return `${baseUrl}?status=any&limit=250&order=updated_at%20asc`;
  }

  extractNextPageInfo(linkHeader) {
    if (!linkHeader) return null;

    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/i);
    if (!nextMatch) return null;

    try {
      const nextUrl = new URL(nextMatch[1]);
      return nextUrl.searchParams.get('page_info');
    } catch (error) {
      return null;
    }
  }

  async fetchAllOrders(integration) {
    const shopDomain = this.normalizeShopDomain(integration.storeUrl);

    if (!shopDomain) {
      const error = new Error('Invalid Shopify store URL');
      error.status = 400;
      throw error;
    }

    if (!shopDomain.includes('myshopify.com')) {
      const error = new Error('Shopify sync requires the store URL to be the *.myshopify.com domain');
      error.status = 400;
      throw error;
    }

    if (!integration.apiKey) {
      const error = new Error('Missing Shopify access token/api key');
      error.status = 400;
      throw error;
    }

    const headers = {
      'X-Shopify-Access-Token': integration.apiKey,
      'Content-Type': 'application/json'
    };

    const orders = [];
    let pageInfo = null;
    let hasNextPage = true;
    let safetyCounter = 0;

    while (hasNextPage) {
      safetyCounter += 1;
      if (safetyCounter > 20) {
        throw new Error('Stopped Shopify pagination after 20 pages to avoid runaway sync');
      }

      const endpoint = this.buildOrdersEndpoint(shopDomain, process.env.SHOPIFY_API_VERSION || '2024-07', pageInfo);
      let response;
      try {
        response = await axios.get(endpoint, { headers, timeout: 30000 });
      } catch (error) {
        const status = error.response?.status;
        const shopifyMessage = error.response?.data?.errors || error.response?.data?.error || error.message;
        const wrappedError = new Error(
          status === 401
            ? 'Shopify authentication failed. Make sure the store URL is your *.myshopify.com domain and the token is a valid Admin API access token.'
            : status === 404
              ? 'Shopify store or API endpoint not found. Check the store URL and API version.'
              : `Shopify API request failed: ${shopifyMessage}`
        );
        wrappedError.status = status || 502;
        wrappedError.details = shopifyMessage;
        throw wrappedError;
      }
      const batch = response.data?.orders || [];
      orders.push(...batch);

      pageInfo = this.extractNextPageInfo(response.headers?.link);
      hasNextPage = Boolean(pageInfo);
    }

    return orders;
  }

  async upsertShopifyOrder(integration, shopifyOrder) {
    const adminId = integration.adminId;
    const mappedData = webhookService.mapShopifyOrder(shopifyOrder);

    if (!mappedData.externalOrderId) {
      throw new Error('Shopify order is missing an external order ID');
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

      // Update customer identity fields when Shopify provides real data
      // (after Protected Customer Data is enabled, re-sync will backfill these)
      const isPlaceholderName = !order.customerName || order.customerName === 'Customer';
      const isPlaceholderPhone = !order.customerPhone || order.customerPhone.startsWith('shopify-order-');

      if (mappedData.customerName && mappedData.customerName !== 'Customer' && isPlaceholderName) {
        order.customerName = mappedData.customerName;
      }
      if (mappedData.customerEmail && !order.customerEmail) {
        order.customerEmail = mappedData.customerEmail;
      }
      if (mappedData.customerPhone && isPlaceholderPhone) {
        order.customerPhone = mappedData.customerPhone;
      }

      await order.save();

      // Also update the linked Customer document if it has placeholder data
      const linkedCustomer = await Customer.findById(order.customerId);
      if (linkedCustomer) {
        let customerUpdated = false;
        if (mappedData.customerName && mappedData.customerName !== 'Customer' && (!linkedCustomer.name || linkedCustomer.name === 'Customer')) {
          linkedCustomer.name = mappedData.customerName;
          customerUpdated = true;
        }
        if (mappedData.customerEmail && !linkedCustomer.email) {
          linkedCustomer.email = mappedData.customerEmail;
          customerUpdated = true;
        }
        if (customerUpdated) {
          await linkedCustomer.save();
        }
      }
    } else {
      const customerPhone = mappedData.customerPhone
        || mappedData.customerEmail
        || `shopify-order-${mappedData.externalOrderId}`;

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
        createdByName: integration.metadata?.storeName || 'Shopify'
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

    if (integration.platform !== 'shopify') {
      throw new Error('Only Shopify integrations can be synced with this service');
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

    for (const shopifyOrder of orders) {
      try {
        const result = await this.upsertShopifyOrder(integration, shopifyOrder);
        if (result.isNewOrder) created += 1;
        else updated += 1;
      } catch (error) {
        errors.push({
          externalOrderId: shopifyOrder?.id?.toString() || shopifyOrder?.order_number?.toString() || 'unknown',
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

  async syncAllShopifyIntegrations() {
    const integrations = await Integration.find({ platform: 'shopify', isActive: true });
    const results = [];

    for (const integration of integrations) {
      try {
        const result = await this.syncIntegrationOrders(integration);
        results.push({
          integrationId: integration._id,
          success: true,
          ...result
        });
      } catch (error) {
        results.push({
          integrationId: integration._id,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }
}

module.exports = new ShopifyOrderSyncService();