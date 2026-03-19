import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { CreateWarehouseDto, UpdateWarehouseDto } from "./warehouses.dto";

@Injectable()
export class WarehousesService {
  constructor(private readonly db: DatabaseService) {}

  async list(limit = 200, offset = 0) {
    const result = await this.db.query(
      `SELECT id, code, name, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"
       FROM warehouses
       ORDER BY id
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  }

  async create(dto: CreateWarehouseDto) {
    const isActive = dto.isActive ?? true;
    const result = await this.db.query<{ id: number; [k: string]: unknown }>(
      `INSERT INTO warehouses (code, name, is_active)
       VALUES ($1, $2, $3)
       RETURNING id, code, name, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"`,
      [dto.code, dto.name, isActive]
    );

    return result.rows[0];
  }

  async update(id: number, dto: UpdateWarehouseDto) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (dto.code !== undefined) {
      fields.push(`code = $${index++}`);
      values.push(dto.code);
    }
    if (dto.name !== undefined) {
      fields.push(`name = $${index++}`);
      values.push(dto.name);
    }
    if (dto.isActive !== undefined) {
      fields.push(`is_active = $${index++}`);
      values.push(dto.isActive);
    }

    if (fields.length === 0) {
      throw new BadRequestException("No fields to update");
    }

    values.push(id);
    const result = await this.db.query(
      `UPDATE warehouses
       SET ${fields.join(", ")}, updated_at = NOW()
       WHERE id = $${index}
       RETURNING id, code, name, is_active AS "isActive", created_at AS "createdAt", updated_at AS "updatedAt"`,
      values
    );

    if (result.rowCount === 0) {
      throw new NotFoundException("Warehouse not found");
    }

    return result.rows[0];
  }
}

