import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PoolClient } from "pg";
import { DatabaseService } from "../database/database.service";
import { ProductRow, WarehouseRow } from "../shared/types";
import { CreateSalesDto } from "./sales.dto";

@Injectable()
export class SalesService {
  constructor(private readonly db: DatabaseService) {}

  async list(limit = 100, offset = 0) {
    const result = await this.db.query(
      `SELECT so.id, so.customer_id AS "customerId", so.customer_name AS "customerName", so.status, so.total, so.note,
        so.created_at AS "createdAt", so.confirmed_at AS "confirmedAt",
        items.total_quantity AS "totalQuantity",
        items.unit_summary AS "unitSummary",
        items.unit_breakdown AS "unitBreakdown",
        items.warehouse_ids AS "warehouseIds",
        items.warehouse_names AS "warehouseNames"
      FROM sales_orders so
      LEFT JOIN (
        SELECT sales_order_id,
          SUM(unit_total) AS total_quantity,
          CASE WHEN COUNT(DISTINCT unit) = 1 THEN MAX(unit) ELSE 'mixto' END AS unit_summary,
          jsonb_object_agg(unit, unit_total) AS unit_breakdown,
          array_agg(DISTINCT warehouse_id) AS warehouse_ids,
          string_agg(DISTINCT warehouse_name, ', ') AS warehouse_names
        FROM (
          SELECT soi.sales_order_id, soi.unit, SUM(soi.quantity) AS unit_total,
            soi.warehouse_id, warehouses.name AS warehouse_name
          FROM sales_order_items soi
          JOIN warehouses ON warehouses.id = soi.warehouse_id
          GROUP BY soi.sales_order_id, soi.unit, soi.warehouse_id, warehouses.name
        ) unit_rows
        GROUP BY sales_order_id
      ) items ON items.sales_order_id = so.id
      ORDER BY id DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  async create(dto: CreateSalesDto) {
    return this.db.withTransaction(async (client) => {
      if (!dto.customerId && !dto.customerName) {
        throw new BadRequestException("Cliente requerido.");
      }
      let customerName = dto.customerName?.trim();
      if (dto.customerId) {
        const customerResult = await client.query<{ name: string }>(
          `SELECT name FROM customers WHERE id = $1`,
          [dto.customerId]
        );
        if (customerResult.rowCount === 0) {
          throw new NotFoundException("Cliente no encontrado.");
        }
        customerName = customerResult.rows[0].name;
      }
      const total = dto.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

      const orderResult = await client.query(
        `INSERT INTO sales_orders (customer_id, customer_name, status, total, note)
         VALUES ($1, $2, 'pendiente', $3, $4)
         RETURNING id, customer_id AS "customerId", customer_name AS "customerName", status, total, note,
          created_at AS "createdAt", confirmed_at AS "confirmedAt"`,
        [dto.customerId ?? null, customerName, total, dto.note ?? null]
      );
      const order = orderResult.rows[0];

      for (const item of dto.items) {
        const itemTotal = item.quantity * item.unitPrice;
        await client.query(
          `INSERT INTO sales_order_items
            (sales_order_id, product_id, warehouse_id, quantity, unit, unit_price, total)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            order.id,
            item.productId,
            item.warehouseId,
            item.quantity,
            item.unit,
            item.unitPrice,
            itemTotal,
          ]
        );
      }

      return order;
    });
  }

  async getItems(orderId: number) {
    const result = await this.db.query(
      `SELECT id, product_id AS "productId", warehouse_id AS "warehouseId",
        quantity, unit, unit_price AS "unitPrice", total
      FROM sales_order_items
      WHERE sales_order_id = $1`,
      [orderId]
    );

    return result.rows;
  }

  async confirm(orderId: number) {
    return this.db.withTransaction(async (client) => {
      const order = await this.getOrder(client, orderId);
      if (order.status !== "pendiente") {
        throw new BadRequestException("La orden ya fue confirmada.");
      }

      const items = await client.query(
        `SELECT product_id, warehouse_id, quantity, unit
         FROM sales_order_items
         WHERE sales_order_id = $1`,
        [orderId]
      );

      for (const item of items.rows) {
        await this.ensureWarehouseActive(client, item.warehouse_id);
        const product = await this.getProduct(client, item.product_id);
        const baseQuantity = this.calculateBaseQuantity(product, item.quantity, item.unit);
        const currentStock = await this.getStock(client, item.product_id, item.warehouse_id);

        if (currentStock < baseQuantity) {
          throw new BadRequestException("Stock insuficiente para confirmar la venta.");
        }

        await client.query(
          `INSERT INTO inventory_movements
            (product_id, warehouse_id, movement_type, quantity, unit, base_quantity, reference)
           VALUES ($1, $2, 'exit', $3, $4, $5, $6)`,
          [
            item.product_id,
            item.warehouse_id,
            item.quantity,
            item.unit,
            baseQuantity,
            `Venta #${orderId}`,
          ]
        );
      }

      const updated = await client.query(
        `UPDATE sales_orders
         SET status = 'confirmada', confirmed_at = NOW()
         WHERE id = $1
         RETURNING id, customer_id AS "customerId", customer_name AS "customerName", status, total, note,
          created_at AS "createdAt", confirmed_at AS "confirmedAt"`,
        [orderId]
      );

      return updated.rows[0];
    });
  }

  private async getOrder(client: PoolClient, orderId: number) {
    const result = await client.query(
      `SELECT id, status
       FROM sales_orders
       WHERE id = $1`,
      [orderId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundException("Orden de venta no encontrada.");
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

  private async getStock(client: PoolClient, productId: number, warehouseId: number) {
    const result = await client.query<{ stock: string | null }>(
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

