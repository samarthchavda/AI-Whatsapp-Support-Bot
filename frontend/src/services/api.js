import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5001/api' : '/api');
const ACCESS_TOKEN_KEY = 'accessToken';
const LEGACY_TOKEN_KEY = 'token';

const authlessHttp = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

const getStoredAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);

const setStoredAccessToken = (token) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  localStorage.setItem(LEGACY_TOKEN_KEY, token);
};

const clearStoredAuth = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem('admin');
};

let refreshPromise = null;

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = authlessHttp.post('/auth/refresh')
      .then((response) => {
        const newAccessToken = response.data?.data?.accessToken || response.data?.data?.token;

        if (!newAccessToken) {
          throw new Error('Refresh endpoint did not return a new access token');
        }

        setStoredAccessToken(newAccessToken);

        if (response.data?.data?.admin) {
          localStorage.setItem('admin', JSON.stringify(response.data.data.admin));
        }

        return newAccessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = getStoredAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isUnauthorized = error.response?.status === 401;
    const isAuthEndpoint = originalRequest?.url?.includes('/auth/login') || originalRequest?.url?.includes('/auth/refresh');

    if (isUnauthorized && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        const newAccessToken = await refreshAccessToken();
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        clearStoredAuth();

        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');

// Conversations
export const getConversations = (params) => api.get('/conversations', { params });
export const getConversationById = (id) => api.get(`/conversations/${id}`);
export const getConversationsByPhone = (phone) => api.get(`/conversations/phone/${phone}`);
export const updateConversation = (id, data) => api.patch(`/conversations/${id}`, data);
export const sendConversationMessage = (data) => api.post('/conversations/send-message', data);

// Super Admin
export const getSuperAdminUsers = () => api.get('/super-admin/users');
export const getSuperAdminAnalytics = () => api.get('/super-admin/analytics');

// Orders
export const getOrders = (params) => api.get('/orders', { params });
export const getOrderById = (id) => api.get(`/orders/${id}`);
export const getOrdersByPhone = (phone) => api.get(`/orders/phone/${phone}`);
export const createOrder = (data) => api.post('/orders', data);
export const updateOrder = (id, data) => api.patch(`/orders/${id}`, data);
export const deleteOrder = (id) => api.delete(`/orders/${id}`);

// Abandoned Carts
export const getAbandonedCarts = (params) => api.get('/abandoned-carts', { params });
export const getAbandonedCartStats = () => api.get('/abandoned-carts/stats');
export const sendAbandonedCartReminder = (id) => api.post(`/abandoned-carts/${id}/send-reminder`);

// Escalations
export const getEscalations = (params) => api.get('/dashboard/escalations', { params });
export const updateEscalation = (id, data) => api.patch(`/dashboard/escalations/${id}`, data);

// WhatsApp
export const sendWhatsAppMessage = (data) => api.post('/webhook/send', data);
export const getWhatsAppStatus = () => api.get('/webhook/status');
export const disconnectWhatsApp = () => api.post('/webhook/disconnect');
export const connectWhatsApp = () => api.post('/webhook/connect');

// AI Simulating/Testing
export const testAIMessage = (data) => api.post('/ai/test-message', data);

// SaaS Subscriptions & Billing
export const getPricingPlans = () => api.get('/auth/plans');
export const upgradePricingPlan = (planName, couponCode) => api.post('/auth/upgrade-plan', { planName, couponCode });
export const getAdminProfile = () => api.get('/auth/profile');
export const updateAdminProfile = (data) => api.put('/auth/profile', data);

export const refreshAuth = () => refreshAccessToken();

export const clearAuthState = () => clearStoredAuth();

export default api;
