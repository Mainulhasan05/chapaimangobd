import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============================================
// Auth API
// ============================================
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  sendForgotPasswordOtp: (data) => api.post('/auth/forgot-password/send-otp', data),
  verifyForgotPasswordOtp: (data) => api.post('/auth/forgot-password/verify-otp', data),
  resetPassword: (data) => api.post('/auth/forgot-password/reset', data),
};

// ============================================
// Customer API
// ============================================
export const customerAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getOne: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  getLedger: (id, params) => api.get(`/customers/${id}/ledger`, { params }),
  recordPayment: (id, data) => api.post(`/customers/${id}/payment`, data),
};

// ============================================
// Order API
// ============================================
export const orderAPI = {
  getAll: (params) => api.get('/orders', { params }),
  getOne: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.put(`/orders/${id}`, data),
  addPayment: (id, data) => api.post(`/orders/${id}/payment`, data),
};

// ============================================
// Dashboard API
// ============================================
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getChartData: (params) => api.get('/dashboard/chart-data', { params }),
};

// ============================================
// SMS API
// ============================================
export const smsAPI = {
  send: (data) => api.post('/sms/send', data),
  preview: (data) => api.post('/sms/preview', data),
  getHistory: (params) => api.get('/sms/history', { params }),
  getConfig: () => api.get('/sms/config'),
  updateConfig: (data) => api.put('/sms/config', data),
  test: (data) => api.post('/sms/test', data),
};

// ============================================
// Excel Import API
// ============================================
export const importAPI = {
  preview: (formData) =>
    api.post('/import/preview', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  execute: (formData) =>
    api.post('/import/execute', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getTemplate: () => api.get('/import/template'),
};

// ============================================
// Audit Logs API
// ============================================
export const auditAPI = {
  getAll: (params) => api.get('/audit-logs', { params }),
  getStats: () => api.get('/audit-logs/stats'),
};

export default api;
