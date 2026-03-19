import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class PasswordRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  username: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
