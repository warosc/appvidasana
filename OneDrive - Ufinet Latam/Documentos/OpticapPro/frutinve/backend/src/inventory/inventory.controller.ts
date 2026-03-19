import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { Actor } from "../common/actor.decorator";
import { InventoryMovementDto, InventoryTransferDto } from "./inventory.dto";
import { InventoryService } from "./inventory.service";

@Controller("inventory")
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly auditService: AuditService
  ) {}

  @Get("movements")
  listMovements(
    @Query("productId") productId?: string,
    @Query("warehouseId") warehouseId?: string,
    @Query("movementType") movementType?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.inventoryService.listMovements({
      productId: productId ? Number(productId) : undefined,
      warehouseId: warehouseId ? Number(warehouseId) : undefined,
      movementType,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get("stock")
  listStock(
    @Query("productId") productId?: string,
    @Query("warehouseId") warehouseId?: string
  ) {
    return this.inventoryService.listStock({
      productId: productId ? Number(productId) : undefined,
      warehouseId: warehouseId ? Number(warehouseId) : undefined,
    });
  }

  @Post("entry")
  async createEntry(@Body() body: InventoryMovementDto, @Actor() actor: string) {
    const result = await this.inventoryService.createEntry(body);
    await this.auditService.log(actor, "entry", "inventory_movement", result.id, body);
    return result;
  }

  @Post("exit")
  async createExit(@Body() body: InventoryMovementDto, @Actor() actor: string) {
    const result = await this.inventoryService.createExit(body);
    await this.auditService.log(actor, "exit", "inventory_movement", result.id, body);
    return result;
  }

  @Post("transfer")
  async createTransfer(@Body() body: InventoryTransferDto, @Actor() actor: string) {
    const result = await this.inventoryService.createTransfer(body);
    await this.auditService.log(actor, "transfer", "inventory_transfer", null, body);
    return result;
  }
}
