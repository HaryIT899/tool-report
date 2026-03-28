import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class ProfileManagerService {
  getProfilesRoot(): string {
    const configured = process.env.PROFILES_DIR;
    const root = configured ? path.resolve(configured) : path.resolve(process.cwd(), 'profiles');
    return root;
  }

  getProfilePathForAccountId(accountId: string): string {
    const root = this.getProfilesRoot();
    const safe = String(accountId).replace(/[^a-z0-9]+/gi, '_');
    return path.join(root, safe);
  }

  async ensureProfileForAccountId(accountId: string): Promise<string> {
    const root = this.getProfilesRoot();
    await fs.promises.mkdir(root, { recursive: true });

    const profilePath = this.getProfilePathForAccountId(accountId);
    await fs.promises.mkdir(profilePath, { recursive: true });
    return profilePath;
  }

  async ensureProfileForEmail(email: string): Promise<string> {
    const root = this.getProfilesRoot();
    await fs.promises.mkdir(root, { recursive: true });

    const safe = String(email)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_');
    const profilePath = path.join(root, `profile_${safe}`);
    await fs.promises.mkdir(profilePath, { recursive: true });
    return profilePath;
  }
}
