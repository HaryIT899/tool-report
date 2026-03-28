export const REPORT_QUEUE = 'report-queue';

export interface ReportJobData {
  domainId: string;
  serviceId: string;
  userId: string;
  domain: string;
  reason: string;
  accountId?: string;
  email?: string;
}
