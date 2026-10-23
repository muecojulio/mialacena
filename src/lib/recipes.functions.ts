import { createServerFn } from "@tanstack/react-start";
import { jsonFromAi } from "./ai.ts";
import { rateLimit } from "@/lib/rate-limit";
import { fetchJson, ttlCache } from "./public-fetch.ts";
import { parseAiRecipes } from "./recipes-ai.ts";
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
 *
 * **Respaldo con IA:** si TheMealDB no responde (o no conoce el ingrediente) y
 * `XAI_API_KEY` está configurada, se piden ideas al modelo con los nombres que
 * ya están en la despensa. Ese respaldo se activa solo cuando el servicio
 * público falla y se marca en la interfaz como «sugerida por IA».
 */

const BASE = "https://www.themealdb.com/api/json/v1/1";
const cache = ttlCache<Recipe[]>(30 * 60 * 1000, 30);

type SuggestInput = { ingredient: string; pantryEn: string[]; pantryNames: string[] };
type SuggestOk = { ok: true; recipes: Recipe[]; ingredient: string; origin: "themealdb" | "ai" };
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

/** Consulta TheMealDB; `null` si el servicio no respondió. */
async function fromMealDb(data: SuggestInput): Promise<Recipe[] | null> {
  const listJson = await fetchJson(
    `${BASE}/filter.php?i=${encodeURIComponent(data.ingredient.replace(/ /g, "_"))}`,
  );
  if (!listJson) return null;

  const candidates = parseMealList(listJson).slice(0, 6);
  if (!candidates.length) return [];

  const pantry = pantryRows(data);
  const details = await Promise.all(
    candidates.map((meal) => fetchJson(`${BASE}/lookup.php?i=${meal.id}`)),
  );
  return rankRecipes(
    details
      .map((json) => (json ? scoreRecipe(json, pantry) : null))
      .filter((recipe): recipe is Recipe => recipe !== null),
  );
}

/** Respaldo con IA: usa los nombres de la despensa, sin mandar precios ni listas. */
async function fromAi(data: SuggestInput): Promise<Recipe[]> {
  // Carga diferida: el bundle del cliente no incluye el módulo de la llave.
  const { xaiAvailable, xaiChat } = await import("./ai.server.ts");
  if (!xaiAvailable()) return [];
  const pantry = data.pantryNames.slice(0, 24);
  const result = await xaiChat({
    maxTokens: 900,
    temperature: 0.4,
    content: [
      "Eres un cocinero mexicano práctico. Con estos ingredientes que ya hay en casa:",
      pantry.join(", ") || data.ingredient,
      "Propón hasta 3 recetas caseras sencillas que se puedan preparar con lo que hay.",
      "Marca como faltantes solo ingredientes comunes que falten (sal, aceite, tortillas…). El agua no cuenta.",
      'Responde EXCLUSIVAMENTE JSON válido: {"recipes":[{"title":"","area":"Mexicana","category":"Comida","have":["ingrediente"],"missing":["ingrediente"]}]}',
      "Sin comentarios, sin Markdown y todo en español.",
    ].join("\n"),
  });
  if (!result.ok) return [];
  return parseAiRecipes(jsonFromAi(result.text));
}

export const suggestRecipes = createServerFn({ method: "POST" })
  .middleware([rateLimit("recipes", 12, 60_000)])
  .validator(asSuggestInput)
  .handler(async ({ data }): Promise<SuggestOk | SuggestErr> => {
    const key = `${data.ingredient}|${[...data.pantryEn].sort().join(",")}`;
    const hit = cache.get(key);
    if (hit) {
      return {
        ok: true,
        recipes: hit,
        ingredient: data.ingredient,
        origin: hit[0]?.origin === "ai" ? "ai" : "themealdb",
      };
    }

    // 1) Servicio público de recetas.
    const publicRecipes = await fromMealDb(data);
    if (publicRecipes && publicRecipes.length) {
      cache.set(key, publicRecipes);
      return { ok: true, recipes: publicRecipes, ingredient: data.ingredient, origin: "themealdb" };
    }

    // 2) Respaldo con IA, solo si el servicio público falló o no tuvo ideas.
    const aiRecipes = await fromAi(data);
    if (aiRecipes.length) {
      cache.set(key, aiRecipes);
      return { ok: true, recipes: aiRecipes, ingredient: data.ingredient, origin: "ai" };
    }

    return {
      ok: false,
      error:
        publicRecipes === null
          ? "Las recetas públicas no respondieron. Inténtalo en un momento."
          : "No encontré recetas con ese ingrediente.",
    };
  });
