import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');

// Conversations
export const getConversations = (params) => api.get('/conversations', { params });
export const getConversationById = (id) => api.get(`/conversations/${id}`);
export const getConversationsByPhone = (phone) => api.get(`/conversations/phone/${phone}`);
export const updateConversation = (id, data) => api.patch(`/conversations/${id}`, data);

// Orders
export const getOrders = (params) => api.get('/orders', { params });
export const getOrderById = (id) => api.get(`/orders/${id}`);
export const getOrdersByPhone = (phone) => api.get(`/orders/phone/${phone}`);
export const createOrder = (data) => api.post('/orders', data);
export const updateOrder = (id, data) => api.patch(`/orders/${id}`, data);
export const deleteOrder = (id) => api.delete(`/orders/${id}`);

// Escalations
export const getEscalations = (params) => api.get('/dashboard/escalations', { params });
export const updateEscalation = (id, data) => api.patch(`/dashboard/escalations/${id}`, data);

// WhatsApp
export const sendWhatsAppMessage = (data) => api.post('/webhook/send', data);
export const getWhatsAppStatus = () => api.get('/webhook/status');

export default api;
