const BaseCRMProvider = require('./BaseCRMProvider');

class SalesforceProvider extends BaseCRMProvider {
  constructor() {
    super('salesforce');
  }

  async getMetadata(connection) {
    return {
      provider: 'salesforce',
      supportedEntities: ['contact', 'lead', 'product', 'quotation', 'order'],
      isConfigured: false
    };
  }
}

module.exports = SalesforceProvider;
