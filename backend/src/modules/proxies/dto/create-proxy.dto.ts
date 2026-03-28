import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

export class CreateProxyDto {
  @IsString()
  host: string;

  @IsNumber()
  port: number;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsEnum(['http', 'https', 'socks4', 'socks5'])
  type?: string;
}
