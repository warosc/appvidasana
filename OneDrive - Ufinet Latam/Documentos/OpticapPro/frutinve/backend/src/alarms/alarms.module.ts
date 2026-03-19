import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { AlarmsController } from "./alarms.controller";
import { AlarmsService } from "./alarms.service";

@Module({
  imports: [DatabaseModule],
  controllers: [AlarmsController],
  providers: [AlarmsService],
})
export class AlarmsModule {}

