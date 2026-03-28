import api from './api';

export const domainsApi = {
  list: () => api.get('/domains').then((r) => r.data),
  create: (payload) => api.post('/domains', payload).then((r) => r.data),
  bulkImport: (payload) => api.post('/domains/bulk-import', payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/domains/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/domains/${id}`).then((r) => r.data),
};

