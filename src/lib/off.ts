import type { PublicFacts } from "./types.ts";

/**
 * Open Food Facts (https://world.openfoodfacts.org) — catálogo público y abierto,
 * sin llave ni registro. Datos bajo ODbL; la app solo lee la ficha de un código
 * que la persona escaneó o eligió. Este módulo es puro: convierte la respuesta
 * de la API v2 en la ficha que entiende mialacena, sin tocar la red.
 *
 * Referencia de campos: documentación de la API en el repo público
 * github.com/openfoodfacts/openfoodfacts-server (API v2, parámetro `fields`).
 */

/** Campos mínimos para no descargar la ficha completa (puede pesar cientos de KB). */
export const OFF_FIELDS = [
  "product_name",
  "product_name_es",
  "brands",
  "image_url",
  "nutriscore_grade",
  "ecoscore_grade",
  "nova_group",
  "allergens_tags",
  "ingredients_text_es",
  "ingredients_text",
  "nutriments",
  "quantity",
  "product_quantity",
  "product_quantity_unit",
  "categories_tags",
].join(",");

export function offProductUrl(code: string): string {
  return `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}`;
}

/** Página pública del producto, para atribuir y permitir corregir datos. */
export function offWebUrl(code: string): string {
  return `https://world.openfoodfacts.org/product/${encodeURIComponent(code)}`;
}

export type OffProduct = {
  code: string;
  name: string;
  brand: string;
  categoryGuess?: string;
  packageSize?: number;
  packageUnit?: string;
  facts: PublicFacts;
};

type Raw = Record<string, unknown>;

function asRecord(value: unknown): Raw | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Raw)
    : null;
}

function asText(value: unknown, max = 120): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function asGrade(value: unknown): string | undefined {
  const grade = asText(value, 8).toLowerCase();
  return /^[a-e]$/.test(grade) ? grade : undefined;
}

function asAmount(value: unknown, digits = 1): number | undefined {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 0) return undefined;
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
}

/** Alérgenos que Open Food Facts marca con `en:...`, en español de andar por casa. */
const ALLERGEN_ES: Record<string, string> = {
  milk: "Leche",
  nuts: "Frutos secos",
  soybeans: "Soya",
  eggs: "Huevo",
  gluten: "Gluten",
  peanuts: "Cacahuate",
  fish: "Pescado",
  crustaceans: "Crustáceos",
  celery: "Apio",
  mustard: "Mostaza",
  "sesame-seeds": "Sésamo",
  "sulphur-dioxide-and-sulphites": "Sulfitos",
  molluscs: "Moluscos",
  lupin: "Altramuz",
};

export function allergenLabels(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const labels: string[] = [];
  for (const tag of tags.slice(0, 12)) {
    const clean = asText(tag, 60).replace(/^[a-z]{2}:/, "");
    if (!clean) continue;
    const label = ALLERGEN_ES[clean] ?? clean.replace(/-/g, " ");
    if (!labels.includes(label)) labels.push(label);
  }
  return labels;
}

/** De las categorías de OFF a las 7 categorías de la despensa. Mejor esfuerzo. */
const CATEGORY_HINTS: [RegExp, string][] = [
  [/(milk|dair|cheese|yogurt|egg)/, "Lácteos y huevo"],
  [/(beverage|drink|juice|soda|coffee|tea|water)/, "Bebidas"],
  [/(fruit|vegetable|salad)/, "Frutas y verduras"],
  [/(snack|chip|cookie|biscuit|candy|chocolate|popcorn)/, "Botanas"],
  [/(cleaning|detergent|soap)/, "Limpieza"],
];

export function categoryGuess(tags: unknown): string | undefined {
  if (!Array.isArray(tags)) return undefined;
  const blob = tags.map((tag) => asText(tag, 80).toLowerCase()).join(" ");
  for (const [pattern, category] of CATEGORY_HINTS) {
    if (pattern.test(blob)) return category;
  }
  return undefined;
}

const SIZE_UNITS = new Set(["g", "kg", "ml", "L", "l"]);

/**
 * Convierte la respuesta de `GET /api/v2/product/{code}.json` en producto + ficha.
 * Devuelve `null` si OFF no conoce el código (status 0) o la forma no sirve.
 */
export function parseOffProduct(json: unknown, fetchedAt = new Date().toISOString()): OffProduct | null {
  const root = asRecord(json);
  if (!root || root.status !== 1) return null;
  const product = asRecord(root.product);
  if (!product) return null;

  const code = asText(root.code, 24) || asText(product.code, 24);
  if (!code) return null;

  const name = asText(product.product_name_es, 80) || asText(product.product_name, 80);
  const brand = asText(product.brands, 80).split(",")[0]?.trim() ?? "";

  const nutriments = asRecord(product.nutriments) ?? {};
  const facts: PublicFacts = {
    source: "openfoodfacts",
    code,
    fetchedAt,
  };

  const image = asText(product.image_url, 300);
  if (image.startsWith("https://")) facts.imageUrl = image;

  const nutriscore = asGrade(product.nutriscore_grade);
  if (nutriscore) facts.nutriscore = nutriscore;
  const ecoscore = asGrade(product.ecoscore_grade);
  if (ecoscore) facts.ecoscore = ecoscore;

  const novaRaw = typeof product.nova_group === "number" ? product.nova_group : Number(product.nova_group);
  if (Number.isInteger(novaRaw) && novaRaw >= 1 && novaRaw <= 4) facts.nova = novaRaw;

  const allergens = allergenLabels(product.allergens_tags);
  if (allergens.length) facts.allergens = allergens;

  const ingredients = asText(product.ingredients_text_es, 400) || asText(product.ingredients_text, 400);
  if (ingredients) facts.ingredients = ingredients;

  const quantityLabel = asText(product.quantity, 24);
  if (quantityLabel) facts.quantityLabel = quantityLabel;

  const per100: NonNullable<PublicFacts["nutriments"]> = {};
  const kcal = asAmount(nutriments["energy-kcal_100g"], 0);
  if (kcal !== undefined) per100.kcal = kcal;
  const sugars = asAmount(nutriments.sugars_100g);
  if (sugars !== undefined) per100.sugars = sugars;
  const salt = asAmount(nutriments.salt_100g, 2);
  if (salt !== undefined) per100.salt = salt;
  const fat = asAmount(nutriments.fat_100g);
  if (fat !== undefined) per100.fat = fat;
  const proteins = asAmount(nutriments.proteins_100g);
  if (proteins !== undefined) per100.proteins = proteins;
  if (Object.keys(per100).length) facts.nutriments = per100;

  const size = asAmount(product.product_quantity, 2);
  const sizeUnitRaw = asText(product.product_quantity_unit, 8);
  const sizeUnit = sizeUnitRaw === "l" ? "L" : sizeUnitRaw;

  return {
    code,
    name: name || `Producto ${code.slice(-4)}`,
    brand,
    categoryGuess: categoryGuess(product.categories_tags),
    packageSize: size && SIZE_UNITS.has(sizeUnitRaw) ? size : undefined,
    packageUnit: size && SIZE_UNITS.has(sizeUnitRaw) ? sizeUnit : undefined,
    facts,
  };
}

/** Colores oficiales de Nutri-Score / Eco-Score (A verde → E rojo). */
export const GRADE_COLORS: Record<string, string> = {
  a: "#038141",
  b: "#85bb2f",
  c: "#fecb02",
  d: "#ee8100",
  e: "#e63e11",
};

export function gradeLabel(kind: "nutriscore" | "ecoscore", grade?: string): string | null {
  if (!grade || !GRADE_COLORS[grade]) return null;
  return `${kind === "nutriscore" ? "Nutri-Score" : "Eco-Score"} ${grade.toUpperCase()}`;
}
