const BaseCRMProvider = require('./BaseCRMProvider');
const { validateSSRF } = require('../../utils/ssrfValidator');

/**
 * Odoo CRM/ERP Provider Foundation
 * Provides generic integration scaffolding for Odoo 14+ JSON-RPC / XML-RPC.
 */
class OdooProvider extends BaseCRMProvider {
  constructor() {
    super('odoo');
  }

  async testConnection(connection, credentials) {
    try {
      if (!connection.baseUrl) {
        return { success: false, error: 'Odoo server Base URL is required' };
      }

      // 1. SSRF validation check
      const ssrfCheck = await validateSSRF(connection.baseUrl, { skipDns: process.env.NODE_ENV === 'test' });
      if (!ssrfCheck.isValid) {
        return { success: false, error: `Invalid server URL: ${ssrfCheck.error}` };
      }

      if (!connection.databaseName) {
        return { success: false, error: 'Odoo Database name is required' };
      }

      if (!credentials || (!credentials.apiKey && !credentials.password)) {
        return { success: false, error: 'Odoo API key or user password is required' };
      }

      // Generic connection foundation: Real XML-RPC / JSON-RPC business logic will be plugged in subsequent task
      return {
        success: false,
        code: 'ODOO_CONNECTOR_INITIALIZING',
        error: 'Odoo provider foundation active. Business RPC connector endpoints will be enabled in upcoming task.'
      };
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
}

module.exports = OdooProvider;
