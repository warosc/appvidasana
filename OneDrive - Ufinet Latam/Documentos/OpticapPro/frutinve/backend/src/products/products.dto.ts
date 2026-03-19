import { Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsString()
  @IsIn(["fruta", "verdura"])
  type: "fruta" | "verdura";

  @IsString()
  @IsIn(["kg", "caja", "pieza"])
  baseUnit: "kg" | "caja" | "pieza";

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  conversionToKg?: number;

  @IsOptional()
  @IsBoolean()
  expires?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minStock?: number;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(["fruta", "verdura"])
  type?: "fruta" | "verdura";

  @IsOptional()
  @IsString()
  @IsIn(["kg", "caja", "pieza"])
  baseUnit?: "kg" | "caja" | "pieza";

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  conversionToKg?: number;

  @IsOptional()
  @IsBoolean()
  expires?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minStock?: number;
}

