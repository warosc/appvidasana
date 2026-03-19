import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateWasteDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  warehouseId: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsString()
  @IsIn(["kg", "caja", "pieza"])
  unit: "kg" | "caja" | "pieza";

  @IsString()
  @IsIn(["caducado", "danado", "pudricion", "error_manejo"])
  reason: "caducado" | "danado" | "pudricion" | "error_manejo";

  @IsString()
  @IsNotEmpty()
  responsible: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reference?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  note?: string;
}

