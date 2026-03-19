import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PoolClient } from "pg";
import { DatabaseService } from "../database/database.service";
import { ProductRow, WarehouseRow } from "../shared/types";
import { CreatePurchaseDto, ReceivePurchaseDto } from "./purchases.dto";

@Injectable()
export class PurchasesService {
  constructor(private readonly db: DatabaseService) {}

  async list(limit = 100, offset = 0) {
    const result = await this.db.query(
      `SELECT po.id, po.supplier_id AS "supplierId", po.supplier_name AS "supplierName", po.status, po.total, po.note,
        po.created_at AS "createdAt", po.received_at AS "receivedAt",
        items.total_quantity AS "totalQuantity",
        items.unit_summary AS "unitSummary",
        items.unit_breakdown AS "unitBreakdown"
      FROM purchase_orders po
      LEFT JOIN (
        SELECT purchase_order_id,
          SUM(unit_total) AS total_quantity,
          CASE WHEN COUNT(DISTINCT unit) = 1 THEN MAX(unit) ELSE 'mixto' END AS unit_summary,
          jsonb_object_agg(unit, unit_total) AS unit_breakdown
        FROM (
          SELECT purchase_order_id, unit, SUM(quantity) AS unit_total
          FROM purchase_order_items
          GROUP BY purchase_order_id, unit
        ) unit_rows
        GROUP BY purchase_order_id
      ) items ON items.purchase_order_id = po.id
      ORDER BY id DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  async create(dto: CreatePurchaseDto) {
    return this.db.withTransaction(async (client) => {
      if (!dto.supplierId && !dto.supplierName) {
        throw new BadRequestException("Proveedor requerido.");
      }
      let supplierName = dto.supplierName?.trim();
      if (dto.supplierId) {
        const supplierResult = await client.query<{ name: string }>(
          `SELECT name FROM suppliers WHERE id = $1`,
          [dto.supplierId]
        );
        if (supplierResult.rowCount === 0) {
          throw new NotFoundException("Proveedor no encontrado.");
        }
        supplierName = supplierResult.rows[0].name;
      }
      const total = dto.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

      const orderResult = await client.query(
        `INSERT INTO purchase_orders (supplier_id, supplier_name, status, total, note)
         VALUES ($1, $2, 'pendiente', $3, $4)
         RETURNING id, supplier_id AS "supplierId", supplier_name AS "supplierName", status, total, note,
          created_at AS "createdAt", received_at AS "receivedAt"`,
        [dto.supplierId ?? null, supplierName, total, dto.note ?? null]
      );
      const order = orderResult.rows[0];

      for (const item of dto.items) {
        const itemTotal = item.quantity * item.unitPrice;
        await client.query(
          `INSERT INTO purchase_order_items
            (purchase_order_id, product_id, quantity, unit, unit_price, total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [order.id, item.productId, item.quantity, item.unit, item.unitPrice, itemTotal]
        );
      }

      return order;
    });
  }

  async getItems(orderId: number) {
    const result = await this.db.query(
      `SELECT id, product_id AS "productId", quantity, unit,
        unit_price AS "unitPrice", total
      FROM purchase_order_items
      WHERE purchase_order_id = $1`,
      [orderId]
    );

    return result.rows;
  }

  async receive(orderId: number, dto: ReceivePurchaseDto) {
    return this.db.withTransaction(async (client) => {
      const order = await this.getOrder(client, orderId);
      if (order.status !== "pendiente") {
        throw new BadRequestException("La orden ya fue recibida.");
      }

      await this.ensureWarehouseActive(client, dto.warehouseId);
      const items = await client.query(
        `SELECT product_id, quantity, unit
         FROM purchase_order_items
         WHERE purchase_order_id = $1`,
        [orderId]
      );

      for (const item of items.rows) {
        const product = await this.getProduct(client, item.product_id);
        const baseQuantity = this.calculateBaseQuantity(product, item.quantity, item.unit);
        await client.query(
          `INSERT INTO inventory_movements
            (product_id, warehouse_id, movement_type, quantity, unit, base_quantity, reference)
           VALUES ($1, $2, 'entry', $3, $4, $5, $6)`,
          [
            item.product_id,
            dto.warehouseId,
            item.quantity,
            item.unit,
            baseQuantity,
            `Compra #${orderId}`,
          ]
        );
      }

      const updated = await client.query(
        `UPDATE purchase_orders
         SET status = 'recibida', received_at = NOW()
         WHERE id = $1
         RETURNING id, supplier_id AS "supplierId", supplier_name AS "supplierName", status, total, note,
          created_at AS "createdAt", received_at AS "receivedAt"`,
        [orderId]
      );

      return updated.rows[0];
    });
  }

  private async getOrder(client: PoolClient, orderId: number) {
    const result = await client.query(
      `SELECT id, status
       FROM purchase_orders
       WHERE id = $1`,
      [orderId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundException("Orden de compra no encontrada.");
    }

    return result.rows[0];
  }

  private async getProduct(client: PoolClient, productId: number) {
    const result = await client.query<ProductRow>(
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

  private async ensureWarehouseActive(client: PoolClient, warehouseId: number) {
    const result = await client.query<WarehouseRow>(
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
}

