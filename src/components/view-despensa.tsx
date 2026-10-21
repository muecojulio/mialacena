import { useEffect, useState } from "react";
import { Plus, Trash2, Barcode, ShoppingCart, Calendar, Star, Sparkles, PackageCheck } from "lucide-react";
import { Button, SelectField, TextField } from "@/components/ui";
import { searchProducts } from "@/lib/catalog.functions";
import { shortDay } from "@/lib/dates";
import { mxn } from "@/lib/money";
import { SEED } from "@/lib/seed";
import { usePantry } from "@/lib/store";
import { CATEGORIES, UNITS, PACKAGE_TYPES, type PantryItem, type Unit, type PackageType } from "@/lib/types";
import { BarcodeModal } from "@/components/barcode-modal";

const emptyDraft = (): PantryItem => ({
  id: crypto.randomUUID(),
  name: "",
  brand: "",
  category: "Abarrotes",
  targetQty: 1,
  unit: "pza",
  usualPrice: 0,
  packageType: "pieza",
  isEssential: false,
});

export function Despensa() {
  const items = usePantry((state) => state.items);
  const upsertItem = usePantry((state) => state.upsertItem);
  const removeItem = usePantry((state) => state.removeItem);
  const removePreload = usePantry((state) => state.removePreload);
  const sendToShopList = usePantry((state) => state.sendToShopList);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [draft, setDraft] = useState<PantryItem | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmPreload, setConfirmPreload] = useState(false);
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
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

  const preloadIds = new Set(SEED.map((row) => row.id));
  const preloadCount = items.filter((item) => preloadIds.has(item.id)).length;

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
      packageType: draft.packageType || "pieza",
      isEssential: Boolean(draft.isEssential),
      expiresAt: draft.expiresAt || undefined,
    });
    setDraft(null);
    setHints([]);
  }

  function handleBarcodeFound(product: {
    name: string;
    brand: string;
    barcode: string;
    category?: string;
    packageType?: string;
    unit?: string;
    targetQty?: number;
    usualPrice?: number;
  }) {
    if (draft) {
      setDraft({
        ...draft,
        name: product.name || draft.name,
        brand: product.brand || draft.brand,
        barcode: product.barcode,
        category: product.category || draft.category,
        packageType: (product.packageType as PackageType) || draft.packageType,
      });
    } else {
      setDraft({
        ...emptyDraft(),
        name: product.name,
        brand: product.brand,
        barcode: product.barcode,
        category: product.category || "Abarrotes",
        packageType: (product.packageType as PackageType) || "pieza",
        unit: (product.unit as Unit) || "pza",
        targetQty: product.targetQty || 1,
        usualPrice: product.usualPrice || 0,
      });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Despensa</h1>
          <p className="mt-1 text-sm text-stone">Lo que siempre debería haber, con empaque y caducidad.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="size-12 shrink-0 px-0"
            aria-label="Escanear código de barras"
            onClick={() => setBarcodeModalOpen(true)}
          >
            <Barcode className="size-5" />
          </Button>
          <Button
            className="size-12 shrink-0 px-0"
            aria-label="Agregar producto"
            onClick={() => setDraft(emptyDraft())}
          >
            <Plus className="size-5" />
          </Button>
        </div>
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
          <li key={item.id} className="relative rounded-3xl border border-line bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setDraft(item)}>
                <div className="flex items-center gap-1.5">
                  <p className="font-medium">{item.name}</p>
                  {item.isEssential && (
                    <span className="inline-flex items-center gap-0.5 rounded-md bg-clay/10 px-1.5 py-0.5 text-[10px] font-semibold text-clay">
                      <Star className="size-3 fill-clay" /> Imprescindible
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-stone">
                  {item.brand || "Sin marca"} · {item.category}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-stone">
                  <span className="rounded-lg bg-soft px-2 py-1">
                    Despensa: {item.targetQty} {item.unit}
                  </span>
                  <span className="rounded-lg bg-soft px-2 py-1">
                    Compra: {item.packageType || "pieza"}
                  </span>
                  {item.expiresAt && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-soft px-2 py-1 text-stone">
                      <Calendar className="size-3" /> Vence: {item.expiresAt}
                    </span>
                  )}
                  {item.restockedAt && (
                    <span
                      className="inline-flex items-center gap-1 rounded-lg bg-sage/15 px-2 py-1 font-medium text-sage"
                      title="Lo trajiste en una compra finalizada: cuenta como en casa hasta el próximo escaneo."
                    >
                      <PackageCheck className="size-3" aria-hidden="true" /> Repuesto · {shortDay(item.restockedAt)}
                    </span>
                  )}
                </div>
              </button>

              <div className="text-right">
                <p className="text-sm font-medium">{mxn(item.usualPrice)}</p>
                {item.lastPrice !== undefined && item.lastPrice > 0 && (
                  <p className="text-[11px] text-stone">
                    Último pagado: {mxn(item.lastPrice)}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
              <button
                type="button"
                onClick={() => sendToShopList(item)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-clay/15 px-3 text-xs font-semibold text-clay transition-transform active:scale-[0.96]"
              >
                <ShoppingCart className="size-3.5" />
                ¡Se acabó! (a la lista)
              </button>

              {confirmId === item.id ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-xs text-stone"
                    onClick={() => setConfirmId(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="text-xs font-medium text-clay"
                    onClick={() => {
                      removeItem(item.id);
                      setConfirmId(null);
                    }}
                  >
                    Confirmar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-stone hover:text-ink"
                  onClick={() => setConfirmId(item.id)}
                >
                  <Trash2 className="size-3.5" />
                  Quitar
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {preloadCount > 0 && (
        <div className="rounded-3xl border border-line bg-card p-4">
          {confirmPreload ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-stone">
                Se quitarán {preloadCount} productos precargados. Tus productos propios se quedan.
              </p>
              <div className="flex gap-2">
                <Button variant="quiet" className="flex-1" onClick={() => setConfirmPreload(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => {
                    removePreload();
                    setConfirmPreload(false);
                  }}
                >
                  Quitar precarga
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="inline-flex h-11 w-full items-center justify-center gap-2 text-sm text-stone"
              onClick={() => setConfirmPreload(true)}
            >
              <Trash2 className="size-4" />
              Quitar precarga ({preloadCount})
            </button>
          )}
        </div>
      )}

      {draft && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40">
          <div className="safe-bottom max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl">Producto</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBarcodeModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-xl bg-soft px-2.5 py-1 text-xs font-medium text-stone"
                >
                  <Barcode className="size-3.5" />
                  Código
                </button>
                <button type="button" className="h-11 px-2 text-sm text-stone" onClick={() => setDraft(null)}>
                  Cerrar
                </button>
              </div>
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

              {/* Empaque: despensa habla en litros/kilos, la lista habla en cómo se compra */}
              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label="Empaque en tienda"
                  value={draft.packageType || "pieza"}
                  onChange={(event) => setDraft({ ...draft, packageType: event.target.value as PackageType })}
                >
                  {PACKAGE_TYPES.map((pkg) => (
                    <option key={pkg} value={pkg}>
                      {pkg}
                    </option>
                  ))}
                </SelectField>
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Cantidad en despensa"
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
                  label="Unidad despensa"
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

              {/* Caducidad */}
              <TextField
                label="Fecha de caducidad"
                type="date"
                value={draft.expiresAt || ""}
                onChange={(event) => setDraft({ ...draft, expiresAt: event.target.value })}
              />

              {/* Imprescindible */}
              <label className="flex cursor-pointer items-center justify-between rounded-2xl bg-soft p-3">
                <div>
                  <span className="text-sm font-medium">Imprescindible</span>
                  <p className="text-xs text-stone">No puede faltar. Va primero en el escaneo.</p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(draft.isEssential)}
                  onChange={(e) => setDraft({ ...draft, isEssential: e.target.checked })}
                  className="size-5 rounded border-line text-clay focus:ring-clay"
                />
              </label>

              <Button className="mt-2 w-full" onClick={saveDraft} disabled={draft.name.trim().length < 2}>
                Guardar en la despensa
              </Button>
            </div>
          </div>
        </div>
      )}

      <BarcodeModal
        isOpen={barcodeModalOpen}
        onClose={() => setBarcodeModalOpen(false)}
        onFound={handleBarcodeFound}
      />
    </div>
  );
}
