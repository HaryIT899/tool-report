import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PuppeteerAdvancedService } from '../puppeteer/puppeteer-advanced.service';

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(
    private accountsService: AccountsService,
    private puppeteerAdvancedService: PuppeteerAdvancedService,
  ) {}

  @Post()
  async create(@Body() createAccountDto: CreateAccountDto) {
    return this.accountsService.create(createAccountDto);
  }

  @Get()
  async findAll() {
    return this.accountsService.findAll();
  }

  @Get(':id/validate-session')
  async validateSession(@Param('id') id: string) {
    const account = await this.accountsService.ensureProfilePathById(id);
    if (!account) throw new NotFoundException('Account not found');
    const state = await this.puppeteerAdvancedService.getGoogleSessionState(account.profilePath);
    await this.accountsService.update(id, { status: state.status });
    return { ok: state.status === 'ACTIVE', status: state.status, reason: state.reason };
  }

  @Post(':id/prepare-session')
  async prepareSession(@Param('id') id: string) {
    const account = await this.accountsService.ensureProfilePathById(id);
    if (!account) throw new NotFoundException('Account not found');
    const password = await this.accountsService.getDecryptedPasswordById(id);
    const autoEnabled = process.env.AUTO_GOOGLE_LOGIN !== 'false';

    if (autoEnabled && password) {
      const auto = await this.puppeteerAdvancedService.autoLoginGoogle(
        account.profilePath,
        account.email,
        password,
      );
      await this.accountsService.update(id, { status: auto.status });
      if (auto.ok) {
        return { ok: true, status: auto.status, reason: auto.reason, mode: 'auto' };
      }
      if (auto.status === 'LOCKED' || auto.status === 'INVALID') {
        return { ok: false, status: auto.status, reason: auto.reason, mode: 'auto' };
      }
    }

    const ok = await this.puppeteerAdvancedService.prepareGoogleLogin(account.profilePath);
    if (!ok) {
      const state = await this.puppeteerAdvancedService.getGoogleSessionState(account.profilePath);
      await this.accountsService.update(id, { status: state.status });
      return { ok: false, status: state.status, reason: state.reason, mode: 'manual' };
    }
    await this.accountsService.update(id, { status: 'ACTIVE' });
    return { ok: true, status: 'ACTIVE', mode: 'manual' };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateAccountDto: UpdateAccountDto) {
    return this.accountsService.update(id, updateAccountDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.accountsService.delete(id);
    return { message: 'Account deleted successfully' };
  }

  @Post('reset-stats')
  async resetStats() {
    await this.accountsService.resetUsageStats();
    return { message: 'Usage stats reset successfully' };
  }
}
