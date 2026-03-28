import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDomainDto {
  @IsNotEmpty()
  @IsString()
  domain: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  template?: string;
}
