const axios = require('axios');
const BaseCRMProvider = require('./BaseCRMProvider');
const { validateSSRF } = require('../../utils/ssrfValidator');

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
}

module.exports = OdooProvider;
