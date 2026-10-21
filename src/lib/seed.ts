import type { PantryItem } from "@/lib/types";

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
  expiresAt?: string,
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
  expiresAt,
});

/** Despensa base con datos de empaque, caducidades e imprescindibles. */
export const SEED: PantryItem[] = [
  row("arroz", "Arroz", "Verde Valle", "Abarrotes", 1, "kg", 34, "bolsa", true, 32),
  row("frijol", "Frijol negro", "Verde Valle", "Abarrotes", 1, "kg", 46, "bolsa", true, 44),
  row("aceite", "Aceite vegetal", "Nutrioli", "Abarrotes", 1, "L", 52, "botella", true, 48),
  row("azucar", "Azúcar", "Zulka", "Abarrotes", 1, "kg", 32, "bolsa", false, 32),
  row("sal", "Sal", "La Fina", "Abarrotes", 1, "kg", 14, "bote", false, 14),
  row("pasta", "Pasta", "Barilla", "Abarrotes", 2, "paq", 24, "paquete", true, 22),
  row("avena", "Avena", "Quaker", "Abarrotes", 1, "paq", 38, "bolsa", false, 36),
  row("atun", "Atún", "Dolores", "Abarrotes", 3, "lata", 22, "lata", true, 20),
  row("salsa", "Salsa", "Valentina", "Abarrotes", 1, "pza", 24, "botella", false, 24),
  row("leche", "Leche", "Lala", "Lácteos y huevo", 2, "L", 46, "pieza", true, 42),
  row("huevo", "Huevo", "San Juan", "Lácteos y huevo", 12, "pza", 52, "paquete", true, 48),
  row("cafe", "Café soluble", "Nescafé", "Bebidas", 1, "pza", 89, "frasco", true, 85),
  row("tortilla", "Tortillas", "", "Abarrotes", 1, "kg", 28, "paquete", true, 26),
  row("jabon", "Jabón de trastes", "Salvo", "Limpieza", 1, "pza", 36, "botella", false, 34),
  row("papel", "Papel higiénico", "Pétalo", "Limpieza", 1, "paq", 48, "paquete", true, 45),
  row("cloro", "Cloro", "Cloralex", "Limpieza", 1, "L", 28, "botella", false, 28),
];
