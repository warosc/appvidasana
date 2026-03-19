import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DatabaseModule } from "../database/database.module";
import { PurchasesController } from "./purchases.controller";
import { PurchasesService } from "./purchases.service";

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}

