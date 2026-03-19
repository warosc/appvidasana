import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { ReportType } from "../shared/types";

@Injectable()
export class ReportsService {
  constructor(private readonly db: DatabaseService) {}

  async getReportData(
    type: ReportType | string,
    filters: {
      productId?: number;
      warehouseId?: number;
      type?: string;
      reason?: string;
      status?: string;
      supplierId?: number;
      customerId?: number;
      from?: string;
      to?: string;
    }
  ) {
    switch (type) {
      case "inventory":
        return this.inventory({
          productId: filters.productId,
          warehouseId: filters.warehouseId,
        });
      case "movements":
        return this.movements({
          productId: filters.productId,
          warehouseId: filters.warehouseId,
          type: filters.type,
          from: filters.from,
          to: filters.to,
        });
      case "waste":
        return this.waste({
          productId: filters.productId,
          warehouseId: filters.warehouseId,
          reason: filters.reason,
          from: filters.from,
          to: filters.to,
        });
      case "purchases":
        return this.purchases({
          status: filters.status,
          supplierId: filters.supplierId,
          from: filters.from,
          to: filters.to,
        });
      case "sales":
        return this.sales({
          status: filters.status,
          customerId: filters.customerId,
          from: filters.from,
          to: filters.to,
        });
      default:
        return [];
    }
  }

  async inventory(filters: { productId?: number; warehouseId?: number }) {
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

  async movements(filters: {
    productId?: number;
    warehouseId?: number;
    type?: string;
    from?: string;
    to?: string;
  }) {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (filters.productId) {
      conditions.push(`inventory_movements.product_id = $${index++}`);
      values.push(filters.productId);
    }
    if (filters.warehouseId) {
      conditions.push(`inventory_movements.warehouse_id = $${index++}`);
      values.push(filters.warehouseId);
    }
    if (filters.type) {
      conditions.push(`inventory_movements.movement_type = $${index++}`);
      values.push(filters.type);
    }
    if (filters.from) {
      conditions.push(`inventory_movements.created_at >= $${index++}`);
      values.push(filters.from);
    }
    if (filters.to) {
      conditions.push(`inventory_movements.created_at <= $${index++}`);
      values.push(filters.to);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await this.db.query(
      `SELECT
        inventory_movements.id,
        inventory_movements.product_id AS "productId",
        inventory_movements.warehouse_id AS "warehouseId",
        inventory_movements.movement_type AS "movementType",
        inventory_movements.quantity,
        inventory_movements.unit,
        inventory_movements.base_quantity AS "baseQuantity",
        inventory_movements.reference,
        inventory_movements.note,
        inventory_movements.created_at AS "createdAt",
        products.code AS "productCode",
        products.name AS "productName",
        warehouses.code AS "warehouseCode",
        warehouses.name AS "warehouseName"
      FROM inventory_movements
      JOIN products ON products.id = inventory_movements.product_id
      JOIN warehouses ON warehouses.id = inventory_movements.warehouse_id
      ${where}
      ORDER BY inventory_movements.id DESC`,
      values
    );

    return result.rows;
  }

  async waste(filters: {
    productId?: number;
    warehouseId?: number;
    reason?: string;
    from?: string;
    to?: string;
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
    if (filters.from) {
      conditions.push(`waste.created_at >= $${index++}`);
      values.push(filters.from);
    }
    if (filters.to) {
      conditions.push(`waste.created_at <= $${index++}`);
      values.push(filters.to);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
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
      ORDER BY waste.id DESC`,
      values
    );

    return result.rows;
  }

  async purchases(filters: { status?: string; supplierId?: number; from?: string; to?: string }) {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (filters.status) {
      conditions.push(`purchase_orders.status = $${index++}`);
      values.push(filters.status);
    }
    if (filters.supplierId) {
      conditions.push(`purchase_orders.supplier_id = $${index++}`);
      values.push(filters.supplierId);
    }
    if (filters.from) {
      conditions.push(`purchase_orders.created_at >= $${index++}`);
      values.push(filters.from);
    }
    if (filters.to) {
      conditions.push(`purchase_orders.created_at <= $${index++}`);
      values.push(filters.to);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await this.db.query(
      `SELECT
        purchase_orders.id,
        purchase_orders.supplier_id AS "supplierId",
        purchase_orders.supplier_name AS "supplierName",
        purchase_orders.status,
        purchase_orders.total,
        purchase_orders.note,
        purchase_orders.created_at AS "createdAt",
        purchase_orders.received_at AS "receivedAt"
      FROM purchase_orders
      ${where}
      ORDER BY purchase_orders.id DESC`,
      values
    );

    return result.rows;
  }

  async sales(filters: { status?: string; customerId?: number; from?: string; to?: string }) {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (filters.status) {
      conditions.push(`sales_orders.status = $${index++}`);
      values.push(filters.status);
    }
    if (filters.customerId) {
      conditions.push(`sales_orders.customer_id = $${index++}`);
      values.push(filters.customerId);
    }
    if (filters.from) {
      conditions.push(`sales_orders.created_at >= $${index++}`);
      values.push(filters.from);
    }
    if (filters.to) {
      conditions.push(`sales_orders.created_at <= $${index++}`);
      values.push(filters.to);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await this.db.query(
      `SELECT
        sales_orders.id,
        sales_orders.customer_id AS "customerId",
        sales_orders.customer_name AS "customerName",
        sales_orders.status,
        sales_orders.total,
        sales_orders.note,
        sales_orders.created_at AS "createdAt",
        sales_orders.confirmed_at AS "confirmedAt"
      FROM sales_orders
      ${where}
      ORDER BY sales_orders.id DESC`,
      values
    );

    return result.rows;
  }
}

