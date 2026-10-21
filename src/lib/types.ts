export const UNITS = ["pza", "kg", "g", "L", "ml", "paq", "lata", "bolsa"] as const;
export type Unit = (typeof UNITS)[number];

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
  targetQty: number;
  unit: Unit;
  usualPrice: number;
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
};

export type ListLine = {
  id: string;
  pantryItemId: string | null;
  name: string;
  brand: string;
  unit: string;
  qty: number;
  unitPrice: number;
  inCart: boolean;
};

export type ShopList = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
  status: "active" | "saved" | "finished";
  source: "scan" | "manual";
  lines: ListLine[];
};

export type ViewId = "hoy" | "despensa" | "escanear" | "lista" | "guardadas";
