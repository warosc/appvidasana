import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

export class PurchaseItemDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  productId: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsString()
  @IsIn(["kg", "caja", "pieza"])
  unit: "kg" | "caja" | "pieza";

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreatePurchaseDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  supplierId?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  supplierName?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  note?: string;

  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  @ArrayMinSize(1)
  items: PurchaseItemDto[];
}

export class ReceivePurchaseDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  warehouseId: number;
}

