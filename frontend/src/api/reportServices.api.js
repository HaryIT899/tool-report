import api from './api';

export const reportServicesApi = {
  list: () => api.get('/report-services').then((r) => r.data),
};

