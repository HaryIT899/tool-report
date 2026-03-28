import { IsEnum, IsOptional, IsString, IsArray, IsNumber } from 'class-validator';

export class UpdateDomainDto {
  @IsOptional()
  @IsEnum(['pending', 'processing', 'reported', 'failed'])
  status?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  template?: string;

  @IsOptional()
  @IsString()
  registrar?: string;

  @IsOptional()
  @IsString()
  nameserver?: string;

  @IsOptional()
  @IsArray()
  reportedServices?: string[];

  @IsOptional()
  @IsArray()
  failedServices?: string[];

  @IsOptional()
  @IsNumber()
  reportProgress?: number;
}
