const BaseCRMProvider = require('./BaseCRMProvider');

class CustomCRMProvider extends BaseCRMProvider {
  constructor() {
    super('custom');
  }

  async getMetadata(connection) {
    return {
      provider: 'custom',
      supportedEntities: ['contact', 'lead', 'product', 'quotation', 'order'],
      isConfigured: Boolean(connection && connection.baseUrl)
    };
  }
}

module.exports = CustomCRMProvider;
