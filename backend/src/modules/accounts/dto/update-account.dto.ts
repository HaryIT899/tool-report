import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateAccountDto {
  @IsOptional()
  @IsEnum(['ACTIVE', 'NEED_RELOGIN', 'INVALID', 'LOCKED'])
  status?: string;

  @IsOptional()
  @IsString()
  password?: string;
}
