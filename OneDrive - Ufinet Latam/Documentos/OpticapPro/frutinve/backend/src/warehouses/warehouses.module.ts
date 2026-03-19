import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DatabaseModule } from "../database/database.module";
import { WarehousesController } from "./warehouses.controller";
import { WarehousesService } from "./warehouses.service";

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [WarehousesController],
  providers: [WarehousesService],
})
export class WarehousesModule {}

