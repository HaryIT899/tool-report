import api from './api';

export const reportLogsApi = {
  domainLogs: (domainId) => api.get(`/report-logs/domain/${domainId}`).then((r) => r.data),
  stats: () => api.get('/report-logs/stats').then((r) => r.data),
};

