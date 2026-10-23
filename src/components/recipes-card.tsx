import { useState } from "react";
import { ChefHat, ExternalLink, Loader2, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui";
import { dayKey } from "@/lib/dates";
import { plural } from "@/lib/money";
import { pantryIngredients, type PantryIngredient, type Recipe } from "@/lib/recipes";
import { suggestRecipes } from "@/lib/recipes.functions";
import { usePantry } from "@/lib/store";
import { cn } from "@/lib/cn";

function urgencyNote(row: PantryIngredient): string {
  if (row.daysLeft === null) return `Con ${row.item.name.toLocaleLowerCase("es-MX")}`;
  if (row.daysLeft < 0) return `${row.item.name} ya pasó su fecha: revisa antes de usar`;
  if (row.daysLeft === 0) return `${row.item.name} caduca hoy: úsalo primero`;
  if (row.daysLeft === 1) return `${row.item.name} caduca mañana: úsalo primero`;
  return `${row.item.name} caduca en ${row.daysLeft} días: úsalo primero`;
}

/**
 * «Cocina con tu despensa»: recetas públicas de TheMealDB a partir de lo que
 * sí hay en la alacena, empezando por lo que está por caducar. Los faltantes
 * de una receta se pueden pasar directo a la lista de compra.
 */
export function RecipesCard() {
  const items = usePantry((state) => state.items);
  const lastScan = usePantry((state) => state.lastScan);
  const addLine = usePantry((state) => state.addLine);
  const toast = usePantry((state) => state.toast);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [active, setActive] = useState<PantryIngredient | null>(null);

  const available = pantryIngredients(items, lastScan, dayKey());

  async function search(row: PantryIngredient) {
    setBusy(true);
    setError("");
    setActive(row);
    try {
      const result = await suggestRecipes({
        data: {
          ingredient: row.en,
          pantryEn: available.map((entry) => entry.en),
          pantryNames: available.map((entry) => entry.item.name),
        },
      });
      if (result.ok) {
        setRecipes(result.recipes);
        if (result.origin === "ai") {
          setError("");
        }
      } else {
        setRecipes(null);
        setError(result.error);
      }
    } catch {
      setRecipes(null);
      setError("Las recetas públicas no respondieron. Inténtalo en un momento.");
    } finally {
      setBusy(false);
    }
  }

  function addMissing(recipe: Recipe) {
    for (const missing of recipe.missing) {
      addLine({
        pantryItemId: null,
        name: missing.es,
        brand: "",
        unit: "pza",
        qty: 1,
        unitPrice: 0,
        category: "Otros",
        isExtra: true,
      });
    }
    toast(
      `${plural(recipe.missing.length, "faltante pasó", "faltantes pasaron")} a la lista para «${recipe.title}».`,
    );
  }

  return (
    <section className="card-pop p-5" aria-label="Cocina con tu despensa">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="section-title text-sm">
            <span className="icon-blob icon-clay size-8">
              <ChefHat className="size-4" />
            </span>
            Cocina con tu despensa
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-stone">
            Recetas públicas (TheMealDB) con lo que ya tienes, empezando por lo que caduca pronto.
          </p>
        </div>
        <Button
          className="h-10 shrink-0 text-xs"
          disabled={busy || available.length === 0}
          onClick={() => available[0] && void search(available[0])}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {busy ? "Buscando…" : "Buscar recetas"}
        </Button>
      </div>

      {available.length === 0 ? (
        <p className="mt-3 text-xs leading-relaxed text-stone">
          Cuando haya comida en la despensa (huevo, leche, arroz, atún…), aquí aparecen ideas para
          aprovecharla antes de que caduque.
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {available.slice(0, 8).map((row) => (
            <button
              key={row.en}
              type="button"
              disabled={busy}
              onClick={() => void search(row)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-transform active:scale-[0.96]",
                active?.en === row.en ? "bg-clay text-clay-ink" : "bg-soft text-ink",
              )}
            >
              {row.item.name}
              {row.daysLeft !== null && row.daysLeft <= 7 ? " · por caducar" : ""}
            </button>
          ))}
        </div>
      )}

      {active && !error && (
        <p className="mt-2.5 text-xs font-medium text-sage">{urgencyNote(active)}</p>
      )}
      {error && <p className="mt-2.5 text-xs leading-relaxed text-clay">{error}</p>}

      {recipes && (
        <ul className="mt-3 flex flex-col gap-2.5">
          {recipes.map((recipe) => (
            <li key={recipe.id} className="rounded-2xl bg-soft p-3">
              <div className="flex items-start gap-3">
                {recipe.thumb && (
                  <img
                    src={recipe.thumb}
                    alt={recipe.title}
                    loading="lazy"
                    className="size-14 shrink-0 rounded-xl border border-line object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{recipe.title}</p>
                  <p className="text-xs text-stone">
                    {[recipe.category, recipe.area].filter(Boolean).join(" · ") ||
                      "Receta pública"}
                    {recipe.origin === "ai" ? " · sugerida por IA" : ""}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-stone">
                    Ya tienes {recipe.have.length}
                    {recipe.missing.length > 0
                      ? ` · faltan: ${recipe.missing.map((m) => m.es).join(", ")}`
                      : " · no falta nada 🎉"}
                  </p>
                </div>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                {recipe.sourceUrl ? (
                  <a
                    href={recipe.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-card px-3 text-xs font-semibold text-ink transition-transform active:scale-[0.96]"
                  >
                    <ExternalLink className="size-3.5" />
                    Ver receta
                  </a>
                ) : (
                  <p className="inline-flex h-9 items-center justify-center rounded-xl bg-card px-3 text-center text-[11px] font-medium text-stone">
                    Idea para tu despensa
                  </p>
                )}
                <button
                  type="button"
                  disabled={recipe.missing.length === 0}
                  onClick={() => addMissing(recipe)}
                  className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-clay px-3 text-xs font-semibold text-clay-ink transition-transform active:scale-[0.96] disabled:opacity-40"
                >
                  <ShoppingCart className="size-3.5" />
                  Agregar faltantes
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2.5 text-[11px] text-stone">
        De TheMealDB solo viaja el ingrediente en inglés (p. ej. «egg»). Si ese servicio no
        responde, la app pide ideas con los nombres de tu despensa al lector de IA (solo si está
        configurado) y las marca como «sugerida por IA».
      </p>
    </section>
  );
}
