import api from './api';

export const parseStoreConnections = (payload) => {
  if (payload?.success === false) {
    throw new Error(payload.error || 'Store connections could not be loaded.');
  }

  const integrations = Array.isArray(payload) ? payload : payload?.data || payload?.integrations;
  if (!Array.isArray(integrations)) {
    throw new Error('Store connection response is unavailable.');
  }

  const active = integrations.filter((item) => item?.isActive === true);
  return {
    shopify: active.find((item) => item.platform === 'shopify') || null,
    woocommerce: active.find((item) => item.platform === 'woocommerce') || null
  };
};

export const fetchStoreConnections = async () => {
  const response = await api.get('/integrations');
  return parseStoreConnections(response.data);
};
