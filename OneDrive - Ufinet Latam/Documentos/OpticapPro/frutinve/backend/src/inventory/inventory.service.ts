import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PoolClient } from "pg";
import { DatabaseService } from "../database/database.service";
import { ProductRow, WarehouseRow } from "../shared/types";
import { InventoryMovementDto, InventoryTransferDto } from "./inventory.dto";

// Interfaz común para db.query y client.query dentro de transacciones
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryExecutor = { query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number | null }> };

@Injectable()
export class InventoryService {
  constructor(private readonly db: DatabaseService) {}

  async listMovements(filters: {
    productId?: number;
    warehouseId?: number;
    movementType?: string;
    limit?: number;
    offset?: number;
  }) {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (filters.productId) {
      conditions.push(`product_id = $${index++}`);
      values.push(filters.productId);
    }
    if (filters.warehouseId) {
      conditions.push(`warehouse_id = $${index++}`);
      values.push(filters.warehouseId);
    }
    if (filters.movementType) {
      conditions.push(`movement_type = $${index++}`);
      values.push(filters.movementType);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = filters.limit ?? 200;
    const offset = filters.offset ?? 0;
    values.push(limit, offset);

    const result = await this.db.query(
      `SELECT
        id,
        product_id AS "productId",
        warehouse_id AS "warehouseId",
        movement_type AS "movementType",
        quantity,
        unit,
        base_quantity AS "baseQuantity",
        transfer_ref AS "transferRef",
        reference,
        note,
        created_at AS "createdAt"
      FROM inventory_movements
      ${where}
      ORDER BY id DESC
      LIMIT $${index} OFFSET $${index + 1}`,
      values
    );

    return result.rows;
  }

  async listStock(filters: { productId?: number; warehouseId?: number }) {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (filters.productId) {
      conditions.push(`inventory_stock.product_id = $${index++}`);
      values.push(filters.productId);
    }
    if (filters.warehouseId) {
      conditions.push(`inventory_stock.warehouse_id = $${index++}`);
      values.push(filters.warehouseId);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await this.db.query(
      `SELECT
        inventory_stock.product_id AS "productId",
        inventory_stock.warehouse_id AS "warehouseId",
        inventory_stock.stock,
        products.code AS "productCode",
        products.name AS "productName",
        products.base_unit AS "baseUnit",
        warehouses.code AS "warehouseCode",
        warehouses.name AS "warehouseName"
      FROM inventory_stock
      JOIN products ON products.id = inventory_stock.product_id
      JOIN warehouses ON warehouses.id = inventory_stock.warehouse_id
      ${where}
      ORDER BY warehouses.id, products.id`,
      values
    );

    return result.rows;
  }

  async createEntry(dto: InventoryMovementDto) {
    const product = await this.getProduct(this.db, dto.productId);
    await this.ensureWarehouseActive(this.db, dto.warehouseId);
    const baseQuantity = this.calculateBaseQuantity(product, dto.quantity, dto.unit);

    return this.insertMovement(this.db, {
      productId: dto.productId,
      warehouseId: dto.warehouseId,
      movementType: "entry",
      quantity: dto.quantity,
      unit: dto.unit,
      baseQuantity,
      reference: dto.reference ?? null,
      note: dto.note ?? null,
    });
  }

  async createExit(dto: InventoryMovementDto) {
    const product = await this.getProduct(this.db, dto.productId);
    await this.ensureWarehouseActive(this.db, dto.warehouseId);
    const baseQuantity = this.calculateBaseQuantity(product, dto.quantity, dto.unit);
    const currentStock = await this.getStock(this.db, dto.productId, dto.warehouseId);

    if (currentStock < baseQuantity) {
      throw new BadRequestException("Stock insuficiente para la salida.");
    }

    return this.insertMovement(this.db, {
      productId: dto.productId,
      warehouseId: dto.warehouseId,
      movementType: "exit",
      quantity: dto.quantity,
      unit: dto.unit,
      baseQuantity,
      reference: dto.reference ?? null,
      note: dto.note ?? null,
    });
  }

  async createTransfer(dto: InventoryTransferDto) {
    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException("Las bodegas de origen y destino deben ser distintas.");
    }

    return this.db.withTransaction(async (client) => {
      const product = await this.getProduct(client, dto.productId);
      await this.ensureWarehouseActive(client, dto.fromWarehouseId);
      await this.ensureWarehouseActive(client, dto.toWarehouseId);

      const baseQuantity = this.calculateBaseQuantity(product, dto.quantity, dto.unit);
      const currentStock = await this.getStock(client, dto.productId, dto.fromWarehouseId);

      if (currentStock < baseQuantity) {
        throw new BadRequestException("Stock insuficiente para la transferencia.");
      }

      const transferRef = randomUUID();

      const outMovement = await this.insertMovement(client, {
        productId: dto.productId,
        warehouseId: dto.fromWarehouseId,
        movementType: "transfer_out",
        quantity: dto.quantity,
        unit: dto.unit,
        baseQuantity,
        transferRef,
        reference: dto.reference ?? null,
        note: dto.note ?? null,
      });

      const inMovement = await this.insertMovement(client, {
        productId: dto.productId,
        warehouseId: dto.toWarehouseId,
        movementType: "transfer_in",
        quantity: dto.quantity,
        unit: dto.unit,
        baseQuantity,
        transferRef,
        reference: dto.reference ?? null,
        note: dto.note ?? null,
      });

      return { transferRef, outMovement, inMovement };
    });
  }

  private async getProduct(executor: QueryExecutor, productId: number) {
    const result = await executor.query<ProductRow>(
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

  private async ensureWarehouseActive(executor: QueryExecutor, warehouseId: number) {
    const result = await executor.query<WarehouseRow>(
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

    const conversion = product.conversion_to_kg ? Number(product.conversion_to_kg) : 0;
    if (conversion <= 0) {
      throw new BadRequestException(
        "Producto sin conversion a kg. Configura la conversion en productos."
      );
    }

    if (product.base_unit === "kg" && (unit === "caja" || unit === "pieza")) {
      return quantity * conversion;
    }

    if ((product.base_unit === "caja" || product.base_unit === "pieza") && unit === "kg") {
      return quantity / conversion;
    }

    throw new BadRequestException("Unidad incompatible con la unidad base del producto.");
  }

  private async getStock(
    executor: QueryExecutor,
    productId: number,
    warehouseId: number
  ) {
    const result = await executor.query<{ stock: string | null }>(
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

  private async insertMovement(
    executor: QueryExecutor,
    data: {
      productId: number;
      warehouseId: number;
      movementType: "entry" | "exit" | "transfer_in" | "transfer_out";
      quantity: number;
      unit: "kg" | "caja" | "pieza";
      baseQuantity: number;
      transferRef?: string;
      reference?: string | null;
      note?: string | null;
    }
  ) {
    const result = await executor.query(
      `INSERT INTO inventory_movements (
        product_id,
        warehouse_id,
        movement_type,
        quantity,
        unit,
        base_quantity,
        transfer_ref,
        reference,
        note
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING
        id,
        product_id AS "productId",
        warehouse_id AS "warehouseId",
        movement_type AS "movementType",
        quantity,
        unit,
        base_quantity AS "baseQuantity",
        transfer_ref AS "transferRef",
        reference,
        note,
        created_at AS "createdAt"`,
      [
        data.productId,
        data.warehouseId,
        data.movementType,
        data.quantity,
        data.unit,
        data.baseQuantity,
        data.transferRef ?? null,
        data.reference ?? null,
        data.note ?? null,
      ]
    );

    return result.rows[0];
  }
}

