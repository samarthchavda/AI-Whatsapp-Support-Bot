export function validateShopifyStoreUrl(value) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.port || url.search || url.hash) return false;
    if (/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(url.hostname)) return url.pathname === '/';
    return url.hostname === 'admin.shopify.com' && /^\/store\/[a-z0-9][a-z0-9-]*\/?$/i.test(url.pathname);
  } catch {
    return false;
  }
}

export function getSyncFeedback(platform, summary) {
  if (summary?.success === false || summary?.error) {
    return { type: 'error', message: `${platform} sync failed: ${summary.error || 'Unknown error'}.`, errors: [] };
  }
  const errors = Array.isArray(summary?.errors) ? summary.errors : [];
  const fetched = Number(summary?.fetched || 0);
  const created = Number(summary?.created || 0);
  const updated = Number(summary?.updated || 0);
  return {
    type: errors.length ? 'warning' : 'success',
    message: `${platform} sync finished: ${fetched} fetched, ${created} created, ${updated} updated${errors.length ? `, ${errors.length} failed` : ''}.`,
    errors: errors.slice(0, 5).map(item => `${item.externalOrderId || 'Order'}: ${item.error || 'Unknown error'}`)
  };
}

// The backend currently returns /api/webhooks/{platform}/{secret}, while its
// mounted commerce routes are /api/webhooks/{platform}/orders. Do not present
// an unmounted endpoint as a ready-to-use webhook setup instruction.
export function isMountedCommerceWebhookUrl(value, platform) {
  if (!value || !['shopify', 'woocommerce'].includes(platform)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.pathname === `/api/webhooks/${platform}/orders`;
  } catch {
    return false;
  }
}
