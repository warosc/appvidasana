import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

@Injectable()
export class AlarmsService {
  constructor(private readonly db: DatabaseService) {}

  async list(wasteThreshold = 50) {
    const [lowStock, emptyWarehouses, wasteExcessive] = await Promise.all([
      this.getLowStock(),
      this.getEmptyWarehouses(),
      this.getWasteExcessive(wasteThreshold),
    ]);

    return {
      lowStock,
      emptyWarehouses,
      wasteExcessive,
    };
  }

  private async getLowStock() {
    // Filtramos solo bodegas y productos activos para evitar el crecimiento
    // cuadrático del CROSS JOIN con registros inactivos.
    const result = await this.db.query(
      `SELECT
        warehouses.id AS "warehouseId",
        warehouses.code AS "warehouseCode",
        warehouses.name AS "warehouseName",
        products.id AS "productId",
        products.code AS "productCode",
        products.name AS "productName",
        products.base_unit AS "baseUnit",
        products.min_stock AS "minStock",
        COALESCE(inventory_stock.stock, 0) AS "stock"
      FROM warehouses
      CROSS JOIN products
      LEFT JOIN inventory_stock
        ON inventory_stock.warehouse_id = warehouses.id
        AND inventory_stock.product_id = products.id
      WHERE warehouses.is_active = TRUE
        AND products.is_active = TRUE
        AND products.min_stock > 0
        AND COALESCE(inventory_stock.stock, 0) < products.min_stock
      ORDER BY warehouses.id, products.id`
    );

    return result.rows;
  }

  private async getEmptyWarehouses() {
    // Solo bodegas activas sin stock
    const result = await this.db.query(
      `SELECT
        warehouses.id AS "warehouseId",
        warehouses.code AS "warehouseCode",
        warehouses.name AS "warehouseName",
        COALESCE(SUM(inventory_stock.stock), 0) AS "totalStock"
      FROM warehouses
      LEFT JOIN inventory_stock
        ON inventory_stock.warehouse_id = warehouses.id
      WHERE warehouses.is_active = TRUE
      GROUP BY warehouses.id
      HAVING COALESCE(SUM(inventory_stock.stock), 0) <= 0
      ORDER BY warehouses.id`
    );

    return result.rows;
  }

  private async getWasteExcessive(threshold: number) {
    const result = await this.db.query(
      `SELECT
        products.id AS "productId",
        products.code AS "productCode",
        products.name AS "productName",
        SUM(waste.base_quantity) AS "totalWaste"
      FROM waste
      JOIN products ON products.id = waste.product_id
      WHERE waste.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY products.id
      HAVING SUM(waste.base_quantity) >= $1
      ORDER BY SUM(waste.base_quantity) DESC`,
      [threshold]
    );

    return result.rows;
  }
}
