import { useEffect, useState } from "react";
import { ExternalLink, Leaf, Loader2, TriangleAlert } from "lucide-react";
import { getProductFacts } from "@/lib/facts.functions";
import { GRADE_COLORS, offWebUrl, type OffProduct } from "@/lib/off";
import { getPublicPrices } from "@/lib/prices.functions";
import type { PublicPriceSummary } from "@/lib/open-prices";
import { plural, stamp } from "@/lib/money";
import type { PantryItem } from "@/lib/types";

const NOVA_LABELS: Record<number, string> = {
  1: "Sin procesar (NOVA 1)",
  2: "Ingrediente culinario (NOVA 2)",
  3: "Procesado (NOVA 3)",
  4: "Ultraprocesado (NOVA 4)",
};

function GradeChip({ label, grade }: { label: string; grade: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold text-white"
      style={{ backgroundColor: GRADE_COLORS[grade] ?? "#888" }}
    >
      {label} {grade.toUpperCase()}
    </span>
  );
}

function money(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

/**
 * Ficha pública del producto (Open Food Facts + Open Prices), dentro del
 * editor de la despensa. Se trae sola cuando el producto tiene código de
 * barras; si el servicio no responde, enseña una nota y no estorba.
 */
export function FactsPanel({
  draft,
  onApply,
}: {
  draft: PantryItem;
  onApply: (product: OffProduct) => void;
}) {
  const barcode = draft.barcode ?? "";
  const facts = draft.facts?.code === barcode ? draft.facts : undefined;
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [prices, setPrices] = useState<PublicPriceSummary | null>(null);
  const [pricesBusy, setPricesBusy] = useState(false);
  const [pricesNote, setPricesNote] = useState("");

  useEffect(() => {
    setPrices(null);
    setPricesNote("");
    if (barcode.length < 5 || facts) return;
    let live = true;
    setLoading(true);
    setNote("");
    void getProductFacts({ data: { barcode } }).then((result) => {
      if (!live) return;
      setLoading(false);
      if (result.ok) onApply(result.product);
      else setNote(result.error);
    });
    return () => {
      live = false;
    };
    // onApply cambia con cada render del editor; solo importa código/ficha.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barcode, facts?.code]);

  if (barcode.length < 5) return null;

  async function loadPrices() {
    setPricesBusy(true);
    setPricesNote("");
    try {
      const result = await getPublicPrices({ data: { barcode } });
      if (result.ok) setPrices(result.summary);
      else setPricesNote(result.error);
    } catch {
      setPricesNote("Los precios públicos no respondieron.");
    } finally {
      setPricesBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-soft p-3.5" aria-label="Ficha pública del producto">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <Leaf className="size-3.5 text-sage" />
          Ficha pública · Open Food Facts
        </p>
        <a
          href={offWebUrl(barcode)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-stone underline-offset-2 hover:underline"
        >
          Ver o corregir
          <ExternalLink className="size-3" />
        </a>
      </div>

      {loading && (
        <p className="mt-2.5 flex items-center gap-2 text-xs text-stone">
          <Loader2 className="size-3.5 animate-spin" />
          Buscando la ficha de este código…
        </p>
      )}
      {!loading && note && <p className="mt-2.5 text-xs leading-relaxed text-stone">{note}</p>}

      {facts && (
        <div className="mt-3 flex flex-col gap-2.5">
          <div className="flex items-start gap-3">
            {facts.imageUrl && (
              <img
                src={facts.imageUrl}
                alt={draft.name || "Foto pública del producto"}
                loading="lazy"
                className="size-16 shrink-0 rounded-2xl border border-line bg-white object-contain"
              />
            )}
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex flex-wrap gap-1.5">
                {facts.nutriscore && <GradeChip label="Nutri-Score" grade={facts.nutriscore} />}
                {facts.ecoscore && <GradeChip label="Eco-Score" grade={facts.ecoscore} />}
                {facts.nova && (
                  <span className="inline-flex rounded-lg bg-card px-2 py-0.5 text-[11px] font-medium text-ink">
                    {NOVA_LABELS[facts.nova]}
                  </span>
                )}
              </div>
              {facts.quantityLabel && (
                <p className="text-xs text-stone">Presentación: {facts.quantityLabel}</p>
              )}
              <p className="text-[11px] text-stone">Ficha traída el {stamp(facts.fetchedAt)}</p>
            </div>
          </div>

          {facts.allergens && facts.allergens.length > 0 && (
            <p className="flex items-start gap-1.5 rounded-xl bg-clay/10 px-2.5 py-2 text-xs text-clay">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              <span>
                <strong>Alérgenos:</strong> {facts.allergens.join(", ")}.
              </span>
            </p>
          )}

          {facts.nutriments && (
            <div className="grid grid-cols-5 gap-1.5 text-center">
              {(
                [
                  ["kcal", facts.nutriments.kcal, ""],
                  ["Grasa", facts.nutriments.fat, " g"],
                  ["Azúcar", facts.nutriments.sugars, " g"],
                  ["Sal", facts.nutriments.salt, " g"],
                  ["Proteína", facts.nutriments.proteins, " g"],
                ] as const
              )
                .filter(([, value]) => value !== undefined)
                .map(([label, value, unit]) => (
                  <div key={label} className="rounded-xl bg-card px-1 py-1.5">
                    <p className="text-[11px] font-bold text-ink">
                      {value}
                      {unit}
                    </p>
                    <p className="text-[10px] text-stone">{label}/100</p>
                  </div>
                ))}
            </div>
          )}

          {facts.ingredients && (
            <details className="text-xs leading-relaxed text-stone">
              <summary className="cursor-pointer font-medium text-ink">Ingredientes</summary>
              <p className="mt-1">{facts.ingredients}</p>
            </details>
          )}
        </div>
      )}

      <div className="mt-3 border-t border-line pt-2.5">
        {prices ? (
          <p className="text-xs leading-relaxed text-stone">
            <strong className="text-ink">
              {plural(prices.count, "precio público", "precios públicos")} en {prices.currency}:
            </strong>{" "}
            mediana {money(prices.median, prices.currency)} (entre {money(prices.min, prices.currency)} y{" "}
            {money(prices.max, prices.currency)})
            {prices.latest?.place
              ? ` · último en ${prices.latest.place}${prices.latest.country ? ` (${prices.latest.country})` : ""}`
              : ""}
            . Es referencia mundial de Open Prices, no el precio de tu súper.
          </p>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-stone">{pricesNote || "Precios registrados por la comunidad (Open Prices)."}</p>
            <button
              type="button"
              onClick={() => void loadPrices()}
              disabled={pricesBusy}
              className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-card px-2.5 py-1.5 text-xs font-semibold text-ink transition-transform active:scale-[0.96] disabled:opacity-50"
            >
              {pricesBusy && <Loader2 className="size-3 animate-spin" />}
              Ver precios
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
