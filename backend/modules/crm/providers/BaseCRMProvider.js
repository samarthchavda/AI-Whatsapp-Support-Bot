/**
 * Base Abstract CRM Provider
 * Defines the canonical adapter contract for external CRM/ERP integrations.
 */
class BaseCRMProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Sanitizes upstream error messages before bubbling to caller
   */
  sanitizeError(error) {
    if (!error) return 'An unexpected CRM integration error occurred';
    const message = error.message || String(error);
    // Remove potential tokens, passwords, database credentials from error string
    return message.replace(/(password|token|secret|key)=([^&\s]+)/gi, '$1=******');
  }

  async testConnection(connection, credentials) {
    return {
      success: false,
      code: 'NOT_IMPLEMENTED',
      error: `Connection testing for provider "${this.name}" is not yet configured or implemented.`
    };
  }

  async getMetadata(connection) {
    return {
      provider: this.name,
      supportedEntities: ['contact', 'lead', 'product', 'quotation', 'order'],
      isConfigured: false
    };
  }

  async listFields(connection, entityType) {
    return {
      success: false,
      code: 'NOT_IMPLEMENTED',
      error: `Field schema inspection for entity "${entityType}" on provider "${this.name}" is not yet implemented.`
    };
  }

  async findContact(connection, filter) {
    return {
      success: false,
      code: 'NOT_IMPLEMENTED',
      error: `findContact on provider "${this.name}" is not implemented.`
    };
  }

  async createContact(connection, data) {
    return {
      success: false,
      code: 'NOT_IMPLEMENTED',
      error: `createContact on provider "${this.name}" is not implemented.`
    };
  }

  async findOpenLead(connection, filter) {
    return {
      success: false,
      code: 'NOT_IMPLEMENTED',
      error: `findOpenLead on provider "${this.name}" is not implemented.`
    };
  }

  async createLead(connection, data) {
    return {
      success: false,
      code: 'NOT_IMPLEMENTED',
      error: `createLead on provider "${this.name}" is not implemented.`
    };
  }

  async updateLead(connection, id, data) {
    return {
      success: false,
      code: 'NOT_IMPLEMENTED',
      error: `updateLead on provider "${this.name}" is not implemented.`
    };
  }

  async searchProducts(connection, query) {
    return {
      success: false,
      code: 'NOT_IMPLEMENTED',
      error: `searchProducts on provider "${this.name}" is not implemented.`
    };
  }

  async createQuotation(connection, data) {
    return {
      success: false,
      code: 'NOT_IMPLEMENTED',
      error: `createQuotation on provider "${this.name}" is not implemented.`
    };
  }

  async confirmOrder(connection, id) {
    return {
      success: false,
      code: 'NOT_IMPLEMENTED',
      error: `confirmOrder on provider "${this.name}" is not implemented.`
    };
  }

  async getOrderStatus(connection, id) {
    return {
      success: false,
      code: 'NOT_IMPLEMENTED',
      error: `getOrderStatus on provider "${this.name}" is not implemented.`
    };
  }
}

module.exports = BaseCRMProvider;
