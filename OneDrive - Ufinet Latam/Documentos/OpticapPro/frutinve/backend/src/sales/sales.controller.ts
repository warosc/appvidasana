import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { Actor } from "../common/actor.decorator";
import { CreateSalesDto } from "./sales.dto";
import { SalesService } from "./sales.service";

@Controller("sales")
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly auditService: AuditService
  ) {}

  @Get()
  list(@Query("limit") limit?: string, @Query("offset") offset?: string) {
    return this.salesService.list(
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined
    );
  }

  @Get(":id/items")
  items(@Param("id", ParseIntPipe) id: number) {
    return this.salesService.getItems(id);
  }

  @Post()
  async create(@Body() body: CreateSalesDto, @Actor() actor: string) {
    const result = await this.salesService.create(body);
    await this.auditService.log(actor, "create", "sale", result.id, body);
    return result;
  }

  @Patch(":id/confirm")
  async confirm(@Param("id", ParseIntPipe) id: number, @Actor() actor: string) {
    const result = await this.salesService.confirm(id);
    await this.auditService.log(actor, "confirm", "sale", id, null);
    return result;
  }
}
