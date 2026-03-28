import api from './api';

export const reportsApi = {
  reportDomain: (domainId, payload) =>
    api.post(`/reports/domain/${domainId}`, payload).then((r) => r.data),
  resetDomain: (domainId) => api.post(`/reports/domain/${domainId}/reset`).then((r) => r.data),
  reportAll: () => api.post('/reports/all').then((r) => r.data),
  queueStats: () => api.get('/reports/queue-stats').then((r) => r.data),
  pauseQueue: () => api.post('/reports/queue/pause').then((r) => r.data),
  resumeQueue: () => api.post('/reports/queue/resume').then((r) => r.data),
  cleanQueue: () => api.post('/reports/queue/clean').then((r) => r.data),
};
