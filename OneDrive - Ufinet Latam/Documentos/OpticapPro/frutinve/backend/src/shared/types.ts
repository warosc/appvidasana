/** Unidad base soportada por el sistema */
export type BaseUnit = "kg" | "caja" | "pieza";

/** Fila de producto leída desde la DB para cálculos de conversión */
export type ProductRow = {
  id: number;
  base_unit: BaseUnit;
  conversion_to_kg: string | null;
};

/** Fila de bodega leída desde la DB para validar estado activo */
export type WarehouseRow = {
  id: number;
  is_active: boolean;
};

/** Tipos válidos de reporte */
export type ReportType = "inventory" | "movements" | "waste" | "purchases" | "sales";
