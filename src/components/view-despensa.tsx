import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, SelectField, TextField } from "@/components/ui";
import { searchProducts } from "@/lib/catalog.functions";
import { mxn } from "@/lib/money";
import { usePantry } from "@/lib/store";
import { CATEGORIES, UNITS, type PantryItem, type Unit } from "@/lib/types";

const emptyDraft = (): PantryItem => ({
  id: crypto.randomUUID(),
  name: "",
  brand: "",
  category: "Abarrotes",
  targetQty: 1,
  unit: "pza",
  usualPrice: 0,
});

export function Despensa() {
  const items = usePantry((state) => state.items);
  const upsertItem = usePantry((state) => state.upsertItem);
  const removeItem = usePantry((state) => state.removeItem);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [draft, setDraft] = useState<PantryItem | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [hints, setHints] = useState<{ code: string; name: string; brand: string }[]>([]);
  const [hintNote, setHintNote] = useState("");

  const name = draft?.name ?? "";

  useEffect(() => {
    if (!draft || name.trim().length < 3) {
      setHints([]);
      setHintNote("");
      return;
    }
    let live = true;
    const timer = window.setTimeout(async () => {
      const result = await searchProducts({ data: { query: name.trim() } });
      if (!live) return;
      if (result.ok) {
        setHints(result.products);
        setHintNote(result.products.length ? "" : "Sin coincidencias en el catálogo público.");
      } else {
        setHints([]);
        setHintNote(result.error);
      }
    }, 450);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [name, draft]);

  const shown = items.filter((item) => {
    const blob = `${item.name} ${item.brand}`.toLocaleLowerCase("es-MX");
    const matchesQuery = blob.includes(query.trim().toLocaleLowerCase("es-MX"));
    const matchesCategory = category === "Todas" || item.category === category;
    return matchesQuery && matchesCategory;
  });

  function saveDraft() {
    if (!draft || draft.name.trim().length < 2) return;
    upsertItem({
      ...draft,
      name: draft.name.trim(),
      brand: draft.brand.trim(),
      targetQty: draft.targetQty > 0 ? draft.targetQty : 1,
      usualPrice: draft.usualPrice >= 0 ? draft.usualPrice : 0,
    });
    setDraft(null);
    setHints([]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Despensa</h1>
          <p className="mt-1 text-sm text-stone">Lo que siempre debería haber, con marca si quieres.</p>
        </div>
        <Button className="size-12 shrink-0 px-0" aria-label="Agregar producto" onClick={() => setDraft(emptyDraft())}>
          <Plus className="size-5" />
        </Button>
      </div>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar en tu despensa"
        className="h-12 w-full rounded-2xl border border-line bg-card px-4 text-base"
      />

      <div className="flex flex-wrap gap-2">
        {["Todas", ...CATEGORIES].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={`h-10 rounded-full px-3 text-sm transition-colors duration-150 ${
              category === item ? "bg-ink text-paper" : "bg-soft text-ink"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {shown.length === 0 && (
        <p className="rounded-3xl bg-card p-5 text-sm text-stone">
          Nada en esta vista. Agrega lo que tu alacena debe tener.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {shown.map((item) => (
          <li key={item.id} className="rounded-3xl border border-line bg-card p-4">
            <button type="button" className="w-full text-left" onClick={() => setDraft(item)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="mt-1 text-sm text-stone">
                    {item.brand || "Sin marca"} · {item.category}
                  </p>
                </div>
                <p className="text-sm font-medium">{mxn(item.usualPrice)}</p>
              </div>
              <p className="mt-3 text-sm text-stone">
                Debe haber {item.targetQty} {item.unit}
              </p>
            </button>
            {confirmId === item.id ? (
              <div className="mt-3 flex gap-2">
                <Button variant="quiet" className="flex-1" onClick={() => setConfirmId(null)}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => {
                    removeItem(item.id);
                    setConfirmId(null);
                  }}
                >
                  Quitar
                </Button>
              </div>
            ) : (
              <button
                type="button"
                className="mt-3 inline-flex h-11 items-center gap-2 text-sm text-stone"
                onClick={() => setConfirmId(item.id)}
              >
                <Trash2 className="size-4" />
                Quitar de la despensa
              </button>
            )}
          </li>
        ))}
      </ul>

      {draft && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40">
          <div className="safe-bottom max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl">Producto</h2>
              <button type="button" className="h-11 px-2 text-sm text-stone" onClick={() => setDraft(null)}>
                Cerrar
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <TextField
                label="Nombre"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
              {hints.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-stone">Catálogo público Open Food Facts</p>
                  {hints.map((hint) => (
                    <button
                      key={`${hint.code}-${hint.name}`}
                      type="button"
                      className="rounded-2xl bg-soft px-3 py-3 text-left text-sm transition-transform duration-150 active:scale-[0.96]"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          name: hint.name,
                          brand: hint.brand || draft.brand,
                        })
                      }
                    >
                      <span className="font-medium">{hint.name}</span>
                      {hint.brand && <span className="text-stone"> · {hint.brand}</span>}
                    </button>
                  ))}
                </div>
              )}
              {hintNote && <p className="text-xs text-stone">{hintNote}</p>}
              <TextField
                label="Marca (opcional)"
                value={draft.brand}
                onChange={(event) => setDraft({ ...draft, brand: event.target.value })}
              />
              <SelectField
                label="Categoría"
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value })}
              >
                {CATEGORIES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </SelectField>
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Cantidad"
                  inputMode="decimal"
                  value={String(draft.targetQty)}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      targetQty: Number(event.target.value.replace(",", ".")) || 0,
                    })
                  }
                />
                <SelectField
                  label="Unidad"
                  value={draft.unit}
                  onChange={(event) => setDraft({ ...draft, unit: event.target.value as Unit })}
                >
                  {UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </SelectField>
              </div>
              <TextField
                label="Precio habitual MXN"
                inputMode="decimal"
                value={String(draft.usualPrice)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    usualPrice: Number(event.target.value.replace(",", ".")) || 0,
                  })
                }
              />
              <Button className="mt-2 w-full" onClick={saveDraft} disabled={draft.name.trim().length < 2}>
                Guardar en la despensa
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
