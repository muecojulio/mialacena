/**
 * Respaldo de recetas con IA cuando TheMealDB no responde o no conoce el
 * ingrediente. Es la parte pura (sin red): convierte la respuesta del modelo en
 * `Recipe[]`, descartando lo que no tenga forma y poniendo topes de tamaño.
 *
 * Se activa sola: solo si `XAI_API_KEY` está configurada (ver
 * `recipes.functions.ts`). Si no hay llave, la app se queda con el aviso de
 * siempre y no inventa nada.
 */
import { stripControl } from "./public-fetch.ts";
import type { Recipe } from "./recipes.ts";

type Raw = Record<string, unknown>;

function asText(value: unknown, max = 80): string {
  return typeof value === "string" ? stripControl(value).replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function asList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const row of value.slice(0, max)) {
    const text = asText(row, 60);
    if (text && !out.some((item) => item.toLowerCase() === text.toLowerCase())) out.push(text);
  }
  return out;
}

/** Identificador estable y sin carrera para una receta sugerida. */
function aiRecipeId(title: string, index: number): string {
  const slug = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
  return `ai-${index + 1}-${slug || "receta"}`;
}

/**
 * Convierte `{ recipes: [{ title, area, category, have, missing }] }` en
 * recetas listas para la tarjeta. Máximo 4 recetas; el agua nunca es faltante.
 */
export function parseAiRecipes(json: unknown): Recipe[] {
  if (typeof json !== "object" || json === null || Array.isArray(json)) return [];
  const rows = (json as Raw).recipes;
  if (!Array.isArray(rows)) return [];

  const recipes: Recipe[] = [];
  // Se revisan hasta 12 filas por si el modelo manda basura, pero se devuelven 4.
  for (const [index, row] of rows.slice(0, 12).entries()) {
    if (recipes.length >= 4) break;
    if (typeof row !== "object" || row === null || Array.isArray(row)) continue;
    const entry = row as Raw;
    const title = asText(entry.title, 90);
    if (title.length < 3) continue;

    const have = asList(entry.have, 12);
    const missing = asList(entry.missing, 10)
      .filter((name) => !/^agua$/i.test(name))
      .map((name) => ({ en: name.toLowerCase(), es: name }));

    recipes.push({
      id: aiRecipeId(title, index),
      title,
      area: asText(entry.area, 40) || "Sugerida por IA",
      category: asText(entry.category, 40) || undefined,
      origin: "ai",
      have,
      missing,
    });
  }
  return recipes;
}
