import { Injectable, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { DatabaseService } from "../database/database.service";
import { normalizeUsername } from "../shared/normalize";
import { LoginDto, PasswordRequestDto } from "./auth.dto";

@Injectable()
export class AuthService {
  constructor(private readonly db: DatabaseService) {}

  async login(dto: LoginDto) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new InternalServerErrorException("JWT_SECRET no configurado en el servidor.");
    }

    const normalized = normalizeUsername(dto.username);
    const result = await this.db.query<{
      id: number;
      username: string;
      name: string;
      password_hash: string;
      role: string;
      is_active: boolean;
    }>(
      `SELECT users.id, users.username, users.name, users.password_hash, users.is_active,
        roles.name AS role
      FROM users
      JOIN roles ON roles.id = users.role_id
      WHERE REPLACE(LOWER(users.username), ' ', '') = $1`,
      [normalized]
    );

    if (result.rowCount === 0) {
      throw new UnauthorizedException("Credenciales invalidas.");
    }

    const user = result.rows[0];
    if (!user.is_active) {
      throw new UnauthorizedException("Usuario inactivo.");
    }

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) {
      throw new UnauthorizedException("Credenciales invalidas.");
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role, username: user.username },
      secret,
      { expiresIn: "8h" }
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    };
  }

  async requestPasswordReset(dto: PasswordRequestDto) {
    const requestedUsername = normalizeUsername(dto.username);
    const existing = await this.db.query<{ id: number }>(
      `SELECT id
       FROM password_requests
       WHERE requested_username = $1 AND status = 'pendiente'
       LIMIT 1`,
      [requestedUsername]
    );
    if (existing.rowCount > 0) {
      return { ok: true, message: "Ya existe una solicitud pendiente." };
    }

    const userResult = await this.db.query<{ id: number }>(
      `SELECT id
       FROM users
       WHERE REPLACE(LOWER(username), ' ', '') = $1
       LIMIT 1`,
      [requestedUsername]
    );
    const userId = userResult.rows[0]?.id ?? null;
    await this.db.query(
      `INSERT INTO password_requests (user_id, requested_username, note)
       VALUES ($1, $2, $3)`,
      [userId, requestedUsername, dto.note?.trim() || null]
    );

    return { ok: true, message: "Solicitud enviada al administrador." };
  }
}
