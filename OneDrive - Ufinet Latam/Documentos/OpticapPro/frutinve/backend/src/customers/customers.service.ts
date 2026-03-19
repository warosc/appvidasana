import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { CreateCustomerDto, UpdateCustomerDto } from "./customers.dto";

@Injectable()
export class CustomersService {
  constructor(private readonly db: DatabaseService) {}

  async list() {
    const result = await this.db.query(
      `SELECT
        id,
        name,
        contact,
        phone,
        created_at AS "createdAt"
       FROM customers
       ORDER BY id`
    );
    return result.rows;
  }

  async create(dto: CreateCustomerDto) {
    const result = await this.db.query(
      `INSERT INTO customers (name, contact, phone)
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

  async update(id: number, dto: UpdateCustomerDto) {
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
      `UPDATE customers
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
      throw new NotFoundException("Customer not found");
    }

    return result.rows[0];
  }
}
