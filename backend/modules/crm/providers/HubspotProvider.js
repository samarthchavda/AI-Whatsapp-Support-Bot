const BaseCRMProvider = require('./BaseCRMProvider');

class HubspotProvider extends BaseCRMProvider {
  constructor() {
    super('hubspot');
  }

  async getMetadata(connection) {
    return {
      provider: 'hubspot',
      supportedEntities: ['contact', 'lead', 'product', 'quotation', 'order'],
      isConfigured: false
    };
  }
}

module.exports = HubspotProvider;
