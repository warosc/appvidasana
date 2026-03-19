import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { CreateProductDto, UpdateProductDto } from "./products.dto";

@Injectable()
export class ProductsService {
  constructor(private readonly db: DatabaseService) {}

  async list(limit = 200, offset = 0) {
    const result = await this.db.query(
      `SELECT
        id,
        code,
        name,
        type,
        base_unit AS "baseUnit",
        conversion_to_kg AS "conversionToKg",
        expires,
        is_active AS "isActive",
        min_stock AS "minStock",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM products
      ORDER BY id
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows;
  }

  async create(dto: CreateProductDto) {
    const seqResult = await this.db.query<{ seq: number }>(
      "SELECT nextval('products_code_seq') AS seq"
    );
    const seq = Number(seqResult.rows[0].seq);
    const code = `FRU-${seq.toString().padStart(4, "0")}`;

    const result = await this.db.query<{ id: number; [k: string]: unknown }>(
      `INSERT INTO products (
        code, name, type, base_unit, conversion_to_kg, expires, min_stock, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        id,
        code,
        name,
        type,
        base_unit AS "baseUnit",
        conversion_to_kg AS "conversionToKg",
        expires,
        is_active AS "isActive",
        min_stock AS "minStock",
        created_at AS "createdAt",
        updated_at AS "updatedAt"`,
      [
        code,
        dto.name,
        dto.type,
        dto.baseUnit,
        dto.conversionToKg ?? null,
        dto.expires ?? false,
        dto.minStock ?? 0,
        dto.isActive ?? true,
      ]
    );

    return result.rows[0];
  }

  async update(id: number, dto: UpdateProductDto) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (dto.name !== undefined) {
      fields.push(`name = $${index++}`);
      values.push(dto.name);
    }
    if (dto.type !== undefined) {
      fields.push(`type = $${index++}`);
      values.push(dto.type);
    }
    if (dto.baseUnit !== undefined) {
      fields.push(`base_unit = $${index++}`);
      values.push(dto.baseUnit);
    }
    if (dto.conversionToKg !== undefined) {
      fields.push(`conversion_to_kg = $${index++}`);
      values.push(dto.conversionToKg);
    }
    if (dto.expires !== undefined) {
      fields.push(`expires = $${index++}`);
      values.push(dto.expires);
    }
    if (dto.isActive !== undefined) {
      fields.push(`is_active = $${index++}`);
      values.push(dto.isActive);
    }
    if (dto.minStock !== undefined) {
      fields.push(`min_stock = $${index++}`);
      values.push(dto.minStock);
    }

    if (fields.length === 0) {
      throw new BadRequestException("No fields to update");
    }

    values.push(id);
    const result = await this.db.query(
      `UPDATE products
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = $${index}
       RETURNING
        id,
        code,
        name,
        type,
        base_unit AS "baseUnit",
        conversion_to_kg AS "conversionToKg",
        expires,
       is_active AS "isActive",
        min_stock AS "minStock",
        created_at AS "createdAt",
        updated_at AS "updatedAt"`,
      values
    );

    if (result.rowCount === 0) {
      throw new NotFoundException("Product not found");
    }

    return result.rows[0];
  }
}

