export const UNITS = ["pza", "kg", "g", "L", "ml", "paq", "lata", "bolsa"] as const;
export type Unit = (typeof UNITS)[number];

export const PACKAGE_TYPES = ["pieza", "paquete", "bolsa", "lata", "botella", "caja", "frasco", "bote"] as const;
export type PackageType = (typeof PACKAGE_TYPES)[number];

export const CONSUMPTION_UNITS = [
  "piezas",
  "pza",
  "kg",
  "g",
  "L",
  "ml",
  "rollos",
  "latas",
  "sobres",
  "paquetes",
] as const;
export type ConsumptionUnit = (typeof CONSUMPTION_UNITS)[number];

export const REVIEW_INTERVAL_OPTIONS = [
  { days: 3, label: "Cada 3 días" },
  { days: 7, label: "Cada 7 días (semanal)" },
  { days: 14, label: "Cada 14 días (quincenal)" },
  { days: 30, label: "Cada 30 días (mensual)" },
  { days: 0, label: "Desactivado" },
] as const;

export const CATEGORIES = [
  "Abarrotes",
  "Lácteos y huevo",
  "Bebidas",
  "Limpieza",
  "Frutas y verduras",
  "Botanas",
  "Otros",
] as const;

export type PantryItem = {
  id: string;
  name: string;
  brand: string;
  category: string;
  targetQty: number; // in pantry unit (e.g. 2 L or 1 kg) — "qué debería tener"
  currentQty?: number; // in pantry unit — "qué tengo ahora"
  unit: Unit;
  usualPrice: number;
  lastPrice?: number; // Last real price paid from tickets or completed lists
  lastPriceDate?: string;
  packageType?: PackageType; // How it's bought: bolsa, paquete, pieza...
  packageSize?: number; // e.g., 1 paquete = 6 piezas
  packageUnit?: string; // e.g., "piezas", "kg", "L", "g"
  isEssential?: boolean; // "Imprescindible" - no puede faltar
  barcode?: string;
  expiresAt?: string; // YYYY-MM-DD
  /** Foto del producto guardada localmente en el teléfono (data URL JPEG comprimida). */
  photo?: string;
  /**
   * ISO. Se marcó como «ya lo llevo» en una compra finalizada: cuenta como repuesto (en casa)
   * hasta el próximo escaneo, con foto o a mano.
   */
  restockedAt?: string;
};

export type ScanHit = {
  name: string;
  brand: string;
  quantity: number | null;
  unit: string;
  confidence: number;
};

export type ScanReport = {
  id: string;
  at: string;
  note: string;
  hits: ScanHit[];
  present: number;
  missing: number;
  /** Productos de la despensa que faltaban (o estaban bajos) en esa lectura. */
  missingIds?: string[];
};

export type ListLine = {
  id: string;
  pantryItemId: string | null;
  name: string;
  brand: string;
  unit: string; // package or unit bought (bolsa, pieza, etc.)
  qty: number;
  unitPrice: number;
  inCart: boolean;
  isEssential?: boolean;
  isExtra?: boolean; // Extras de visita: not kept in pantry
  category?: string;
  lastPaidPrice?: number; // historical price to show if it went up
};

export type ShopList = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
  status: "active" | "saved" | "finished";
  source: "scan" | "manual";
  spendingBudget?: number | null; // Tope de gasto
  lines: ListLine[];
};

export type ViewId = "hoy" | "despensa" | "escanear" | "lista" | "guardadas";
export type DespensaTab = "catalogo" | "comparar" | "caducidades";

