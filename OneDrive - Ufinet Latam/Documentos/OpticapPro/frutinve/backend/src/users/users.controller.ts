import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { Actor } from "../common/actor.decorator";
import { CreateUserDto, ResetPasswordRequestDto } from "./users.dto";
import { UsersService } from "./users.service";

@Controller("users")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditService: AuditService
  ) {}

  @Get()
  list() {
    return this.usersService.list();
  }

  @Post()
  async create(@Body() body: CreateUserDto, @Actor() actor: string) {
    const result = await this.usersService.create(body);
    await this.auditService.log(actor, "create", "user", result.id, {
      username: result.username,
      role: result.role,
    });
    return result;
  }

  @Get("password-requests")
  listPasswordRequests() {
    return this.usersService.listPasswordRequests();
  }

  @Post("password-requests/:id/reset")
  async resetPasswordRequest(
    @Param("id") id: string,
    @Body() body: ResetPasswordRequestDto,
    @Actor() actor: string
  ) {
    const requestId = Number(id);
    const result = await this.usersService.resetPasswordFromRequest(requestId, body.password, actor);
    await this.auditService.log(actor, "reset_password", "password_request", requestId, {
      requestId,
    });
    return result;
  }
}
