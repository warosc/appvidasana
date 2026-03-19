import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { Actor } from "../common/actor.decorator";
import { CreateWarehouseDto, UpdateWarehouseDto } from "./warehouses.dto";
import { WarehousesService } from "./warehouses.service";

@Controller("warehouses")
export class WarehousesController {
  constructor(
    private readonly warehousesService: WarehousesService,
    private readonly auditService: AuditService
  ) {}

  @Get()
  list(@Query("limit") limit?: string, @Query("offset") offset?: string) {
    return this.warehousesService.list(
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined
    );
  }

  @Post()
  async create(@Body() body: CreateWarehouseDto, @Actor() actor: string) {
    const result = await this.warehousesService.create(body);
    await this.auditService.log(actor, "create", "warehouse", result.id, result);
    return result;
  }

  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: UpdateWarehouseDto,
    @Actor() actor: string
  ) {
    return this.warehousesService.update(id, body).then(async (result) => {
      await this.auditService.log(actor, "update", "warehouse", id, body);
      return result;
    });
  }
}
