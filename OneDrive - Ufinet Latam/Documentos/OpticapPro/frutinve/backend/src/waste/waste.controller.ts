import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { Actor } from "../common/actor.decorator";
import { CreateWasteDto } from "./waste.dto";
import { WasteService } from "./waste.service";

@Controller("waste")
export class WasteController {
  constructor(
    private readonly wasteService: WasteService,
    private readonly auditService: AuditService
  ) {}

  @Get()
  list(
    @Query("productId") productId?: string,
    @Query("warehouseId") warehouseId?: string,
    @Query("reason") reason?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.wasteService.list({
      productId: productId ? Number(productId) : undefined,
      warehouseId: warehouseId ? Number(warehouseId) : undefined,
      reason: reason || undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Post()
  async create(@Body() body: CreateWasteDto, @Actor() actor: string) {
    const result = await this.wasteService.create(body);
    await this.auditService.log(actor, "create", "waste", result.id, body);
    return result;
  }
}
