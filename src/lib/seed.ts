import { addDays, dayKey } from "./dates.ts";
import type { PantryItem } from "./types.ts";

const today = dayKey();

const row = (
  id: string,
  name: string,
  brand: string,
  category: string,
  targetQty: number,
  unit: PantryItem["unit"],
  usualPrice: number,
  packageType: PantryItem["packageType"] = "pieza",
  isEssential = false,
  lastPrice?: number,
  extra: Partial<PantryItem> = {},
): PantryItem => ({
  id,
  name,
  brand,
  category,
  targetQty,
  unit,
  usualPrice,
  packageType,
  isEssential,
  lastPrice,
  ...extra,
});

/** Despensa base con datos de empaque (compra vs. consumo), existencias actuales, caducidades e imprescindibles. */
export const SEED: PantryItem[] = [
  row("arroz", "Arroz", "Verde Valle", "Abarrotes", 1, "kg", 34, "bolsa", true, 32, {
    currentQty: 1,
    packageSize: 1,
    packageUnit: "kg",
  }),
  row("frijol", "Frijol negro", "Verde Valle", "Abarrotes", 1, "kg", 46, "bolsa", true, 44, {
    currentQty: 1,
    packageSize: 1,
    packageUnit: "kg",
  }),
  row("aceite", "Aceite vegetal", "Nutrioli", "Abarrotes", 1, "L", 52, "botella", true, 48, {
    currentQty: 1,
    packageSize: 1,
    packageUnit: "L",
  }),
  row("azucar", "Azúcar", "Zulka", "Abarrotes", 1, "kg", 32, "bolsa", false, 32, {
    currentQty: 1,
    packageSize: 1,
    packageUnit: "kg",
  }),
  row("sal", "Sal", "La Fina", "Abarrotes", 1, "kg", 14, "bote", false, 14, {
    currentQty: 1,
    packageSize: 1,
    packageUnit: "kg",
  }),
  row("pasta", "Pasta", "Barilla", "Abarrotes", 2, "paq", 24, "paquete", true, 22, {
    currentQty: 1,
    packageSize: 200,
    packageUnit: "g",
  }),
  row("avena", "Avena", "Quaker", "Abarrotes", 1, "paq", 38, "bolsa", false, 36, {
    currentQty: 1,
    packageSize: 400,
    packageUnit: "g",
    expiresAt: addDays(today, 6),
  }),
  row("atun", "Atún", "Dolores", "Abarrotes", 3, "lata", 22, "lata", true, 20, {
    currentQty: 1,
    packageSize: 140,
    packageUnit: "g",
  }),
  row("salsa", "Salsa", "Valentina", "Abarrotes", 1, "pza", 24, "botella", false, 24, {
    currentQty: 1,
    packageSize: 370,
    packageUnit: "ml",
  }),
  row("leche", "Leche", "Lala", "Lácteos y huevo", 2, "L", 46, "caja", true, 42, {
    currentQty: 1,
    packageSize: 1,
    packageUnit: "L",
    expiresAt: addDays(today, 2),
  }),
  row("huevo", "Huevo", "San Juan", "Lácteos y huevo", 12, "pza", 52, "paquete", true, 48, {
    currentQty: 6,
    packageSize: 6,
    packageUnit: "piezas",
    expiresAt: addDays(today, 4),
  }),
  row("cafe", "Café soluble", "Nescafé", "Bebidas", 1, "pza", 89, "frasco", true, 85, {
    currentQty: 0,
    packageSize: 1,
    packageUnit: "piezas",
  }),
  row("tortilla", "Tortillas", "", "Abarrotes", 1, "kg", 28, "paquete", true, 26, {
    currentQty: 0,
    packageSize: 1,
    packageUnit: "kg",
    expiresAt: addDays(today, 3),
  }),
  row("jabon", "Jabón de trastes", "Salvo", "Limpieza", 1, "pza", 36, "botella", false, 34, {
    currentQty: 1,
    packageSize: 900,
    packageUnit: "ml",
  }),
  row("papel", "Papel higiénico", "Pétalo", "Limpieza", 1, "paq", 48, "paquete", true, 45, {
    currentQty: 0,
    packageSize: 6,
    packageUnit: "piezas",
  }),
  row("cloro", "Cloro", "Cloralex", "Limpieza", 1, "L", 28, "botella", false, 28, {
    currentQty: 1,
    packageSize: 1,
    packageUnit: "L",
  }),
];
