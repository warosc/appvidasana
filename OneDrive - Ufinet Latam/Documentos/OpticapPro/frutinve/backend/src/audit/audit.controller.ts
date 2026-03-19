import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AuditService } from "./audit.service";

@Controller("audits")
@UseGuards(AuthGuard, RolesGuard)
@Roles("admin", "auditor")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(
    @Query("actor") actor?: string,
    @Query("entity") entity?: string,
    @Query("from") from?: string,
    @Query("to") to?: string
  ) {
    return this.auditService.list({
      actor,
      entity,
      from,
      to,
    });
  }
}
