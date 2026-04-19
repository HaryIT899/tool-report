/**
 * Type definitions for Puppeteer automation
 */

import { Proxy } from '../proxies/schemas/proxy.schema';

export interface ReportPageData {
  domain: string;
  reason: string;
  email?: string;
  serviceId: string;
  proxy?: Proxy;
  profilePath?: string;
}

export type ReportStageCallback = (event: {
  stage: string;
  message?: string;
}) => void | Promise<void>;

export interface GoogleAuthState {
  loggedIn: boolean;
  locked: boolean;
  needsRelogin: boolean;
  reason?: string;
}

export type GoogleSessionStatus = 'ACTIVE' | 'NEED_RELOGIN' | 'LOCKED';

export interface GoogleLoginResult {
  ok: boolean;
  status: 'ACTIVE' | 'NEED_RELOGIN' | 'INVALID' | 'LOCKED';
  reason?: string;
}
