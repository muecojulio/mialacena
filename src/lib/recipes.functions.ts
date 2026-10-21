import { createServerFn } from "@tanstack/react-start";
import { rateLimit } from "@/lib/rate-limit";
import { fetchJson, ttlCache } from "./public-fetch.ts";
import {
  parseMealList,
  rankRecipes,
  scoreRecipe,
  type PantryIngredient,
  type Recipe,
} from "./recipes.ts";
import type { PantryItem } from "./types.ts";

/**
 * Recetas de TheMealDB (API pública sin llave) cruzadas con la despensa.
 * Solo viajan los ingredientes en inglés («egg», «milk»): ni la lista, ni los
 * precios, ni cantidades. Trae como máximo 6 recetas completas por búsqueda.
 */

const BASE = "https://www.themealdb.com/api/json/v1/1";
const cache = ttlCache<Recipe[]>(30 * 60 * 1000, 30);

type SuggestInput = { ingredient: string; pantryEn: string[]; pantryNames: string[] };
type SuggestOk = { ok: true; recipes: Recipe[]; ingredient: string };
type SuggestErr = { ok: false; error: string };

function asSuggestInput(input: SuggestInput): SuggestInput {
  const ingredient = String(input?.ingredient ?? "").trim().toLowerCase().slice(0, 40);
  if (ingredient.length < 2) throw new Error("Falta el ingrediente principal");
  const clean = (rows: unknown, max: number) =>
    Array.isArray(rows)
      ? rows.map((row) => String(row ?? "").trim().slice(0, 60)).filter(Boolean).slice(0, max)
      : [];
  return {
    ingredient,
    pantryEn: clean(input?.pantryEn, 40),
    pantryNames: clean(input?.pantryNames, 40),
  };
}

/** PantryIngredient mínimo para puntuar (el cruce no necesita el producto entero). */
function pantryRows(data: SuggestInput): PantryIngredient[] {
  return data.pantryEn.map((en, index) => ({
    en,
    daysLeft: null,
    item: { name: data.pantryNames[index] ?? en } as PantryItem,
  }));
}

export const suggestRecipes = createServerFn({ method: "POST" })
  .middleware([rateLimit("recipes", 12, 60_000)])
  .validator(asSuggestInput)
  .handler(async ({ data }): Promise<SuggestOk | SuggestErr> => {
    const key = `${data.ingredient}|${[...data.pantryEn].sort().join(",")}`;
    const hit = cache.get(key);
    if (hit) return { ok: true, recipes: hit, ingredient: data.ingredient };

    const listJson = await fetchJson(
      `${BASE}/filter.php?i=${encodeURIComponent(data.ingredient.replace(/ /g, "_"))}`,
    );
    if (!listJson) return { ok: false, error: "Las recetas públicas no respondieron." };

    const candidates = parseMealList(listJson).slice(0, 6);
    if (!candidates.length) {
      return { ok: false, error: "No encontré recetas con ese ingrediente." };
    }

    const pantry = pantryRows(data);
    const details = await Promise.all(
      candidates.map((meal) => fetchJson(`${BASE}/lookup.php?i=${meal.id}`)),
    );
    const recipes = rankRecipes(
      details
        .map((json) => (json ? scoreRecipe(json, pantry) : null))
        .filter((recipe): recipe is Recipe => recipe !== null),
    );
    if (!recipes.length) return { ok: false, error: "No pude abrir el detalle de las recetas." };

    cache.set(key, recipes);
    return { ok: true, recipes, ingredient: data.ingredient };
  });
