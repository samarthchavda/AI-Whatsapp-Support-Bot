jest.mock('./api', () => ({ get: jest.fn() }));

import { parseStoreConnections } from './storeConnections';

test('only active connections unlock store dependent pages', () => {
  const result = parseStoreConnections({ success: true, data: [
    { platform: 'shopify', isActive: false },
    { platform: 'woocommerce', isActive: true, storeUrl: 'example.com' }
  ] });
  expect(result.shopify).toBeNull();
  expect(result.woocommerce.storeUrl).toBe('example.com');
});

test('a failed or malformed response is not mistaken for a disconnected store', () => {
  expect(() => parseStoreConnections({ success: false, error: 'Unavailable' })).toThrow('Unavailable');
  expect(() => parseStoreConnections({ data: null })).toThrow('Store connection response is unavailable.');
});
