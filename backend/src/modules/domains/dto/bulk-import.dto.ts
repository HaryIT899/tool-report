import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class BulkImportDto {
  @IsNotEmpty()
  @IsString()
  domains: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  template?: string;
}
