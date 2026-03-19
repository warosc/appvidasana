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

export class InventoryMovementDto {
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

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reference?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  note?: string;
}

export class InventoryTransferDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  fromWarehouseId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  toWarehouseId: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsString()
  @IsIn(["kg", "caja", "pieza"])
  unit: "kg" | "caja" | "pieza";

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  reference?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  note?: string;
}

