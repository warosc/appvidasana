import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";

import { AlarmsModule } from "./alarms/alarms.module";
import { AuditModule } from "./audit/audit.module";
import { AuthGuard } from "./auth/auth.guard";
import { AuthModule } from "./auth/auth.module";
import { GlobalExceptionFilter } from "./common/http-exception.filter";
import { CustomersModule } from "./customers/customers.module";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { InventoryModule } from "./inventory/inventory.module";
import { ProductsModule } from "./products/products.module";
import { PurchasesModule } from "./purchases/purchases.module";
import { ReportsModule } from "./reports/reports.module";
import { SalesModule } from "./sales/sales.module";
import { SuppliersModule } from "./suppliers/suppliers.module";
import { UsersModule } from "./users/users.module";
import { WarehousesModule } from "./warehouses/warehouses.module";
import { WasteModule } from "./waste/waste.module";

@Module({
  imports: [
    DatabaseModule,
    HealthModule,
    AuthModule,
    AuditModule,
    ProductsModule,
    WarehousesModule,
    InventoryModule,
    WasteModule,
    SuppliersModule,
    CustomersModule,
    PurchasesModule,
    SalesModule,
    UsersModule,
    AlarmsModule,
    ReportsModule,
  ],
  providers: [
    // AuthGuard aplicado globalmente — las rutas públicas usan @Public() si se necesita
    { provide: APP_GUARD, useClass: AuthGuard },
    // Filtro global de excepciones: normaliza errores pg y NestJS en JSON consistente
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
