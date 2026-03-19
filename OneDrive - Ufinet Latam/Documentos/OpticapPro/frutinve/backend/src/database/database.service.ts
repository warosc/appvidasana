import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { Pool, PoolClient } from "pg";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool: Pool;

  async onModuleInit() {
    const databaseUrl =
      process.env.DATABASE_URL ??
      "postgres://freshflow:freshflow@db:5432/freshflow";

    this.pool = new Pool({ connectionString: databaseUrl });
    await this.ensureSchema();
    await this.seedAuth();
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  query<T = unknown>(text: string, params: unknown[] = []) {
    return this.pool.query<T>(text, params);
  }

  async withTransaction<T>(handler: (client: PoolClient) => Promise<T>) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await handler(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async ensureSchema() {
    const sql = `
      CREATE SEQUENCE IF NOT EXISTS products_code_seq START 1;

      CREATE TABLE IF NOT EXISTS warehouses (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        code VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(120) NOT NULL,
        type VARCHAR(10) NOT NULL CHECK (type IN ('fruta', 'verdura')),
        base_unit VARCHAR(10) NOT NULL CHECK (base_unit IN ('kg', 'caja', 'pieza')),
        conversion_to_kg NUMERIC(12, 4),
        expires BOOLEAN NOT NULL DEFAULT FALSE,
        min_stock NUMERIC(12, 4) NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS inventory_movements (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id),
        warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
        movement_type VARCHAR(20) NOT NULL CHECK (
          movement_type IN ('entry', 'exit', 'transfer_in', 'transfer_out')
        ),
        quantity NUMERIC(12, 4) NOT NULL,
        unit VARCHAR(10) NOT NULL CHECK (unit IN ('kg', 'caja', 'pieza')),
        base_quantity NUMERIC(12, 4) NOT NULL,
        transfer_ref VARCHAR(40),
        reference VARCHAR(120),
        note TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE OR REPLACE VIEW inventory_stock AS
      SELECT
        product_id,
        warehouse_id,
        SUM(
          CASE
            WHEN movement_type IN ('entry', 'transfer_in') THEN base_quantity
            ELSE -base_quantity
          END
        ) AS stock
      FROM inventory_movements
      GROUP BY product_id, warehouse_id;

      CREATE TABLE IF NOT EXISTS waste (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id),
        warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
        quantity NUMERIC(12, 4) NOT NULL,
        unit VARCHAR(10) NOT NULL CHECK (unit IN ('kg', 'caja', 'pieza')),
        base_quantity NUMERIC(12, 4) NOT NULL,
        reason VARCHAR(20) NOT NULL CHECK (
          reason IN ('caducado', 'danado', 'pudricion', 'error_manejo')
        ),
        responsible VARCHAR(120) NOT NULL,
        reference VARCHAR(120),
        note TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        contact VARCHAR(120),
        phone VARCHAR(40),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL,
        contact VARCHAR(120),
        phone VARCHAR(40),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS purchase_orders (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER REFERENCES suppliers(id),
        supplier_name VARCHAR(120) NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('pendiente', 'recibida')),
        total NUMERIC(12, 4) NOT NULL DEFAULT 0,
        note TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        received_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id SERIAL PRIMARY KEY,
        purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity NUMERIC(12, 4) NOT NULL,
        unit VARCHAR(10) NOT NULL CHECK (unit IN ('kg', 'caja', 'pieza')),
        unit_price NUMERIC(12, 4) NOT NULL,
        total NUMERIC(12, 4) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sales_orders (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        customer_name VARCHAR(120) NOT NULL,
        status VARCHAR(20) NOT NULL CHECK (status IN ('pendiente', 'confirmada')),
        total NUMERIC(12, 4) NOT NULL DEFAULT 0,
        note TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        confirmed_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sales_order_items (
        id SERIAL PRIMARY KEY,
        sales_order_id INTEGER NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id),
        warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
        quantity NUMERIC(12, 4) NOT NULL,
        unit VARCHAR(10) NOT NULL CHECK (unit IN ('kg', 'caja', 'pieza')),
        unit_price NUMERIC(12, 4) NOT NULL,
        total NUMERIC(12, 4) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(30) UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(60) UNIQUE NOT NULL,
        name VARCHAR(120) NOT NULL,
        role_id INTEGER NOT NULL REFERENCES roles(id),
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audits (
        id SERIAL PRIMARY KEY,
        actor VARCHAR(60) NOT NULL,
        action VARCHAR(60) NOT NULL,
        entity VARCHAR(60) NOT NULL,
        entity_id INTEGER,
        details JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS password_requests (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        requested_username VARCHAR(60) NOT NULL,
        note TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'resuelta', 'rechazada')),
        requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMP,
        resolved_by VARCHAR(60)
      );

      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
    `;

    await this.pool.query(sql);
  }

  private async seedAuth() {
    const roleNames = ["admin", "bodeguero", "ventas", "compras", "auditor"];
    for (const name of roleNames) {
      await this.pool.query(
        `INSERT INTO roles (name)
         VALUES ($1)
         ON CONFLICT (name) DO NOTHING`,
        [name]
      );
    }

    const adminResult = await this.pool.query(
      `SELECT users.id
       FROM users
       JOIN roles ON roles.id = users.role_id
       WHERE roles.name = 'admin'
       LIMIT 1`
    );

    if (adminResult.rowCount === 0) {
      const password = process.env.ADMIN_PASSWORD || "R00tp4ss123!";
      const hash = await bcrypt.hash(password, 10);
      const roleIdResult = await this.pool.query(
        `SELECT id FROM roles WHERE name = 'admin' LIMIT 1`
      );
      const roleId = roleIdResult.rows[0]?.id;
      if (roleId) {
        await this.pool.query(
          `INSERT INTO users (username, name, role_id, password_hash)
           VALUES ('admin', 'Administrador', $1, $2)`,
          [roleId, hash]
        );
      }
    }
  }
}

