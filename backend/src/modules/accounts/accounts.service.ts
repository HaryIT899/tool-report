import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Account, AccountDocument } from './schemas/account.schema';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { ProfileManagerService } from './profile-manager.service';
import { Types } from 'mongoose';

@Injectable()
export class AccountsService {
  constructor(
    @InjectModel(Account.name) private accountModel: Model<AccountDocument>,
    private profileManagerService: ProfileManagerService,
  ) {}

  private getKey(): Buffer {
    const raw = process.env.ACCOUNTS_CRYPTO_KEY || '';
    if (!raw) {
      throw new Error('ACCOUNTS_CRYPTO_KEY must be set');
    }
    if (/^[0-9a-f]{64}$/i.test(raw)) {
      return Buffer.from(raw, 'hex');
    }

    const base64 = raw.trim();
    try {
      const buf = Buffer.from(base64, 'base64');
      if (buf.length === 32) return buf;
    } catch {}

    if (raw.length < 32) {
      throw new Error('ACCOUNTS_CRYPTO_KEY must be at least 32 characters (or 64 hex chars)');
    }
    return Buffer.from(raw, 'utf8').subarray(0, 32);
  }

  private encrypt(plain: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.getKey(), iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      encrypted: enc.toString('base64'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  }

  private decrypt(encrypted: string, ivHex: string, tagHex: string): string {
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', this.getKey(), iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64')),
      decipher.final(),
    ]);
    return dec.toString('utf8');
  }

  async create(createAccountDto: CreateAccountDto): Promise<AccountDocument> {
    const id = new Types.ObjectId();
    const payload: any = {
      _id: id,
      email: createAccountDto.email,
      provider: createAccountDto.provider || 'google',
      status: 'NEED_RELOGIN',
    };
    payload.profilePath = createAccountDto.profilePath
      ? path.resolve(createAccountDto.profilePath)
      : await this.profileManagerService.ensureProfileForAccountId(id.toString());
    if (createAccountDto.password) {
      const enc = this.encrypt(createAccountDto.password);
      payload.encryptedPassword = enc.encrypted;
      payload.iv = enc.iv;
      payload.authTag = enc.tag;
    }
    const account = new this.accountModel(payload);
    return account.save();
  }

  async findAll(): Promise<AccountDocument[]> {
    return this.accountModel.find().sort({ lastUsedAt: 1 }).exec();
  }

  async findById(id: string): Promise<AccountDocument> {
    return this.accountModel.findById(id).exec();
  }

  async ensureProfilePathById(id: string): Promise<AccountDocument | null> {
    const account = await this.accountModel.findById(id).exec();
    if (!account) return null;
    const desired = this.profileManagerService.getProfilePathForAccountId(account._id.toString());

    if (!account.profilePath) {
      account.profilePath = await this.profileManagerService.ensureProfileForAccountId(
        account._id.toString(),
      );
      await account.save();
      return account;
    }

    const currentResolved = path.resolve(account.profilePath);
    const desiredResolved = path.resolve(desired);
    if (currentResolved !== desiredResolved) {
      const currentExists = fs.existsSync(currentResolved);
      const desiredExists = fs.existsSync(desiredResolved);
      if (currentExists && !desiredExists) {
        try {
          await fs.promises.rename(currentResolved, desiredResolved);
          account.profilePath = desiredResolved;
          await account.save();
        } catch {}
      }
    }

    return account;
  }

  async normalizeStatuses(): Promise<void> {
    await this.accountModel.updateMany({ status: 'active' as any }, { status: 'ACTIVE' }).exec();
    await this.accountModel
      .updateMany({ status: 'expired' as any }, { status: 'NEED_RELOGIN' })
      .exec();
    await this.accountModel.updateMany({ status: 'inactive' as any }, { status: 'INVALID' }).exec();
    await this.accountModel.updateMany({ status: 'banned' as any }, { status: 'LOCKED' }).exec();
  }

  async update(id: string, updateAccountDto: UpdateAccountDto): Promise<AccountDocument> {
    const payload: any = {};
    if (updateAccountDto.status) payload.status = updateAccountDto.status;
    if (updateAccountDto.password) {
      const enc = this.encrypt(updateAccountDto.password);
      payload.encryptedPassword = enc.encrypted;
      payload.iv = enc.iv;
      payload.authTag = enc.tag;
    }
    return this.accountModel.findByIdAndUpdate(id, payload, { new: true }).exec();
  }

  async delete(id: string): Promise<void> {
    await this.accountModel.findByIdAndDelete(id).exec();
  }

  async getNextActiveAccount(excludeIds: string[] = []): Promise<AccountDocument | null> {
    const excludeObjectIds = excludeIds.filter(Boolean).map((id) => new Types.ObjectId(id));
    const query: any = { status: 'ACTIVE' };
    if (excludeObjectIds.length > 0) {
      query._id = { $nin: excludeObjectIds };
    }

    const account = await this.accountModel
      .findOne(query)
      .sort({ lastUsedAt: 1, reportCount: 1 })
      .exec();

    if (account) {
      if (!account.profilePath) {
        account.profilePath = await this.profileManagerService.ensureProfileForAccountId(
          account._id.toString(),
        );
      }
      account.lastUsedAt = new Date();
      account.reportCount += 1;
      await account.save();
    }

    return account;
  }

  async getNextAvailableAccount(): Promise<AccountDocument | null> {
    return this.getNextActiveAccount();
  }

  async resetUsageStats(): Promise<void> {
    await this.accountModel.updateMany({}, { reportCount: 0 }).exec();
  }

  async getDecryptedPasswordById(id: string): Promise<string | null> {
    const acc = await this.accountModel.findById(id).exec();
    if (!acc || !acc.encryptedPassword || !acc.iv || !acc.authTag) return null;
    return this.decrypt(acc.encryptedPassword, acc.iv, acc.authTag);
  }
}
