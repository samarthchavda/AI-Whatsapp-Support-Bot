const OdooProvider = require('./OdooProvider');
const ZohoProvider = require('./ZohoProvider');
const SalesforceProvider = require('./SalesforceProvider');
const HubspotProvider = require('./HubspotProvider');
const CustomCRMProvider = require('./CustomCRMProvider');

class CRMProviderRegistry {
  constructor() {
    this.providers = new Map();
    this.register('odoo', new OdooProvider());
    this.register('zoho', new ZohoProvider());
    this.register('salesforce', new SalesforceProvider());
    this.register('hubspot', new HubspotProvider());
    this.register('custom', new CustomCRMProvider());
  }

  register(name, providerInstance) {
    this.providers.set(name.toLowerCase().trim(), providerInstance);
  }

  get(name) {
    if (!name) return null;
    return this.providers.get(name.toLowerCase().trim()) || null;
  }

  listSupportedProviders() {
    return Array.from(this.providers.keys());
  }
}

const registry = new CRMProviderRegistry();

module.exports = registry;
