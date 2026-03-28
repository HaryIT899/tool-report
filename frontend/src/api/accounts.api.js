import api from './api';

export const accountsApi = {
  list: () => api.get('/accounts').then((r) => r.data),
  create: (payload) => api.post('/accounts', payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/accounts/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/accounts/${id}`).then((r) => r.data),
  resetStats: () => api.post('/accounts/reset-stats').then((r) => r.data),
  validateSession: (id) => api.get(`/accounts/${id}/validate-session`).then((r) => r.data),
  prepareSession: (id) => api.post(`/accounts/${id}/prepare-session`).then((r) => r.data),
};
