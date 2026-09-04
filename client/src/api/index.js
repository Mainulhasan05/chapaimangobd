import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL || 'https://chapaimango-api.parlorprobd.com/api';
export const API_BASE = rawApiUrl.replace(/\/+$/, '').endsWith('/api')
  ? rawApiUrl.replace(/\/+$/, '')
  : `${rawApiUrl.replace(/\/+$/, '')}/api`;

export const BACKEND_URL = API_BASE.replace(/\/api$/, '');

/**
 * Resolves any image URL to the backend API host
 * Fixes relative paths like /uploads/bills/... and frontend domain mismatches
 */
export const getImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  if (trimmed.startsWith(BACKEND_URL)) {
    return trimmed;
  }

  if (trimmed.includes('/uploads/')) {
    const uploadSubpath = trimmed.substring(trimmed.indexOf('/uploads/'));
    return `${BACKEND_URL}${uploadSubpath}`;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${BACKEND_URL}${cleanPath}`;
};

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
  update: (id, data) => api.post(`/customers/${id}`, data), // Uses POST to avoid 403 Forbidden on LiteSpeed/cPanel
  getLedger: (id, params) => api.get(`/customers/${id}/ledger`, { params }),
  recordPayment: (id, data) => api.post(`/customers/${id}/payment`, data),
  delete: (id, params) => {
    const payload = params || {};
    return api.post(`/customers/${id}/delete`, payload, { params }).catch((err) => {
      if (err.response?.status === 404 || err.response?.status === 405) {
        return api.delete(`/customers/${id}`, { params });
      }
      throw err;
    });
  },
  getPublicBill: (shortCode) => api.get(`/customers/public-bill/${shortCode}`),
  uploadBillImage: (formData) =>
    api.post('/customers/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteBillImage: (data) => api.post('/customers/delete-image', data),
};

// ============================================
// Order API
// ============================================
export const orderAPI = {
  getAll: (params) => api.get('/orders', { params }),
  getOne: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.post(`/orders/${id}`, data), // Uses POST to avoid 403 Forbidden on LiteSpeed/cPanel
  delete: (id, params) => {
    const payload = params || {};
    return api.post(`/orders/${id}/delete`, payload, { params }).catch((err) => {
      if (err.response?.status === 404 || err.response?.status === 405) {
        return api.delete(`/orders/${id}`, { params });
      }
      throw err;
    });
  },
  addPayment: (id, data) => api.post(`/orders/${id}/payment`, data),
  getDailySummary: (params) => api.get('/orders/daily-summary', { params }),
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
  getStats: () => api.get('/sms/stats'),
  getConfig: () => api.get('/sms/config'),
  updateConfig: (data) => api.post('/sms/config', data),
  test: (data) => api.post('/sms/test', data),
  getBalance: () => api.get('/sms/balance'),
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
  rollback: (batchId) => api.post(`/import/rollback/${batchId}`),
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
