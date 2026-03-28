import { Injectable, Logger } from '@nestjs/common';
import * as whois from 'whois';
import { promisify } from 'util';

const whoisLookup = promisify(whois.lookup);

export interface WhoisInfo {
  registrar?: string;
  nameservers?: string[];
  creationDate?: string;
  expirationDate?: string;
}

@Injectable()
export class WhoisService {
  private readonly logger = new Logger(WhoisService.name);

  async lookup(domain: string): Promise<WhoisInfo> {
    try {
      const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');

      this.logger.log(`Performing WHOIS lookup for ${cleanDomain}`);
      const result = await whoisLookup(cleanDomain);

      const whoisText = typeof result === 'string' ? result : String(result ?? '');
      return this.parseWhoisData(whoisText);
    } catch (error) {
      this.logger.error(`WHOIS lookup failed for ${domain}: ${error.message}`);
      return {};
    }
  }

  private parseWhoisData(data: string): WhoisInfo {
    const info: WhoisInfo = {
      nameservers: [],
    };

    const lines = data.split('\n');

    for (const line of lines) {
      const lowerLine = line.toLowerCase();

      if (lowerLine.includes('registrar:')) {
        const match = line.match(/registrar:\s*(.+)/i);
        if (match) info.registrar = match[1].trim();
      }

      if (lowerLine.includes('name server:') || lowerLine.includes('nserver:')) {
        const match = line.match(/n(?:ame)?\s*server:\s*(.+)/i);
        if (match) {
          const ns = match[1].trim().toLowerCase();
          if (!info.nameservers.includes(ns)) {
            info.nameservers.push(ns);
          }
        }
      }

      if (lowerLine.includes('creation date:') || lowerLine.includes('created:')) {
        const match = line.match(/creat(?:ion date|ed):\s*(.+)/i);
        if (match) info.creationDate = match[1].trim();
      }

      if (lowerLine.includes('expir')) {
        const match = line.match(/expir[^:]*:\s*(.+)/i);
        if (match) info.expirationDate = match[1].trim();
      }
    }

    const nameserverString = info.nameservers.join(' ').toLowerCase();
    if (nameserverString.includes('cloudflare')) {
      info.nameservers = ['Cloudflare'];
    } else if (nameserverString.includes('amazonaws')) {
      info.nameservers = ['AWS Route53'];
    } else if (nameserverString.includes('googledomains') || nameserverString.includes('google')) {
      info.nameservers = ['Google Domains'];
    }

    return info;
  }

  async detectSuggestedServices(domain: string): Promise<string[]> {
    const whoisInfo = await this.lookup(domain);
    const suggested: string[] = [];

    suggested.push('Google Spam', 'Google Phishing');

    if (whoisInfo.nameservers?.some((ns) => ns.toLowerCase().includes('cloudflare'))) {
      suggested.push('Cloudflare Abuse');
    }

    if (whoisInfo.registrar?.toLowerCase().includes('radix')) {
      suggested.push('Radix Abuse');
    }

    return suggested;
  }
}
