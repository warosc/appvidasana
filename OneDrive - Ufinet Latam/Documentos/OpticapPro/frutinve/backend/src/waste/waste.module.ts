import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { DatabaseModule } from "../database/database.module";
import { WasteController } from "./waste.controller";
import { WasteService } from "./waste.service";

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [WasteController],
  providers: [WasteService],
})
export class WasteModule {}

