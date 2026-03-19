import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { Actor } from "../common/actor.decorator";
import { CreatePurchaseDto, ReceivePurchaseDto } from "./purchases.dto";
import { PurchasesService } from "./purchases.service";

@Controller("purchases")
export class PurchasesController {
  constructor(
    private readonly purchasesService: PurchasesService,
    private readonly auditService: AuditService
  ) {}

  @Get()
  list(@Query("limit") limit?: string, @Query("offset") offset?: string) {
    return this.purchasesService.list(
      limit ? Number(limit) : undefined,
      offset ? Number(offset) : undefined
    );
  }

  @Get(":id/items")
  items(@Param("id", ParseIntPipe) id: number) {
    return this.purchasesService.getItems(id);
  }

  @Post()
  async create(@Body() body: CreatePurchaseDto, @Actor() actor: string) {
    const result = await this.purchasesService.create(body);
    await this.auditService.log(actor, "create", "purchase", result.id, body);
    return result;
  }

  @Patch(":id/receive")
  async receive(
    @Param("id", ParseIntPipe) id: number,
    @Body() body: ReceivePurchaseDto,
    @Actor() actor: string
  ) {
    const result = await this.purchasesService.receive(id, body);
    await this.auditService.log(actor, "receive", "purchase", id, body);
    return result;
  }
}
