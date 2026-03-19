import { BadRequestException, Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { DatabaseService } from "../database/database.service";
import { normalizeUsername } from "../shared/normalize";
import { CreateUserDto } from "./users.dto";

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async list() {
    const result = await this.db.query(
      `SELECT users.id, users.username, users.name,
        roles.name AS role, users.is_active AS "isActive",
        users.created_at AS "createdAt"
      FROM users
      JOIN roles ON roles.id = users.role_id
      ORDER BY users.id`
    );
    return result.rows;
  }

  async create(dto: CreateUserDto) {
    const normalizedUsername = normalizeUsername(dto.username);
    if (!normalizedUsername) {
      throw new BadRequestException("Username invalido.");
    }
    const roleResult = await this.db.query<{ id: number }>(
      `SELECT id FROM roles WHERE name = $1 LIMIT 1`,
      [dto.role]
    );
    if (roleResult.rowCount === 0) {
      throw new BadRequestException("Rol invalido.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const isActive = dto.isActive ?? true;

    const result = await this.db.query<{
      id: number;
      username: string;
      name: string;
      isActive: boolean;
      createdAt: string;
    }>(
      `INSERT INTO users (username, name, role_id, password_hash, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, name, is_active AS "isActive", created_at AS "createdAt"`,
      [normalizedUsername, dto.name, roleResult.rows[0].id, passwordHash, isActive]
    );

    return { ...result.rows[0], role: dto.role };
  }

  async listPasswordRequests() {
    const result = await this.db.query(
      `SELECT
        pr.id,
        pr.requested_username AS "requestedUsername",
        pr.note,
        pr.status,
        pr.requested_at AS "requestedAt",
        pr.resolved_at AS "resolvedAt",
        pr.resolved_by AS "resolvedBy",
        pr.user_id AS "userId",
        users.name AS "userName"
      FROM password_requests pr
      LEFT JOIN users ON users.id = pr.user_id
      ORDER BY pr.requested_at DESC`
    );
    return result.rows;
  }

  async resetPasswordFromRequest(requestId: number, newPassword: string, actor: string) {
    return this.db.withTransaction(async (client) => {
      const requestResult = await client.query<{
        id: number;
        user_id: number | null;
        status: string;
        requested_username: string;
      }>(
        `SELECT id, user_id, status, requested_username
         FROM password_requests
         WHERE id = $1
         LIMIT 1`,
        [requestId]
      );
      if (requestResult.rowCount === 0) {
        throw new BadRequestException("Solicitud no encontrada.");
      }
      const request = requestResult.rows[0];
      if (request.status !== "pendiente") {
        throw new BadRequestException("La solicitud ya fue atendida.");
      }
      let userId = request.user_id;
      if (!userId) {
        const userResult = await client.query<{ id: number }>(
          `SELECT id
           FROM users
           WHERE REPLACE(LOWER(username), ' ', '') = $1
           LIMIT 1`,
          [normalizeUsername(request.requested_username)]
        );
        if (userResult.rowCount === 0) {
          throw new BadRequestException("No se encontro el usuario solicitado.");
        }
        userId = userResult.rows[0].id;
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await client.query(
        `UPDATE users
         SET password_hash = $1
         WHERE id = $2`,
        [passwordHash, userId]
      );

      await client.query(
        `UPDATE password_requests
         SET status = 'resuelta', resolved_at = NOW(), resolved_by = $1, user_id = $2
         WHERE id = $3`,
        [actor || "admin", userId, requestId]
      );

      return { ok: true };
    });
  }
}

