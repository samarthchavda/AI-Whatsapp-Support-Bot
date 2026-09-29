const axios = require('axios');
const BaseCRMProvider = require('./BaseCRMProvider');
const { validateSSRF } = require('../../../utils/ssrfValidator');

/**
 * Odoo CRM/ERP Provider
 * Connects to Odoo 14+ via standard JSON-RPC protocol.
 */
class OdooProvider extends BaseCRMProvider {
  constructor() {
    super('odoo');
  }

  async testConnection(connection, credentials, options = {}) {
    try {
      if (!connection.baseUrl) {
        return { success: false, error: 'Odoo server Base URL is required' };
      }

      // 1. SSRF validation check
      const ssrfCheck = await validateSSRF(connection.baseUrl, { skipDns: process.env.NODE_ENV === 'test' });
      if (!ssrfCheck.isValid) {
        return { success: false, error: `Invalid server URL: ${ssrfCheck.error}` };
      }

      const cleanBaseUrl = connection.baseUrl.replace(/\/+$/, '');
      const jsonRpcUrl = `${cleanBaseUrl}/jsonrpc`;

      // 2. Test Odoo Server Version (Connectivity ping)
      let versionData = null;
      try {
        const versionRes = await axios.post(jsonRpcUrl, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'common',
            method: 'version',
            args: []
          },
          id: Date.now()
        }, { timeout: 10000 });

        if (versionRes.data && versionRes.data.result) {
          versionData = versionRes.data.result;
        }
      } catch (pingErr) {
        return {
          success: false,
          code: 'ODOO_SERVER_UNREACHABLE',
          error: `Could not connect to Odoo server at ${cleanBaseUrl}. Please check URL.`
        };
      }

      if (!connection.databaseName) {
        return { success: false, error: 'Odoo Database name is required' };
      }

      const secret = credentials?.apiKey || credentials?.password;
      if (!secret) {
        return { success: false, error: 'Odoo API key or user password is required' };
      }

      const username = credentials?.username || connection.tenantIdentifier || options.admin?.email;
      if (!username) {
        // If version check succeeded, server is valid
        return {
          success: true,
          serverVersion: versionData?.server_version || 'Live',
          message: 'Odoo server reachable. Please provide username to verify user permissions.'
        };
      }

      // 3. Test Odoo Authentication via JSON-RPC
      try {
        const authRes = await axios.post(jsonRpcUrl, {
          jsonrpc: '2.0',
          method: 'call',
          params: {
            service: 'common',
            method: 'authenticate',
            args: [connection.databaseName.trim(), username.trim(), secret.trim(), {}]
          },
          id: Date.now()
        }, { timeout: 10000 });

        const uid = authRes.data?.result;
        if (typeof uid === 'number' && uid > 0) {
          return {
            success: true,
            uid,
            serverVersion: versionData?.server_version || 'Unknown',
            message: `Odoo connection verified successfully (User ID: ${uid}, Version: ${versionData?.server_version || 'Live'})`
          };
        } else {
          return {
            success: false,
            code: 'AUTH_FAILED',
            error: 'Odoo authentication failed. Please verify Database Name, Username/Email, and API Key.'
          };
        }
      } catch (authErr) {
        return {
          success: false,
          code: 'AUTH_ERROR',
          error: this.sanitizeError(authErr)
        };
      }
    } catch (err) {
      return {
        success: false,
        error: this.sanitizeError(err)
      };
    }
  }

  async getMetadata(connection) {
    return {
      provider: 'odoo',
      version: '14.0+',
      protocol: 'JSON-RPC / XML-RPC',
      supportedEntities: ['contact', 'lead', 'product', 'quotation', 'order'],
      isConfigured: Boolean(connection && connection.baseUrl && connection.databaseName)
    };
  }

  async authenticate(connection, credentials = null) {
    if (!connection.baseUrl) {
      throw new Error('Odoo server Base URL is required');
    }
    const ssrfCheck = await validateSSRF(connection.baseUrl, { skipDns: process.env.NODE_ENV === 'test' });
    if (!ssrfCheck.isValid) {
      throw new Error(`Invalid server URL: ${ssrfCheck.error}`);
    }
    const cleanBaseUrl = connection.baseUrl.replace(/\/+$/, '');
    const jsonRpcUrl = `${cleanBaseUrl}/jsonrpc`;
    const db = (connection.databaseName || '').trim();
    if (!db) {
      throw new Error('Odoo Database name is required');
    }

    const creds = credentials || (connection.getCredentials ? connection.getCredentials() : {});
    const secret = creds?.apiKey || creds?.password;
    if (!secret) {
      throw new Error('Odoo API key or user password is required');
    }
    const username = (creds?.username || connection.tenantIdentifier || '').trim();
    if (!username) {
      throw new Error('Odoo Username/Email is required for authentication');
    }

    const authRes = await axios.post(jsonRpcUrl, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'common',
        method: 'authenticate',
        args: [db, username, secret.trim(), {}]
      },
      id: Date.now()
    }, { timeout: 10000 });

    const uid = authRes.data?.result;
    if (typeof uid !== 'number' || uid <= 0) {
      const errMsg = authRes.data?.error?.data?.message || authRes.data?.error?.message || 'Odoo authentication failed. Please verify credentials.';
      throw new Error(this.sanitizeError(errMsg));
    }

    return {
      uid,
      secret: secret.trim(),
      db,
      jsonRpcUrl
    };
  }

  async executeKw(connection, credentials, model, method, args = [], kwargs = {}) {
    const session = await this.authenticate(connection, credentials);
    const payload = {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'object',
        method: 'execute_kw',
        args: [session.db, session.uid, session.secret, model, method, args, kwargs]
      },
      id: Date.now()
    };

    const res = await axios.post(session.jsonRpcUrl, payload, { timeout: 15000 });
    if (res.data?.error) {
      const errDetail = res.data.error.data?.message || res.data.error.message || 'Odoo RPC execution error';
      throw new Error(this.sanitizeError(errDetail));
    }

    return res.data?.result;
  }

  /**
   * Safe Product Lookup for CRM Connect
   * Exposes only public customer-facing fields (name, description, list price, availability).
   * Strips out supplier info, cost price (standard_price), and internal notes.
   */
  async searchProducts(connection, credentials, query = '', options = {}) {
    try {
      const limit = Math.min(50, Math.max(1, options.limit || 5));
      const cleanQuery = (query || '').trim();
      const domain = cleanQuery
        ? [['name', 'ilike', cleanQuery]]
        : [];

      // Safe fields ONLY
      const fields = ['id', 'name', 'display_name', 'list_price', 'description', 'description_sale', 'qty_available', 'default_code'];
      const rawProducts = await this.executeKw(
        connection,
        credentials,
        'product.template',
        'search_read',
        [domain],
        { fields, limit }
      );

      if (!Array.isArray(rawProducts)) return [];

      return rawProducts.map(p => {
        const rawDesc = (p.description_sale && typeof p.description_sale === 'string' && p.description_sale.trim())
          ? p.description_sale
          : ((p.description && typeof p.description === 'string' && !p.description.toLowerCase().startsWith('vendor note')) ? p.description : '');
        const cleanDesc = rawDesc ? rawDesc.replace(/<[^>]*>/g, '').trim() : '';
        return {
          id: p.id,
          name: p.name || p.display_name,
          sku: (p.default_code && typeof p.default_code === 'string') ? p.default_code.trim() : '',
          description: cleanDesc,
          price: typeof p.list_price === 'number' ? p.list_price : 0,
          currency: 'INR',
          availability: (typeof p.qty_available === 'number' && p.qty_available > 0) ? 'In Stock' : 'Available on order'
        };
      });
    } catch (err) {
      console.error('Odoo searchProducts error:', err.message);
      return [];
    }
  }

  async findContact(connection, credentials, phone) {
    if (!phone) return null;
    const cleanDigits = phone.replace(/\D/g, '').slice(-10);
    if (!cleanDigits) return null;

    try {
      let partners = [];
      try {
        const domain = ['|', ['phone', 'ilike', cleanDigits], ['mobile', 'ilike', cleanDigits]];
        partners = await this.executeKw(
          connection,
          credentials,
          'res.partner',
          'search_read',
          [domain],
          { fields: ['id', 'name', 'phone', 'email'], limit: 1 }
        );
      } catch (domainErr) {
        // Fallback to phone field only if mobile field is not present on res.partner
        partners = await this.executeKw(
          connection,
          credentials,
          'res.partner',
          'search_read',
          [[['phone', 'ilike', cleanDigits]]],
          { fields: ['id', 'name', 'phone', 'email'], limit: 1 }
        );
      }

      return (partners && partners.length > 0) ? partners[0] : null;
    } catch (err) {
      console.error('Odoo findContact error:', err.message);
      return null;
    }
  }

  /**
   * Safe WhatsApp Enquiry to Lead Sync Flow.
   * CRM Connect can create a crm.lead only. It may link an existing partner,
   * but never creates or changes res.partner, orders, quotations, or invoices.
   */
  async syncLead(connection, credentials, leadData) {
    try {
      const customerPhone = leadData.customerPhone;
      const customerName = leadData.customerName || 'WhatsApp Customer';
      const enquiryMessage = leadData.enquiryMessage || 'Inbound inquiry from WhatsApp';

      // 1. An existing Odoo contact may be linked, but CRM Connect must not
      // create a contact as a side effect of a WhatsApp enquiry.
      const partner = await this.findContact(connection, credentials, customerPhone);
      const partnerId = partner?.id || null;

      // 2. Check for existing open lead (deduplication)
      let existingLeads = [];
      try {
        existingLeads = await this.executeKw(
          connection,
          credentials,
          'crm.lead',
          'search_read',
          [partnerId
            ? [['partner_id', '=', partnerId], ['type', '=', 'lead']]
            : [['phone', 'ilike', customerPhone.replace(/\D/g, '').slice(-10)], ['type', '=', 'lead']]
          ],
          { fields: ['id', 'name', 'description'], limit: 1 }
        );
      } catch (searchLeadErr) {
        // If crm module domain differences, proceed to create
      }

      if (existingLeads && existingLeads.length > 0) {
        return {
          success: true,
          leadId: existingLeads[0].id,
          partnerId,
          isNewLead: false,
          linkedExistingContact: Boolean(partnerId),
          message: 'Existing lead found and linked.'
        };
      }

      // 3. Create lead in Odoo
      const leadPayload = {
        name: `WhatsApp Enquiry: ${customerName}`,
        phone: customerPhone,
        contact_name: customerName,
        description: enquiryMessage
      };

      if (partnerId) {
        leadPayload.partner_id = partnerId;
      }

      const newLeadId = await this.executeKw(
        connection,
        credentials,
        'crm.lead',
        'create',
        [leadPayload]
      );

      return {
        success: true,
        leadId: newLeadId,
        partnerId,
        isNewLead: true,
        linkedExistingContact: Boolean(partnerId),
        message: 'Lead created successfully in Odoo.'
      };
    } catch (err) {
      console.error('Odoo syncLead error:', err.message);
      return {
        success: false,
        error: this.sanitizeError(err)
      };
    }
  }

  /**
   * Safe Read-Only Order Status Lookup for CRM Connect
   * Verifies customer phone ownership before returning safe fulfillment details.
   * Never exposes payment secrets or allows modifications/cancellations.
   */
  async lookupOrderStatus(connection, credentials, { customerPhone, orderRef }) {
    try {
      if (!customerPhone) {
        return { success: false, error: 'Customer phone number is required for verification', verified: false };
      }

      const cleanCustomerPhone = customerPhone.replace(/\D/g, '').slice(-10);
      const cleanRef = (orderRef || '').trim();

      let order = null;

      if (cleanRef) {
        // Search by order reference
        const orders = await this.executeKw(
          connection,
          credentials,
          'sale.order',
          'search_read',
          [[['name', 'ilike', cleanRef]]],
          { fields: ['id', 'name', 'date_order', 'state', 'delivery_status', 'amount_total', 'partner_id'], limit: 1 }
        );

        if (!orders || orders.length === 0) {
          return { success: false, error: `No order found matching "${cleanRef}"`, verified: false };
        }
        order = orders[0];

        // Phone ownership verification:
        if (!order.partner_id || !order.partner_id[0]) {
          return { success: false, error: 'Order ownership could not be verified', verified: false };
        }

        const partners = await this.executeKw(
          connection,
          credentials,
          'res.partner',
          'search_read',
          [[['id', '=', order.partner_id[0]]]],
          { fields: ['id', 'name', 'phone', 'mobile'], limit: 1 }
        );

        const orderPartner = partners && partners[0];
        const orderPhoneClean = (orderPartner?.phone || '').replace(/\D/g, '').slice(-10);
        const orderMobileClean = (orderPartner?.mobile || '').replace(/\D/g, '').slice(-10);

        const isOwner = cleanCustomerPhone && (cleanCustomerPhone === orderPhoneClean || cleanCustomerPhone === orderMobileClean);
        if (!isOwner) {
          return {
            success: false,
            error: 'Order verification failed. Phone number does not match order record.',
            verified: false
          };
        }
      } else {
        // Search recent orders for customer phone
        const partner = await this.findContact(connection, credentials, customerPhone);
        if (!partner || !partner.id) {
          return { success: false, error: 'No order record found for this phone number', verified: false };
        }

        const orders = await this.executeKw(
          connection,
          credentials,
          'sale.order',
          'search_read',
          [[['partner_id', '=', partner.id]]],
          { fields: ['id', 'name', 'date_order', 'state', 'delivery_status', 'amount_total'], limit: 1 }
        );

        if (!orders || orders.length === 0) {
          return { success: false, error: 'No recent orders found for this phone number', verified: false };
        }
        order = orders[0];
      }

      const stateLabels = {
        draft: 'Quotation / Draft',
        sent: 'Quotation Sent',
        sale: 'Order Confirmed',
        done: 'Delivered / Completed',
        cancel: 'Cancelled'
      };

      return {
        success: true,
        verified: true,
        orderId: order.name,
        orderRef: order.name,
        status: order.delivery_status || order.state,
        displayStatus: order.delivery_status || stateLabels[order.state] || order.state,
        orderDate: order.date_order,
        totalAmount: typeof order.amount_total === 'number' ? order.amount_total : 0
      };
    } catch (err) {
      console.error('Odoo lookupOrderStatus error:', err.message);
      return {
        success: false,
        error: this.sanitizeError(err),
        verified: false
      };
    }
  }
}

module.exports = OdooProvider;
