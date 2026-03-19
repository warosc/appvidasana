import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { ProductRow, WarehouseRow } from "../shared/types";
import { CreateWasteDto } from "./waste.dto";

@Injectable()
export class WasteService {
  constructor(private readonly db: DatabaseService) {}

  async list(filters: {
    productId?: number;
    warehouseId?: number;
    reason?: string;
    limit?: number;
    offset?: number;
  }) {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (filters.productId) {
      conditions.push(`waste.product_id = $${index++}`);
      values.push(filters.productId);
    }
    if (filters.warehouseId) {
      conditions.push(`waste.warehouse_id = $${index++}`);
      values.push(filters.warehouseId);
    }
    if (filters.reason) {
      conditions.push(`waste.reason = $${index++}`);
      values.push(filters.reason);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = filters.limit ?? 200;
    const offset = filters.offset ?? 0;
    values.push(limit, offset);

    const result = await this.db.query(
      `SELECT
        waste.id,
        waste.product_id AS "productId",
        waste.warehouse_id AS "warehouseId",
        waste.quantity,
        waste.unit,
        waste.base_quantity AS "baseQuantity",
        waste.reason,
        waste.responsible,
        waste.reference,
        waste.note,
        waste.created_at AS "createdAt",
        products.code AS "productCode",
        products.name AS "productName",
        warehouses.code AS "warehouseCode",
        warehouses.name AS "warehouseName"
      FROM waste
      JOIN products ON products.id = waste.product_id
      JOIN warehouses ON warehouses.id = waste.warehouse_id
      ${where}
      ORDER BY waste.id DESC
      LIMIT $${index} OFFSET $${index + 1}`,
      values
    );

    return result.rows;
  }

  async create(dto: CreateWasteDto) {
    const product = await this.getProduct(dto.productId);
    await this.ensureWarehouseActive(dto.warehouseId);

    const baseQuantity = this.calculateBaseQuantity(product, dto.quantity, dto.unit);
    const currentStock = await this.getStock(dto.productId, dto.warehouseId);

    if (currentStock < baseQuantity) {
      throw new BadRequestException("Stock insuficiente para registrar la merma.");
    }

    const result = await this.db.query<{ id: number; [k: string]: unknown }>(
      `INSERT INTO waste (
        product_id,
        warehouse_id,
        quantity,
        unit,
        base_quantity,
        reason,
        responsible,
        reference,
        note
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        id,
        product_id AS "productId",
        warehouse_id AS "warehouseId",
        quantity,
        unit,
        base_quantity AS "baseQuantity",
        reason,
        responsible,
        reference,
        note,
        created_at AS "createdAt"`,
      [
        dto.productId,
        dto.warehouseId,
        dto.quantity,
        dto.unit,
        baseQuantity,
        dto.reason,
        dto.responsible,
        dto.reference ?? null,
        dto.note ?? null,
      ]
    );

    await this.db.query(
      `INSERT INTO inventory_movements (
        product_id,
        warehouse_id,
        movement_type,
        quantity,
        unit,
        base_quantity,
        reference,
        note
      ) VALUES ($1, $2, 'exit', $3, $4, $5, $6, $7)`,
      [
        dto.productId,
        dto.warehouseId,
        dto.quantity,
        dto.unit,
        baseQuantity,
        dto.reference ?? "Merma",
        dto.note ?? null,
      ]
    );

    return result.rows[0];
  }

  private async getProduct(productId: number) {
    const result = await this.db.query<ProductRow>(
      `SELECT id, base_unit, conversion_to_kg
       FROM products
       WHERE id = $1`,
      [productId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundException("Producto no encontrado.");
    }

    return result.rows[0];
  }

  private async ensureWarehouseActive(warehouseId: number) {
    const result = await this.db.query<WarehouseRow>(
      `SELECT id, is_active
       FROM warehouses
       WHERE id = $1`,
      [warehouseId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundException("Bodega no encontrada.");
    }

    if (!result.rows[0].is_active) {
      throw new BadRequestException("La bodega no esta activa.");
    }
  }

  private calculateBaseQuantity(
    product: ProductRow,
    quantity: number,
    unit: "kg" | "caja" | "pieza"
  ) {
    if (unit === product.base_unit) {
      return quantity;
    }

    if (product.base_unit === "kg" && unit === "caja") {
      const conversion = product.conversion_to_kg ? Number(product.conversion_to_kg) : 0;
      if (conversion <= 0) {
        throw new BadRequestException("Producto sin conversion a kg.");
      }
      return quantity * conversion;
    }

    throw new BadRequestException("Unidad incompatible con la unidad base del producto.");
  }

  private async getStock(productId: number, warehouseId: number) {
    const result = await this.db.query<{ stock: string | null }>(
      `SELECT stock
       FROM inventory_stock
       WHERE product_id = $1 AND warehouse_id = $2`,
      [productId, warehouseId]
    );

    if (result.rowCount === 0 || result.rows[0].stock === null) {
      return 0;
    }

    return Number(result.rows[0].stock);
  }
}

