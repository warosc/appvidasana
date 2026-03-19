# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Frutinve** is an inventory management system for fresh produce (fruits and vegetables). The stack is:
- **Backend**: NestJS (TypeScript) + PostgreSQL — lives in `backend/src/`
- **Frontend**: Not yet implemented — `frontend/` is an empty placeholder

## Backend Commands

The `backend/` directory is a NestJS project. Standard NestJS CLI commands apply:

```bash
cd backend
npm run start:dev    # Development with hot reload
npm run build        # Production build
npm run start:prod   # Run production build
npm run lint         # ESLint
npm run test         # Jest unit tests
npm run test:e2e     # End-to-end tests
```

> **Note:** `package.json` may not exist yet. If missing, initialize with `nest new backend` or create it manually for an existing NestJS project.

## Environment Variables

```
DATABASE_URL   # PostgreSQL connection string (default: postgres://freshflow:freshflow@db:5432/freshflow)
JWT_SECRET     # JWT signing secret — MUST be set; the app throws 500 on first request if missing
ADMIN_PASSWORD # Initial admin password seeded on first boot (default: R00tp4ss123!)
```

## Architecture

### Module Pattern

Each business domain follows the same 4-file pattern:
```
module-name/
  module-name.module.ts      # NestJS module wiring
  module-name.controller.ts  # HTTP routes + guards
  module-name.service.ts     # Business logic + raw SQL
  module-name.dto.ts         # class-validator DTOs
```

### Shared Utilities (`src/shared/` and `src/common/`)

| File | Purpose |
|---|---|
| `shared/types.ts` | `ProductRow`, `WarehouseRow`, `BaseUnit`, `ReportType` — used across services to avoid duplication |
| `shared/normalize.ts` | `normalizeUsername()` — strips spaces and lowercases usernames consistently |
| `common/actor.decorator.ts` | `@Actor()` param decorator — extracts `username` from the verified JWT payload (`request.user`) |
| `common/http-exception.filter.ts` | `GlobalExceptionFilter` — normalizes NestJS HttpExceptions and PostgreSQL errors (23505, 23503, 23514, 23502) into a consistent JSON shape |

**Registering GlobalExceptionFilter** (add to root AppModule when created):
```typescript
providers: [{ provide: APP_FILTER, useClass: GlobalExceptionFilter }]
```

### Data Layer

There is **no ORM**. All persistence is raw SQL via `DatabaseService` (a singleton wrapping `node-postgres` Pool). The service exposes:
- `db.query(sql, params)` — for single queries
- `db.withTransaction(handler)` — for multi-step atomic operations

The entire schema (DDL) is defined in `database.service.ts#ensureSchema()` and runs idempotently on every startup using `CREATE ... IF NOT EXISTS`.

### Authentication & Authorization

- JWT tokens are signed with `JWT_SECRET`, expire in 8 hours, and carry `{ sub, role, username }`.
- `AuthGuard` (applied globally in `AppModule`) validates the token and sets `request.user`.
- `@Roles(...)` + `RolesGuard` enforce RBAC on individual endpoints.
- The audit actor is extracted from `request.user.username` via `@Actor()` — **never from an arbitrary header**.

### Roles

`admin`, `bodeguero`, `ventas`, `compras`, `auditor`

### Inventory Stock

Stock is never stored directly — it is calculated from `inventory_movements` via the `inventory_stock` **database view** (SUM of entry/transfer_in minus exit/transfer_out).

Warehouse-to-warehouse transfers use `withTransaction` and create a mirrored `transfer_out`/`transfer_in` pair linked by a UUID `transfer_ref`.

### Pagination

All `list()` endpoints accept `?limit=N&offset=N` query parameters (defaults: `limit=200`, `offset=0` for catalog data; `limit=100` for orders). Always pass explicit values in high-volume environments.

### Alarms

`AlarmsService` runs three parallel queries on demand: low stock (active products below `min_stock` in active warehouses only), empty active warehouses, and excessive waste in the last 30 days. The waste threshold is passed as a query param (default: 50 base units).

### Audit Trail

Every write operation logs to the `audits` table with `actor`, `action`, `entity`, `entity_id`, and a JSONB `details` field. The `AuditService` is injected into each service that needs it. The actor always comes from the JWT (`@Actor()` decorator).

### Reports

`ReportsService` exposes typed methods per report type (`inventory`, `movements`, `waste`, `purchases`, `sales`) plus `getReportData(type: ReportType | string, filters)` used by the export endpoint. The `ReportType` union is defined in `shared/types.ts`.

The export endpoint (`GET /reports/export?type=X&format=csv|xlsx|pdf`) supports CSV, Excel (ExcelJS), and PDF (PDFKit) output with logo, filters summary, and totals.
