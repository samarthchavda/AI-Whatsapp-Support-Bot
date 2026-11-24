// Same API contract as the current dashboard (frontend/src/services/api.js):
// same base path, same localStorage keys, same /auth/refresh retry. A session
// created here or in the current dashboard works in both on the same domain.
import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const ACCESS_TOKEN_KEY = 'accessToken';
const LEGACY_TOKEN_KEY = 'token';
const ADMIN_KEY = 'admin';

const authless = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

export function getStoredToken() {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
  return token && token !== 'undefined' && token !== 'null' ? token : null;
}

export function getStoredAdmin() {
  try {
    const raw = localStorage.getItem(ADMIN_KEY);
    return raw && raw !== 'undefined' && raw !== 'null' ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeSession(token, admin) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  localStorage.setItem(LEGACY_TOKEN_KEY, token);
  if (admin) localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

// Mirrors clearStoredAuth() in the current dashboard, impersonation keys included
export function clearSession() {
  ['accessToken', 'token', 'admin', 'originalToken', 'originalAdmin', 'isImpersonated', 'impersonatedUserEmail', 'impersonatedUserName']
    .forEach((key) => localStorage.removeItem(key));
  try {
    ['originalToken', 'originalAdmin', 'isImpersonated', 'impersonatedUserEmail', 'impersonatedUserName']
      .forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // storage unavailable
  }
}

export function isJwtExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return !payload.exp || payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

let refreshPromise = null;

export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = authless.post('/auth/refresh')
      .then((response) => {
        const data = response.data?.data || {};
        const token = data.accessToken || data.token;
        if (!token) throw new Error('Refresh did not return an access token');
        storeSession(token, data.admin);
        return { token, admin: data.admin || getStoredAdmin() };
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

// Same request as the public site's login page
export async function loginRequest(email, password) {
  const response = await authless.post('/auth/login', { email, password });
  const data = response.data?.data || {};
  const token = data.accessToken || data.token;
  if (!response.data?.success || !token) {
    throw new Error(response.data?.message || 'Login failed. Check your email and password.');
  }
  // This panel is for Kwickbot super admins only. A merchant login is not
  // stored here, so it never touches the merchant's session in the dashboard.
  if (data.admin?.role !== 'super_admin') {
    const err = new Error('This panel is for Kwickbot admins. Merchants log in at kwickbot.in/login.');
    err.code = 'NOT_SUPER_ADMIN';
    throw err;
  }
  storeSession(token, data.admin);
  return data.admin;
}

export async function logoutRequest() {
  try {
    await api.post('/auth/logout');
  } finally {
    clearSession();
  }
}

// The new super admin API (super-admin/api): plans, coupons, offers.
// Same login token; a 401 refreshes through the main backend.
export const SA_API_BASE = import.meta.env.VITE_SA_API_URL || '/sa-api/v1';
export const saApi = axios.create({
  baseURL: SA_API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

function withAuth(client) {
  client.interceptors.request.use((config) => {
    const token = getStoredToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const original = error.config;
      const isAuthCall = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');
      if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
        original._retry = true;
        try {
          const { token } = await refreshSession();
          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${token}`;
          return client(original);
        } catch (refreshError) {
          clearSession();
          if (window.location.pathname !== '/login') window.location.assign('/login');
          return Promise.reject(refreshError);
        }
      }
      return Promise.reject(error);
    }
  );
}

withAuth(api);
withAuth(saApi);

export function errorMessage(error, fallback = 'Something went wrong. Try again.') {
  if (error?.code === 'NOT_SUPER_ADMIN') return error.message;
  const data = error?.response?.data;
  const fromServer = typeof data === 'object' && data ? data.message || data.error : null;
  if (fromServer) return fromServer;
  if (!error?.response || error.response.status >= 500) return 'Cannot connect to the server. Try again.';
  return fallback;
}

export default api;
