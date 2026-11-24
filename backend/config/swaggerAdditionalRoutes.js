const routeDefinitions = require('./swaggerAdditionalRoutes.json');

const PUBLIC_OPERATIONS = new Set([
  'get /api/auth/plans/public',
  'post /api/demo-requests',
  'post /api/traffic/track',
  'get /api/blog',
  'get /api/blog/post/{slug}',
  'get /api/sitemap.xml',
  'get /api/invoices/signed/{id}/pdf'
]);

const FILE_UPLOADS = {
  'post /api/conversations/{id}/send-media': 'WhatsApp chat attachment (10 MB maximum)',
  'post /api/v1/media/upload': 'Media file to upload to Meta',
  'post /api/super-admin/db/restore': 'Database backup file'
};

const BODY_SCHEMAS = {
  'post /api/traffic/track': {
    type: 'object', required: ['pagePath'], properties: {
      pagePath: { type: 'string' }, referrer: { type: 'string' }
    }
  },
  'post /api/whatsapp/templates': {
    type: 'object', required: ['name', 'category', 'body'], properties: {
      phoneNumberId: { type: 'string', description: 'Connected WhatsApp phone number ID' },
      name: { type: 'string', pattern: '^[a-z0-9_]+$' },
      category: { type: 'string', enum: ['MARKETING', 'UTILITY', 'AUTHENTICATION'] },
      language: { type: 'string', example: 'en_US' },
      header: { type: 'object', additionalProperties: true },
      body: { type: 'string' },
      footer: { type: 'string' },
      buttons: { type: 'array', items: { type: 'object', additionalProperties: true } },
      variableSamples: { type: 'array', items: { type: 'string' } }
    }
  },
  'put /api/whatsapp/templates/{id}/map': {
    type: 'object', properties: { mappedEvent: { type: 'string', nullable: true } }
  },
  'post /api/v1/messages/send': {
    type: 'object', required: ['to'], properties: {
      to: { type: 'string', example: '919876543210' },
      type: { type: 'string', enum: ['template', 'text', 'media', 'document', 'image', 'interactive'] },
      text: { type: 'string' },
      templateName: { type: 'string' },
      language: { type: 'string', example: 'en' },
      variables: { type: 'array', items: { type: 'string' } },
      mediaType: { type: 'string' },
      mediaUrl: { type: 'string', format: 'uri' }
    }
  }
};

BODY_SCHEMAS['post /api/v1/whatsapp/send-template'] = BODY_SCHEMAS['post /api/v1/messages/send'];

function tagFor(path) {
  const parts = path.split('/');
  if (parts[2] === 'super-admin') {
    const section = parts[3] === 'users' ? 'Users'
      : parts[3] === 'permission-profiles' ? 'Permissions'
        : parts[3] === 'plans' ? 'Plans'
          : parts[3] === 'db' ? 'Database'
            : 'Operations';
    return `Super Admin - ${section}`;
  }
  const tags = {
    auth: 'Authentication & Profile',
    invoices: 'Invoices & Billing',
    conversations: 'WhatsApp Live Conversations',
    webhook: 'WhatsApp Connection & Webhook',
    dashboard: 'Merchant Dashboard',
    'demo-requests': 'Legacy Demo Requests',
    'knowledge-base': 'Knowledge Base',
    broadcasts: 'WhatsApp Broadcast Campaigns',
    analytics: 'Analytics',
    integrations: 'Store Integrations',
    whatsapp: 'WhatsApp Templates',
    traffic: 'Public Traffic',
    blog: 'Blog',
    'merchant-leads': 'Merchant Leads',
    developer: 'Developer Platform',
    v1: 'Developer REST API',
    'sitemap.xml': 'Public SEO'
  };
  return tags[parts[2]] || 'Other APIs';
}

function securityFor(method, path) {
  const key = `${method} ${path}`;
  if (PUBLIC_OPERATIONS.has(key) || path === '/api/webhook/whatsapp') return [];
  if (path.startsWith('/api/v1/developer/')) return [{ ApiKeyAuth: [] }, { BearerAuth: [] }];
  if (path.startsWith('/api/v1/')) return [{ ApiKeyAuth: [] }];
  return [{ BearerAuth: [] }];
}

function requestBodyFor(method, path) {
  const key = `${method} ${path}`;
  if (key === 'post /api/demo-requests') return undefined;
  if (FILE_UPLOADS[key]) {
    return {
      required: true,
      content: { 'multipart/form-data': { schema: {
        type: 'object', required: ['file'], properties: {
          file: { type: 'string', format: 'binary', description: FILE_UPLOADS[key] },
          caption: { type: 'string' }, mediaType: { type: 'string' }
        }
      } } }
    };
  }
  if (!['post', 'put', 'patch'].includes(method)) return undefined;
  const schema = BODY_SCHEMAS[key] || { type: 'object', additionalProperties: true };
  return {
    required: Boolean(schema.required?.length),
    description: BODY_SCHEMAS[key] ? undefined : 'JSON payload. Required fields and validation depend on this operation.',
    content: { 'application/json': { schema } }
  };
}

function responseFor(method, path) {
  if (method === 'post' && path === '/api/demo-requests') {
    return { 410: { description: 'Demo requests are closed; use /signup or /contact.' } };
  }
  if (method === 'get' && path === '/api/sitemap.xml') {
    return { 200: { description: 'XML sitemap', content: { 'application/xml': { schema: { type: 'string' } } } } };
  }
  if (method === 'get' && /\/pdf$/.test(path)) {
    return { 200: { description: 'PDF document', content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } } }, 403: { description: 'Access denied or signed link expired' } };
  }
  const responses = {
    200: { description: 'Request completed' },
    400: { description: 'Invalid request' },
    403: { description: 'Permission or plan does not allow this action' },
    500: { description: 'Server error' }
  };
  if (method === 'post') responses[201] = { description: 'Resource created or request accepted' };
  if (securityFor(method, path).length) responses[401] = { description: 'Authentication required' };
  return responses;
}

function buildAdditionalPaths() {
  const paths = {};
  for (const { method, path, summary } of routeDefinitions) {
    const parameters = [...path.matchAll(/\{([^}]+)\}/g)].map(([, name]) => ({
      in: 'path', name, required: true, schema: { type: 'string' }
    }));
    const key = `${method} ${path}`;
    if (key === 'get /api/invoices/signed/{id}/pdf') {
      parameters.push(
        { in: 'query', name: 'exp', required: true, schema: { type: 'string' }, description: 'Signed link expiry' },
        { in: 'query', name: 'sig', required: true, schema: { type: 'string' }, description: 'HMAC signature' }
      );
    }
    if (key === 'get /api/webhook/whatsapp') {
      parameters.push(
        { in: 'query', name: 'hub.mode', required: true, schema: { type: 'string' } },
        { in: 'query', name: 'hub.verify_token', required: true, schema: { type: 'string' } },
        { in: 'query', name: 'hub.challenge', required: true, schema: { type: 'string' } }
      );
    }
    if (key === 'post /api/webhook/whatsapp') {
      parameters.push({ in: 'header', name: 'X-Hub-Signature-256', required: true, schema: { type: 'string' } });
    }
    const operation = {
      tags: [tagFor(path)],
      summary,
      operationId: `${method}_${path.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')}`,
      security: securityFor(method, path),
      responses: responseFor(method, path)
    };
    if (parameters.length) operation.parameters = parameters;
    const requestBody = requestBodyFor(method, path);
    if (requestBody) operation.requestBody = requestBody;
    if (path.startsWith('/api/super-admin/')) operation.description = 'Requires a Super Admin account.';
    if (path.startsWith('/api/v1/')) operation.description = 'Use X-KWICKBOT-API-KEY. Developer configuration endpoints also accept a merchant JWT.';
    if (key === 'post /api/demo-requests') operation.deprecated = true;
    (paths[path] ||= {})[method] = operation;
  }
  return paths;
}

module.exports = { buildAdditionalPaths, routeDefinitions };
