import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";

export type AuditEntry = {
  id: number;
  actor: string;
  action: string;
  entity: string;
  entityId: number | null;
  details: unknown;
  createdAt: string;
};

@Injectable()
export class AuditService {
  constructor(private readonly db: DatabaseService) {}

  async log(actor: string, action: string, entity: string, entityId?: number | null, details?: unknown) {
    await this.db.query(
      `INSERT INTO audits (actor, action, entity, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [actor || "system", action, entity, entityId ?? null, details ?? null]
    );
  }

  async list(filters: { actor?: string; entity?: string; from?: string; to?: string }) {
    const clauses: string[] = [];
    const values: unknown[] = [];
    let index = 1;

    if (filters.actor) {
      clauses.push(`actor ILIKE $${index++}`);
      values.push(`%${filters.actor}%`);
    }
    if (filters.entity) {
      clauses.push(`entity = $${index++}`);
      values.push(filters.entity);
    }
    if (filters.from) {
      clauses.push(`created_at >= $${index++}`);
      values.push(filters.from);
    }
    if (filters.to) {
      clauses.push(`created_at <= $${index++}`);
      values.push(`${filters.to} 23:59:59`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const result = await this.db.query<AuditEntry>(
      `SELECT
        id,
        actor,
        action,
        entity,
        entity_id AS "entityId",
        details,
        created_at AS "createdAt"
       FROM audits
       ${where}
       ORDER BY created_at DESC`,
      values
    );
    return result.rows;
  }
}
