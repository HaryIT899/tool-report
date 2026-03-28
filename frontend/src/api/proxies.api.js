import api from './api';

export const proxiesApi = {
  list: () => api.get('/proxies').then((r) => r.data),
  create: (payload) => api.post('/proxies', payload).then((r) => r.data),
  remove: (id) => api.delete(`/proxies/${id}`).then((r) => r.data),
  resetStats: () => api.post('/proxies/reset-stats').then((r) => r.data),
};

