import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { CreateSupplierDto, UpdateSupplierDto } from "./suppliers.dto";

@Injectable()
export class SuppliersService {
  constructor(private readonly db: DatabaseService) {}

  async list() {
    const result = await this.db.query(
      `SELECT
        id,
        name,
        contact,
        phone,
        created_at AS "createdAt"
       FROM suppliers
       ORDER BY id`
    );
    return result.rows;
  }

  async create(dto: CreateSupplierDto) {
    const result = await this.db.query(
      `INSERT INTO suppliers (name, contact, phone)
       VALUES ($1, $2, $3)
       RETURNING
        id,
        name,
        contact,
        phone,
        created_at AS "createdAt"`,
      [dto.name, dto.contact ?? null, dto.phone ?? null]
    );
    return result.rows[0];
  }

  async update(id: number, dto: UpdateSupplierDto) {
    const fields: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (dto.name !== undefined) {
      fields.push(`name = $${index++}`);
      values.push(dto.name);
    }
    if (dto.contact !== undefined) {
      fields.push(`contact = $${index++}`);
      values.push(dto.contact);
    }
    if (dto.phone !== undefined) {
      fields.push(`phone = $${index++}`);
      values.push(dto.phone);
    }

    if (fields.length === 0) {
      throw new BadRequestException("No fields to update");
    }

    values.push(id);
    const result = await this.db.query(
      `UPDATE suppliers
       SET ${fields.join(", ")}
       WHERE id = $${index}
       RETURNING
        id,
        name,
        contact,
        phone,
        created_at AS "createdAt"`,
      values
    );

    if (result.rowCount === 0) {
      throw new NotFoundException("Supplier not found");
    }

    return result.rows[0];
  }
}
