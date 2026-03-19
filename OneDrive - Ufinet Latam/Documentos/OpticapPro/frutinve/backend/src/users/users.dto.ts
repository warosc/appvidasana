import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  username: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsIn(["admin", "bodeguero", "ventas", "compras", "auditor"])
  role: "admin" | "bodeguero" | "ventas" | "compras" | "auditor";

  @IsOptional()
  isActive?: boolean;
}

export class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ResetPasswordRequestDto {
  @IsString()
  @IsNotEmpty()
  password: string;
}