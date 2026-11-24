const fs = require('fs');
const path = require('path');
const swaggerSpec = require('../config/swagger');

const methods = ['get', 'post', 'put', 'patch', 'delete'];

function mountedApiOperations() {
  const server = fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8');
  const imports = new Map(
    [...server.matchAll(/const\s+(\w+)\s*=\s*require\(['"]\.\/routes\/([^'"]+)['"]\)/g)]
      .map(([, variable, file]) => [variable, file])
  );
  const operations = new Set(['get /api/sitemap.xml']);
  const mountPattern = /app\.use\(['"](\/api\/[^'"]+)['"],\s*(?:require\(['"]\.\/routes\/([^'"]+)['"]\)|([A-Za-z]\w*))/g;

  for (const [, prefix, requiredFile, variable] of server.matchAll(mountPattern)) {
    const routeFile = requiredFile || imports.get(variable);
    if (!routeFile) continue;
    const fullPath = path.join(__dirname, '../routes', `${routeFile.replace(/\.js$/, '')}.js`);
    const source = fs.readFileSync(fullPath, 'utf8');
    for (const [, method, localPath] of source.matchAll(/router\.(get|post|put|patch|delete|all)\(\s*['"]([^'"]+)['"]/g)) {
      const openApiPath = `${prefix}${localPath}`.replace(/\/+/g, '/').replace(/\/$/, '').replace(/:([A-Za-z0-9_]+)/g, '{$1}');
      for (const expandedMethod of method === 'all' ? ['get', 'post'] : [method]) {
        operations.add(`${expandedMethod} ${openApiPath}`);
      }
    }
  }
  return operations;
}

test('Swagger documents every mounted API method and path without stale entries', () => {
  const actual = mountedApiOperations();
  const documented = new Set(
    Object.entries(swaggerSpec.paths).flatMap(([route, item]) =>
      methods.filter((method) => item[method]).map((method) => `${method} ${route}`)
    )
  );

  expect(actual.size).toBe(200);
  expect([...actual].filter((operation) => !documented.has(operation))).toEqual([]);
  expect([...documented].filter((operation) => !actual.has(operation))).toEqual([]);
});

test('documented routes expose usable path parameters, responses, and API key auth', () => {
  for (const [route, item] of Object.entries(swaggerSpec.paths)) {
    for (const method of methods.filter((candidate) => item[candidate])) {
      const operation = item[method];
      expect(operation.responses).toBeDefined();
      for (const [, name] of route.matchAll(/\{([^}]+)\}/g)) {
        expect(operation.parameters || []).toEqual(expect.arrayContaining([
          expect.objectContaining({ in: 'path', name, required: true })
        ]));
      }
    }
  }
  expect(swaggerSpec.components.securitySchemes.ApiKeyAuth.name).toBe('X-KWICKBOT-API-KEY');
  expect(swaggerSpec.paths['/api/v1/messages/send'].post.security).toEqual([{ ApiKeyAuth: [] }]);
  expect(swaggerSpec.paths['/api/auth/signup'].post.security).toEqual([]);
});
