// Connects the new super admin pages to this app:
//  - default export: the app's existing API client (main backend, /api)
//  - saApi: the new super admin API (super-admin/api, /sa-api/v1) with the same
//    login token; a 401 refreshes through the main backend, like everywhere else
import axios from 'axios';
import api, { refreshAuth, clearAuthState } from '../../services/api';

export const SA_API_BASE = process.env.REACT_APP_SA_API_URL || '/sa-api/v1';

export function getStoredToken() {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
  return token && token !== 'undefined' && token !== 'null' ? token : null;
}

export function getStoredAdmin() {
  try {
    const raw = localStorage.getItem('admin');
    return raw && raw !== 'undefined' ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const saApi = axios.create({ baseURL: SA_API_BASE, headers: { 'Content-Type': 'application/json' } });

saApi.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

saApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        const token = await refreshAuth();
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${token}`;
        return saApi(original);
      } catch (refreshError) {
        clearAuthState();
        if (window.location.pathname !== '/login') window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export function errorMessage(error, fallback = 'Something went wrong. Try again.') {
  const data = error?.response?.data;
  const fromServer = typeof data === 'object' && data ? data.message || data.error : null;
  if (fromServer) return fromServer;
  if (!error?.response || error.response.status >= 500) return 'Cannot connect to the server. Try again.';
  return fallback;
}

export default api;
