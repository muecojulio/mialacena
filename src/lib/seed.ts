import type { PantryItem } from "@/lib/types";

const row = (
  id: string,
  name: string,
  brand: string,
  category: string,
  targetQty: number,
  unit: PantryItem["unit"],
  usualPrice: number,
): PantryItem => ({ id, name, brand, category, targetQty, unit, usualPrice });

/** Despensa base de un hogar en México. Precios habituales editables, no cotización en vivo. */
export const SEED: PantryItem[] = [
  row("arroz", "Arroz", "Verde Valle", "Abarrotes", 1, "kg", 34),
  row("frijol", "Frijol negro", "Verde Valle", "Abarrotes", 1, "kg", 46),
  row("aceite", "Aceite vegetal", "Nutrioli", "Abarrotes", 1, "L", 52),
  row("azucar", "Azúcar", "Zulka", "Abarrotes", 1, "kg", 32),
  row("sal", "Sal", "La Fina", "Abarrotes", 1, "kg", 14),
  row("pasta", "Pasta", "Barilla", "Abarrotes", 2, "paq", 24),
  row("avena", "Avena", "Quaker", "Abarrotes", 1, "paq", 38),
  row("atun", "Atún", "Dolores", "Abarrotes", 3, "lata", 22),
  row("salsa", "Salsa", "Valentina", "Abarrotes", 1, "pza", 24),
  row("leche", "Leche", "Lala", "Lácteos y huevo", 2, "L", 46),
  row("huevo", "Huevo", "San Juan", "Lácteos y huevo", 12, "pza", 52),
  row("cafe", "Café soluble", "Nescafé", "Bebidas", 1, "pza", 89),
  row("tortilla", "Tortillas", "", "Abarrotes", 1, "kg", 28),
  row("jabon", "Jabón de trastes", "Salvo", "Limpieza", 1, "pza", 36),
  row("papel", "Papel higiénico", "Pétalo", "Limpieza", 1, "paq", 48),
  row("cloro", "Cloro", "Cloralex", "Limpieza", 1, "L", 28),
];
