import { Controller, Get, Query } from "@nestjs/common";
import { AlarmsService } from "./alarms.service";

@Controller("alarms")
export class AlarmsController {
  constructor(private readonly alarmsService: AlarmsService) {}

  @Get()
  list(@Query("wasteThreshold") wasteThreshold?: string) {
    const threshold = wasteThreshold ? Number(wasteThreshold) : undefined;
    return this.alarmsService.list(threshold);
  }
}

