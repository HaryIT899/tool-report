import { IsEmail, IsNotEmpty, IsOptional, IsString, IsIn } from 'class-validator';

export class CreateAccountDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  profilePath?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsIn(['google'])
  provider?: string;
}
