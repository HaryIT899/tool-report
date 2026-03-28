import api from './api';

export const templatesApi = {
  list: () => api.get('/templates').then((r) => r.data),
  get: (id) => api.get(`/templates/${id}`).then((r) => r.data),
  create: (payload) => api.post('/templates', payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/templates/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/templates/${id}`).then((r) => r.data),
};

