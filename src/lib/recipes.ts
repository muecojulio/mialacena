import { getEffectiveCurrentQty } from "./pantry-helpers.ts";
import type { PantryItem, ScanReport } from "./types.ts";

/**
 * Recetas con lo que ya hay en la alacena, usando TheMealDB
 * (https://www.themealdb.com/api.php) — API pública y gratuita, sin llave
 * (la ruta `/api/json/v1/1/` es la de prueba abierta).
 *
 * TheMealDB busca por UN ingrediente en inglés (`filter.php?i=egg`), así que
 * aquí vive el diccionario español→inglés de básicos de despensa y el cruce
 * «qué ingredientes de la receta ya tengo / cuáles me faltan». Todo puro.
 */

/** Básicos de una despensa mexicana → ingrediente de TheMealDB. */
export const INGREDIENT_EN: Record<string, string> = {
  huevo: "egg",
  huevos: "egg",
  leche: "milk",
  queso: "cheese",
  mantequilla: "butter",
  crema: "cream",
  yogur: "yogurt",
  yogurt: "yogurt",
  arroz: "rice",
  pasta: "pasta",
  espagueti: "spaghetti",
  harina: "flour",
  avena: "oats",
  pan: "bread",
  tortilla: "tortillas",
  tortillas: "tortillas",
  atun: "tuna",
  pollo: "chicken",
  res: "beef",
  carne: "beef",
  puerco: "pork",
  cerdo: "pork",
  pescado: "fish",
  camaron: "prawns",
  jamon: "ham",
  salchicha: "sausages",
  papa: "potato",
  papas: "potato",
  cebolla: "onion",
  ajo: "garlic",
  jitomate: "tomato",
  tomate: "tomato",
  zanahoria: "carrot",
  calabaza: "zucchini",
  champinones: "mushrooms",
  hongos: "mushrooms",
  espinaca: "spinach",
  lechuga: "lettuce",
  elote: "sweetcorn",
  maiz: "sweetcorn",
  chicharos: "peas",
  frijol: "beans",
  frijoles: "beans",
  lentejas: "lentils",
  garbanzo: "chickpeas",
  aguacate: "avocado",
  limon: "lemon",
  manzana: "apple",
  platano: "banana",
  azucar: "sugar",
  sal: "salt",
  aceite: "olive oil",
  cafe: "coffee",
  chocolate: "chocolate",
  miel: "honey",
  nuez: "walnuts",
  cacahuate: "peanuts",
};

/** Inverso (para mostrar el faltante en español): gana la primera forma. */
const INGREDIENT_ES: Record<string, string> = {};
for (const [es, en] of Object.entries(INGREDIENT_EN)) {
  if (!INGREDIENT_ES[en]) INGREDIENT_ES[en] = es;
}

export function normalizeName(value: string): string {
  return value
    .toLocaleLowerCase("es-MX")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Palabras sueltas de un nombre de producto: "Leche Entera 1L" → ["leche","entera","1l"]. */
function tokens(value: string): string[] {
  return normalizeName(value).split(" ").filter(Boolean);
}

export type PantryIngredient = {
  item: PantryItem;
  /** Ingrediente en inglés para TheMealDB. */
  en: string;
  /** Días para caducar (negativo = ya pasó); `null` si no tiene fecha. */
  daysLeft: number | null;
};

function daysUntil(day: string | undefined, today: string): number | null {
  if (!day) return null;
  const [y, m, d] = day.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  if (!y || !ty) return null;
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000);
}

/**
 * Ingredientes aprovechables para cocinar: productos de comida que sí hay
 * (existencia efectiva > 0) y que el diccionario sabe traducir. Ordena por
 * caducidad: primero lo que urge usar, que es el punto de esta función.
 */
export function pantryIngredients(
  items: PantryItem[],
  lastScan: ScanReport | null,
  today: string,
): PantryIngredient[] {
  const seen = new Set<string>();
  const rows: PantryIngredient[] = [];
  for (const item of items) {
    if (item.category === "Limpieza") continue;
    if (getEffectiveCurrentQty(item, lastScan) <= 0) continue;
    const match = tokens(item.name).find((token) => INGREDIENT_EN[token]);
    if (!match) continue;
    const en = INGREDIENT_EN[match];
    if (seen.has(en)) continue;
    seen.add(en);
    rows.push({ item, en, daysLeft: daysUntil(item.expiresAt, today) });
  }
  return rows.sort((a, b) => {
    if (a.daysLeft === null && b.daysLeft === null) return 0;
    if (a.daysLeft === null) return 1;
    if (b.daysLeft === null) return -1;
    return a.daysLeft - b.daysLeft;
  });
}

export type Recipe = {
  id: string;
  title: string;
  thumb?: string;
  area?: string;
  category?: string;
  sourceUrl: string;
  /** Ingredientes (inglés, tal cual los da TheMealDB) que sí están en la despensa. */
  have: string[];
  /** Faltantes ya traducidos al español cuando el diccionario los conoce. */
  missing: { en: string; es: string }[];
};

type Raw = Record<string, unknown>;

function asText(value: unknown, max = 120): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** `filter.php?i=` → lista ligera de recetas (id, título, foto). */
export function parseMealList(json: unknown): { id: string; title: string; thumb?: string }[] {
  const meals = (json as Raw | null)?.meals;
  if (!Array.isArray(meals)) return [];
  const out: { id: string; title: string; thumb?: string }[] = [];
  for (const row of meals.slice(0, 24)) {
    const meal = row as Raw;
    const id = asText(meal.idMeal, 12);
    const title = asText(meal.strMeal, 90);
    if (!id || !title) continue;
    const thumb = asText(meal.strMealThumb, 300);
    out.push({ id, title, thumb: thumb.startsWith("https://") ? thumb : undefined });
  }
  return out;
}

/** Ingredientes de `lookup.php?i=` (strIngredient1..20). */
export function mealIngredients(meal: Raw): string[] {
  const out: string[] = [];
  for (let i = 1; i <= 20; i += 1) {
    const ingredient = asText(meal[`strIngredient${i}`], 60);
    if (ingredient) out.push(ingredient);
  }
  return out;
}

function looksLike(ingredientEn: string, pantryEn: string[], pantryEsTokens: Set<string>): boolean {
  const needle = normalizeName(ingredientEn);
  if (!needle) return false;
  const words = needle.split(" ");
  for (const en of pantryEn) {
    const hay = normalizeName(en);
    if (needle === hay || needle.includes(hay) || hay.includes(needle)) return true;
    if (words.some((word) => word.length > 3 && hay.split(" ").includes(word))) return true;
  }
  // Hay nombres iguales en ambos idiomas ("pasta", "sal"... no; "tortillas" sí).
  return words.some((word) => pantryEsTokens.has(word));
}

/**
 * Cruza una receta completa de TheMealDB con la despensa: qué hay y qué falta.
 * El agua no cuenta como faltante (nadie la apunta en la lista).
 */
export function scoreRecipe(mealJson: unknown, pantry: PantryIngredient[]): Recipe | null {
  const meals = (mealJson as Raw | null)?.meals;
  if (!Array.isArray(meals) || !meals.length) return null;
  const meal = meals[0] as Raw;
  const id = asText(meal.idMeal, 12);
  const title = asText(meal.strMeal, 90);
  if (!id || !title) return null;

  const pantryEn = pantry.map((row) => row.en);
  const pantryEsTokens = new Set(pantry.flatMap((row) => tokens(row.item.name)));
  const have: string[] = [];
  const missing: Recipe["missing"] = [];
  for (const ingredient of mealIngredients(meal)) {
    if (/^water$/i.test(ingredient)) continue;
    if (looksLike(ingredient, pantryEn, pantryEsTokens)) {
      have.push(ingredient);
    } else {
      const key = normalizeName(ingredient);
      const es = INGREDIENT_ES[key] ?? key;
      missing.push({ en: ingredient, es: es.charAt(0).toUpperCase() + es.slice(1) });
    }
  }

  const thumb = asText(meal.strMealThumb, 300);
  return {
    id,
    title,
    thumb: thumb.startsWith("https://") ? thumb : undefined,
    area: asText(meal.strArea, 40) || undefined,
    category: asText(meal.strCategory, 40) || undefined,
    sourceUrl: `https://www.themealdb.com/meal/${id}`,
    have,
    missing,
  };
}

/** Orden de presentación: más ingredientes a la mano y menos faltantes primero. */
export function rankRecipes(recipes: Recipe[]): Recipe[] {
  return [...recipes].sort((a, b) => {
    const scoreB = b.have.length * 2 - b.missing.length;
    const scoreA = a.have.length * 2 - a.missing.length;
    return scoreB - scoreA;
  });
}
