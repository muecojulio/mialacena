/**
 * Color por anaquel de categoría — el mismo en Despensa, Lista y Guardadas,
 * para que «Lácteos» se vea siempre azul cielo y «Botanas» rosa, etc.
 */
export const CATEGORY_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  Abarrotes: { bg: "bg-sun/25", text: "text-sun-ink", dot: "bg-sun" },
  "Lácteos y huevo": { bg: "bg-sky/20", text: "text-sky", dot: "bg-sky" },
  Bebidas: { bg: "bg-aqua/25", text: "text-aqua", dot: "bg-aqua" },
  Limpieza: { bg: "bg-grape/20", text: "text-grape", dot: "bg-grape" },
  "Frutas y verduras": { bg: "bg-lime/25", text: "text-lime", dot: "bg-lime" },
  Botanas: { bg: "bg-berry/20", text: "text-berry", dot: "bg-berry" },
  Otros: { bg: "bg-clay/15", text: "text-clay", dot: "bg-clay" },
};

const FALLBACK = { bg: "bg-soft", text: "text-stone", dot: "bg-stone" };

export function categoryStyle(category: string): { bg: string; text: string; dot: string } {
  return CATEGORY_STYLE[category] ?? FALLBACK;
}
