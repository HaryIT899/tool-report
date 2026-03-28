import { IsOptional, IsEnum } from 'class-validator';

export class UpdateProxyDto {
  @IsOptional()
  @IsEnum(['active', 'banned', 'inactive'])
  status?: string;
}
