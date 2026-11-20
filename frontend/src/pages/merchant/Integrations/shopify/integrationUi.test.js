import { getSyncFeedback, isMountedCommerceWebhookUrl, validateShopifyStoreUrl } from './integrationUi';

test('accepts supported Shopify store URLs and rejects unrelated hosts', () => {
  expect(validateShopifyStoreUrl('https://my-store.myshopify.com')).toBe(true);
  expect(validateShopifyStoreUrl('https://admin.shopify.com/store/my-store')).toBe(true);
  expect(validateShopifyStoreUrl('https://my-store.myshopify.com.evil.test')).toBe(false);
  expect(validateShopifyStoreUrl('http://my-store.myshopify.com')).toBe(false);
});

test('does not treat the current generated secret URL as a mounted webhook route', () => {
  expect(isMountedCommerceWebhookUrl('https://api.example.com/api/webhooks/shopify/secret-value', 'shopify')).toBe(false);
  expect(isMountedCommerceWebhookUrl('https://api.example.com/api/webhooks/shopify/orders', 'shopify')).toBe(true);
});

test('reports partial order syncs with their failed orders', () => {
  const result = getSyncFeedback('Shopify', {
    fetched: 3,
    created: 1,
    updated: 1,
    errors: [{ externalOrderId: 'S-3', error: 'Missing customer' }]
  });
  expect(result.type).toBe('warning');
  expect(result.message).toContain('1 failed');
  expect(result.errors).toContain('S-3: Missing customer');
});

test('does not report a failed sync as successful', () => {
  expect(getSyncFeedback('Shopify', { success: false, error: 'Invalid token' }).type).toBe('error');
});
