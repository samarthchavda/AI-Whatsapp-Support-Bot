const BaseCRMProvider = require('./BaseCRMProvider');

class ZohoProvider extends BaseCRMProvider {
  constructor() {
    super('zoho');
  }

  async getMetadata(connection) {
    return {
      provider: 'zoho',
      supportedEntities: ['contact', 'lead', 'product', 'quotation', 'order'],
      isConfigured: false
    };
  }
}

module.exports = ZohoProvider;
