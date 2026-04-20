import axios from 'axios';

// Always use relative path - Vite proxy will handle routing to backend
const baseURL = '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const isAuthRequest =
        url.includes('auth/login') ||
        url.includes('auth/register') ||
        url.includes('/auth/login') ||
        url.includes('/auth/register') ||
        url.includes('/api/auth/login') ||
        url.includes('/api/auth/register');

      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!isAuthRequest && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
