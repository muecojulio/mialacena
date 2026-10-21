import { useEffect, useState } from "react";
import {
  Barcode,
  Calendar,
  CalendarClock,
  Camera,
  Check,
  Clock,
  ImagePlus,
  LayoutList,
  Minus,
  Package,
  PackageCheck,
  Plus,
  Scale,
  ShoppingCart,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { BarcodeModal } from "@/components/barcode-modal";
import { FactsPanel } from "@/components/facts-panel";
import { Button, SelectField, TextField } from "@/components/ui";
import { searchProducts } from "@/lib/catalog.functions";
import { GRADE_COLORS, type OffProduct } from "@/lib/off";
import { cn } from "@/lib/cn";
import { dayKey, EXPIRY_SOON_DAYS, shortDay } from "@/lib/dates";
import { fileToProductPhoto } from "@/lib/images";
import { mxn, parseQty, plural } from "@/lib/money";
import {
  describePurchaseVsConsumption,
  filterExpiringItems,
  formatPurchaseEquivalence,
  summarizePantryComparison,
} from "@/lib/pantry-helpers";
import { SEED } from "@/lib/seed";
import { lineFromItem, usePantry } from "@/lib/store";
import {
  CATEGORIES,
  CONSUMPTION_UNITS,
  PACKAGE_TYPES,
  UNITS,
  type DespensaTab,
  type PackageType,
  type PantryItem,
  type PublicFacts,
  type Unit,
} from "@/lib/types";

const emptyDraft = (): PantryItem => ({
  id: crypto.randomUUID(),
  name: "",
  brand: "",
  category: "Abarrotes",
  targetQty: 1,
  currentQty: 1,
  unit: "pza",
  usualPrice: 0,
  packageType: "paquete",
  packageSize: 6,
  packageUnit: "piezas",
  isEssential: false,
});

export function Despensa() {
  const items = usePantry((state) => state.items);
  const lastScan = usePantry((state) => state.lastScan);
  const despensaTab = usePantry((state) => state.despensaTab);
  const setDespensaTab = usePantry((state) => state.setDespensaTab);
  const upsertItem = usePantry((state) => state.upsertItem);
  const removeItem = usePantry((state) => state.removeItem);
  const removePreload = usePantry((state) => state.removePreload);
  const sendToShopList = usePantry((state) => state.sendToShopList);
  const setItemCurrentQty = usePantry((state) => state.setItemCurrentQty);
  const setItemPhoto = usePantry((state) => state.setItemPhoto);
  const sendMissingFromComparisonToList = usePantry(
    (state) => state.sendMissingFromComparisonToList,
  );
  const markPantryReviewed = usePantry((state) => state.markPantryReviewed);
  const addLine = usePantry((state) => state.addLine);
  const toast = usePantry((state) => state.toast);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todas");
  const [compareFilter, setCompareFilter] = useState<"todos" | "faltan" | "completos">("todos");
  const [expiryWindowDays, setExpiryWindowDays] = useState<number>(EXPIRY_SOON_DAYS);
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

  // Datos para «Qué tengo ahora» vs. «Qué debería tener»
  const comparison = summarizePantryComparison(items, lastScan);
  const filteredComparisonRows = comparison.rows.filter((row) => {
    const blob = `${row.item.name} ${row.item.brand}`.toLocaleLowerCase("es-MX");
    if (query.trim() && !blob.includes(query.trim().toLocaleLowerCase("es-MX"))) return false;
    if (compareFilter === "faltan") return row.status !== "ok";
    if (compareFilter === "completos") return row.status === "ok";
    return true;
  });

  // Datos para Modo «Revisar caducidades»
  const todayStr = dayKey();
  const expiringRows = filterExpiringItems(items, todayStr, expiryWindowDays);
  const defaultExpiringCount = filterExpiringItems(items, todayStr, EXPIRY_SOON_DAYS).length;

  async function handleQuickPhotoUpload(itemId: string, file: File | undefined) {
    if (!file) return;
    try {
      const dataUrl = await fileToProductPhoto(file);
      setItemPhoto(itemId, dataUrl);
      toast("Foto del producto guardada en este teléfono.");
    } catch {
      toast("No se pudo procesar la foto. Intenta con otra imagen.");
    }
  }

  async function handleDraftPhotoUpload(file: File | undefined) {
    if (!file || !draft) return;
    try {
      const dataUrl = await fileToProductPhoto(file);
      setDraft({ ...draft, photo: dataUrl });
    } catch {
      toast("No se pudo procesar la foto. Intenta con otra imagen.");
    }
  }

  function saveDraft() {
    if (!draft || draft.name.trim().length < 2) return;
    upsertItem({
      ...draft,
      name: draft.name.trim(),
      brand: draft.brand.trim(),
      targetQty: draft.targetQty > 0 ? draft.targetQty : 1,
      currentQty:
        typeof draft.currentQty === "number" && draft.currentQty >= 0
          ? draft.currentQty
          : draft.targetQty > 0
            ? draft.targetQty
            : 1,
      usualPrice: draft.usualPrice >= 0 ? draft.usualPrice : 0,
      packageType: draft.packageType || "pieza",
      packageSize: draft.packageSize && draft.packageSize > 0 ? draft.packageSize : undefined,
      packageUnit:
        draft.packageSize && draft.packageSize > 0
          ? draft.packageUnit || draft.unit
          : undefined,
      isEssential: Boolean(draft.isEssential),
      expiresAt: draft.expiresAt || undefined,
      photo: draft.photo || undefined,
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
    packageSize?: number;
    packageUnit?: string;
    facts?: PublicFacts;
  }) {
    if (draft) {
      setDraft({
        ...draft,
        name: product.name || draft.name,
        brand: product.brand || draft.brand,
        barcode: product.barcode,
        category: product.category || draft.category,
        packageType: (product.packageType as PackageType) || draft.packageType,
        packageSize: product.packageSize ?? draft.packageSize,
        packageUnit: product.packageUnit ?? draft.packageUnit,
        facts: product.facts ?? draft.facts,
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
        currentQty: product.targetQty || 1,
        usualPrice: product.usualPrice || 0,
        packageSize: product.packageSize,
        packageUnit: product.packageUnit,
        facts: product.facts,
      });
    }
  }

  /** Al llegar la ficha pública: se guarda y solo rellena campos vacíos (no pisa lo que ya escribió la persona). */
  function applyFacts(product: OffProduct) {
    setDraft((prev) =>
      prev
        ? {
            ...prev,
            facts: product.facts,
            brand: prev.brand || product.brand,
            packageSize: prev.packageSize ?? product.packageSize,
            packageUnit: prev.packageUnit ?? product.packageUnit,
          }
        : prev,
    );
  }

  function handleSendAllExpiringToList() {
    if (expiringRows.length === 0) return;
    for (const row of expiringRows) {
      addLine(lineFromItem(row.item));
    }
    toast(
      `${plural(expiringRows.length, "producto por vencer pasó", "productos por vencer pasaron")} a la lista de compra.`,
    );
  }

  function handleClearExpiry(item: PantryItem) {
    const { expiresAt: _expiresAt, ...rest } = item;
    upsertItem(rest);
    toast(`Se quitó la fecha vencida de «${item.name}».`);
  }

  const tabs: { id: DespensaTab; label: string; badge?: number; icon: typeof LayoutList }[] = [
    { id: "catalogo", label: "Catálogo", badge: items.length, icon: LayoutList },
    {
      id: "comparar",
      label: "Tengo vs. Debería",
      badge: comparison.incompleteCount > 0 ? comparison.incompleteCount : undefined,
      icon: Scale,
    },
    {
      id: "caducidades",
      label: "Caducidades",
      badge: defaultExpiringCount > 0 ? defaultExpiringCount : undefined,
      icon: CalendarClock,
    },
  ];

  const draftEquivalence = draft ? formatPurchaseEquivalence(draft) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Despensa</h1>
          <p className="mt-1 text-sm text-stone">
            Fotos locales, compra vs. consumo, existencias y caducidades.
          </p>
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

      {/* Selector de modo: Catálogo | Qué tengo ahora vs. qué debería tener | Modo revisar caducidades */}
      <div
        role="tablist"
        aria-label="Modos de despensa"
        className="grid grid-cols-3 gap-1.5 rounded-2xl bg-soft p-1.5"
      >
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = despensaTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setDespensaTab(t.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition-colors",
                active ? "bg-card text-ink shadow-xs" : "text-stone hover:text-ink",
              )}
            >
              <div className="flex items-center gap-1">
                <Icon className="size-3.5 shrink-0" />
                <span className="truncate">{t.label}</span>
              </div>
              {t.badge !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 text-[10px] font-semibold",
                    t.id === "catalogo"
                      ? "bg-soft text-stone"
                      : "bg-clay/15 text-clay",
                  )}
                >
                  {t.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          MODO 1: CATÁLOGO DE DESPENSA (con fotos locales y compra vs. consumo)
         ===================================================================== */}
      {despensaTab === "catalogo" && (
        <>
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
            {shown.map((item) => {
              const unitInfo = describePurchaseVsConsumption(item);
              return (
                <li key={item.id} className="relative rounded-3xl border border-line bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* Miniatura de foto guardada localmente o botón rápido para agregarla */}
                    <div className="relative shrink-0">
                      {item.photo || item.facts?.imageUrl ? (
                        <button
                          type="button"
                          onClick={() => setDraft(item)}
                          className="group relative block overflow-hidden rounded-2xl border border-line"
                          title={
                            item.photo
                              ? "Editar producto o cambiar foto"
                              : "Foto pública de Open Food Facts — tocar para editar"
                          }
                        >
                          <img
                            src={item.photo ?? item.facts?.imageUrl}
                            alt={item.name}
                            loading={item.photo ? undefined : "lazy"}
                            className={item.photo ? "size-16 object-cover" : "size-16 bg-white object-contain"}
                          />
                        </button>
                      ) : (
                        <label
                          className="flex size-16 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl border border-dashed border-line bg-soft text-[10px] font-medium text-stone transition-colors hover:border-clay hover:text-clay"
                          title="Guardar foto del producto en este teléfono"
                        >
                          <Camera className="size-4" />
                          <span>Foto</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) => {
                              void handleQuickPhotoUpload(item.id, e.target.files?.[0]);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>

                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setDraft(item)}
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="font-medium">{item.name}</p>
                        {item.isEssential && (
                          <span className="inline-flex items-center gap-0.5 rounded-md bg-clay/10 px-1.5 py-0.5 text-[10px] font-semibold text-clay">
                            <Star className="size-3 fill-clay" /> Imprescindible
                          </span>
                        )}
                        {item.facts?.nutriscore && (
                          <span
                            className="inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white"
                            style={{ backgroundColor: GRADE_COLORS[item.facts.nutriscore] ?? "#888" }}
                            title="Nutri-Score según Open Food Facts"
                          >
                            Nutri-Score {item.facts.nutriscore.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-stone">
                        {item.brand || "Sin marca"} · {item.category}
                      </p>

                      {/* Unidades de compra vs. consumo claras */}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                        {unitInfo.equivalence ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-clay/10 px-2 py-1 font-medium text-clay">
                            <Package className="size-3" />
                            {unitInfo.equivalence}
                          </span>
                        ) : (
                          <span className="rounded-lg bg-soft px-2 py-1 text-stone">
                            Compra: {item.packageType || "pieza"}
                          </span>
                        )}
                        <span className="rounded-lg bg-soft px-2 py-1 text-stone">
                          Debería tener: {item.targetQty} {item.unit}
                        </span>
                        {typeof item.currentQty === "number" && (
                          <span
                            className={cn(
                              "rounded-lg px-2 py-1 font-medium",
                              item.currentQty >= item.targetQty
                                ? "bg-sage/15 text-sage"
                                : "bg-soft text-ink",
                            )}
                          >
                            Tengo ahora: {item.currentQty} {item.unit}
                          </span>
                        )}
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
                            <PackageCheck className="size-3" aria-hidden="true" /> Repuesto ·{" "}
                            {shortDay(item.restockedAt)}
                          </span>
                        )}
                      </div>
                    </button>

                    <div className="shrink-0 text-right">
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
              );
            })}
          </ul>

          {preloadCount > 0 && (
            <div className="rounded-3xl border border-line bg-card p-4">
              {confirmPreload ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm text-stone">
                    Se quitarán {preloadCount} productos precargados. Tus productos propios se
                    quedan.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="quiet"
                      className="flex-1"
                      onClick={() => setConfirmPreload(false)}
                    >
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
        </>
      )}

      {/* =====================================================================
          MODO 2: VISTA «QUÉ TENGO AHORA» VS. «QUÉ DEBERÍA TENER»
         ===================================================================== */}
      {despensaTab === "comparar" && (
        <div className="flex flex-col gap-4">
          <section className="rounded-3xl border border-line bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-xl">Qué tengo ahora vs. qué debería tener</h2>
                <p className="mt-1 text-xs text-stone">
                  Ajusta al vuelo cuánto tienes hoy en casa y compáralo con tu meta de despensa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => markPantryReviewed()}
                className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-soft px-2.5 py-1.5 text-xs font-medium text-sage transition-transform active:scale-[0.96]"
              >
                <Check className="size-3.5" />
                Marcar revisada
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-soft p-2.5">
                <p className="font-display text-2xl text-sage">{comparison.okCount}</p>
                <p className="text-[11px] text-stone">Completos</p>
              </div>
              <div className="rounded-2xl bg-soft p-2.5">
                <p className="font-display text-2xl text-ink">{comparison.lowCount}</p>
                <p className="text-[11px] text-stone">A medias / Bajos</p>
              </div>
              <div className="rounded-2xl bg-soft p-2.5">
                <p className="font-display text-2xl text-clay">{comparison.emptyCount}</p>
                <p className="text-[11px] text-stone">En cero</p>
              </div>
            </div>

            <Button
              className="mt-3 w-full"
              disabled={comparison.incompleteCount === 0}
              onClick={() => sendMissingFromComparisonToList()}
            >
              <ShoppingCart className="size-4" />
              {comparison.incompleteCount > 0
                ? `Pasar ${plural(comparison.incompleteCount, "faltante", "faltantes")} a la lista`
                : "Todo está completo en tu despensa"}
            </Button>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1.5">
              {(
                [
                  { id: "todos", label: `Todos (${comparison.rows.length})` },
                  { id: "faltan", label: `Me falta algo (${comparison.incompleteCount})` },
                  { id: "completos", label: `Completos (${comparison.okCount})` },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setCompareFilter(f.id)}
                  className={cn(
                    "h-9 rounded-full px-3 text-xs font-medium transition-colors",
                    compareFilter === f.id ? "bg-ink text-paper" : "bg-soft text-ink",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {filteredComparisonRows.length === 0 ? (
            <p className="rounded-3xl bg-card p-5 text-sm text-stone">
              No hay productos en este filtro.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {filteredComparisonRows.map((row) => {
                const {
                  item,
                  haveQty,
                  shouldHaveQty,
                  missingQty,
                  ratio,
                  status,
                  equivalence,
                  packagesToBuy,
                  packageWord,
                } = row;
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "rounded-3xl border bg-card p-4",
                      status === "ok" ? "border-line" : "border-clay/35",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {item.photo && (
                          <img
                            src={item.photo}
                            alt={item.name}
                            className="size-12 shrink-0 rounded-2xl border border-line object-cover"
                          />
                        )}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="font-medium">{item.name}</p>
                            {item.isEssential && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-clay/10 px-1.5 py-0.5 text-[10px] font-semibold text-clay">
                                <Star className="size-3 fill-clay" /> Imprescindible
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone">
                            {item.brand || "Sin marca"} · {item.category}
                          </p>
                          {equivalence && (
                            <p className="mt-1 text-xs font-medium text-clay">{equivalence}</p>
                          )}
                        </div>
                      </div>

                      <span
                        className={cn(
                          "shrink-0 rounded-xl px-2.5 py-1 text-xs font-semibold",
                          status === "ok"
                            ? "bg-sage/15 text-sage"
                            : status === "low"
                              ? "bg-clay/15 text-clay"
                              : "bg-clay text-clay-ink",
                        )}
                      >
                        {status === "ok"
                          ? "Completo"
                          : status === "low"
                            ? `Faltan ${missingQty} ${item.unit}`
                            : `Sin existencia (faltan ${missingQty} ${item.unit})`}
                      </span>
                    </div>

                    {/* Comparación lado a lado: QUÉ TENGO AHORA vs. QUÉ DEBERÍA TENER */}
                    <div className="mt-3 grid grid-cols-2 gap-2.5">
                      <div className="rounded-2xl bg-soft p-3">
                        <p className="text-[11px] font-medium text-stone">Qué tengo ahora</p>
                        <div className="mt-1.5 flex items-center justify-between gap-1">
                          <button
                            type="button"
                            aria-label={`Restar a ${item.name}`}
                            onClick={() => setItemCurrentQty(item.id, Math.max(0, haveQty - 1))}
                            className="flex size-8 items-center justify-center rounded-full bg-card text-ink transition-transform active:scale-[0.94]"
                          >
                            <Minus className="size-3.5" />
                          </button>
                          <p className="font-display text-xl">
                            {haveQty}{" "}
                            <span className="font-sans text-xs font-normal text-stone">
                              {item.unit}
                            </span>
                          </p>
                          <button
                            type="button"
                            aria-label={`Sumar a ${item.name}`}
                            onClick={() => setItemCurrentQty(item.id, haveQty + 1)}
                            className="flex size-8 items-center justify-center rounded-full bg-card text-ink transition-transform active:scale-[0.94]"
                          >
                            <Plus className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between rounded-2xl border border-line bg-paper p-3">
                        <p className="text-[11px] font-medium text-stone">Qué debería tener</p>
                        <p className="font-display mt-1.5 text-xl">
                          {shouldHaveQty}{" "}
                          <span className="font-sans text-xs font-normal text-stone">
                            {item.unit}
                          </span>
                        </p>
                        {missingQty > 0 && (
                          <p className="mt-1 text-[11px] text-clay">
                            Comprar: {packagesToBuy} {packageWord}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Barra de progreso */}
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-soft">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-200",
                          status === "ok" ? "bg-sage" : "bg-clay",
                        )}
                        style={{ width: `${Math.round(ratio * 100)}%` }}
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setItemCurrentQty(item.id, 0)}
                          className="rounded-lg bg-soft px-2.5 py-1 text-stone hover:text-ink"
                        >
                          En cero (0)
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemCurrentQty(item.id, shouldHaveQty)}
                          className="rounded-lg bg-soft px-2.5 py-1 text-stone hover:text-ink"
                        >
                           Ya está completo ({shouldHaveQty})
                        </button>
                      </div>

                      {missingQty > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            addLine(lineFromItem(item, packagesToBuy));
                            toast(`«${item.name}» (${packagesToBuy} ${packageWord}) a la lista.`);
                          }}
                          className="inline-flex items-center gap-1 rounded-xl bg-clay/15 px-2.5 py-1 font-semibold text-clay"
                        >
                          <ShoppingCart className="size-3" />A la lista
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* =====================================================================
          MODO 3: MODO «REVISAR CADUCIDADES» (lista filtrada solo de lo que vence pronto)
         ===================================================================== */}
      {despensaTab === "caducidades" && (
        <div className="flex flex-col gap-4">
          <section className="rounded-3xl border border-clay/30 bg-clay/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-clay" />
                  <h2 className="font-display text-xl text-ink">Modo revisar caducidades</h2>
                </div>
                <p className="mt-1 text-xs text-stone">
                  Lista filtrada solo con lo que vence pronto o ya venció, ordenada por urgencia.
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {[
                { days: 7, label: "Próximos 7 días" },
                { days: 15, label: "Próximos 15 días" },
                { days: 30, label: "Próximos 30 días" },
              ].map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => setExpiryWindowDays(opt.days)}
                  className={cn(
                    "h-9 rounded-full px-3 text-xs font-medium transition-colors",
                    expiryWindowDays === opt.days ? "bg-ink text-paper" : "bg-card text-ink",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {expiringRows.length > 0 && (
              <Button className="mt-3 w-full" onClick={handleSendAllExpiringToList}>
                <ShoppingCart className="size-4" />
                Pasar los {expiringRows.length} productos por vencer a la lista
              </Button>
            )}
          </section>

          {expiringRows.length === 0 ? (
            <div className="rounded-3xl border border-line bg-card p-5 text-center">
              <p className="font-medium text-sage">
                ¡Ningún producto vence en los próximos {expiryWindowDays} días!
              </p>
              <p className="mt-1 text-xs text-stone">
                Puedes registrar fechas de caducidad en cualquier producto desde el Catálogo.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {expiringRows.map(({ item, expiresAt, status, badgeText }) => {
                const eq = formatPurchaseEquivalence(item);
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "rounded-3xl border bg-card p-4",
                      status === "expired" || status === "today"
                        ? "border-clay/50"
                        : "border-line",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        {item.photo && (
                          <img
                            src={item.photo}
                            alt={item.name}
                            className="size-12 shrink-0 rounded-2xl border border-line object-cover"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-stone">
                            {item.brand || "Sin marca"} · {item.category}
                          </p>
                          <p className="mt-1 text-xs text-stone">
                            Fecha: <span className="font-medium text-ink">{expiresAt}</span>
                            {eq ? ` · ${eq}` : ""}
                          </p>
                        </div>
                      </div>

                      <span
                        className={cn(
                          "shrink-0 rounded-xl px-2.5 py-1 text-xs font-semibold",
                          status === "expired" || status === "today"
                            ? "bg-clay text-clay-ink"
                            : "bg-clay/15 text-clay",
                        )}
                      >
                        {badgeText}
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleClearExpiry(item)}
                          className="rounded-xl bg-soft px-3 py-1.5 text-xs font-medium text-stone hover:text-ink"
                        >
                          Ya se consumió / Quitar fecha
                        </button>
                        <button
                          type="button"
                          onClick={() => setDraft(item)}
                          className="rounded-xl bg-soft px-3 py-1.5 text-xs font-medium text-ink"
                        >
                          Cambiar fecha
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          addLine(lineFromItem(item));
                          toast(`«${item.name}» agregado a la lista para reponer.`);
                        }}
                        className="inline-flex items-center gap-1 rounded-xl bg-clay/15 px-3 py-1.5 text-xs font-semibold text-clay"
                      >
                        <ShoppingCart className="size-3.5" />
                        Comprar de nuevo
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* =====================================================================
          MODAL DE EDICIÓN / ALTA DE PRODUCTO
         ===================================================================== */}
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
                <button
                  type="button"
                  className="h-11 px-2 text-sm text-stone"
                  onClick={() => setDraft(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {/* Foto del producto guardada localmente */}
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-soft p-3">
                <div className="flex items-center gap-3">
                  {draft.photo ? (
                    <img
                      src={draft.photo}
                      alt={draft.name || "Foto del producto"}
                      className="size-16 rounded-2xl border border-line object-cover"
                    />
                  ) : (
                    <div className="flex size-16 items-center justify-center rounded-2xl border border-dashed border-line bg-card text-stone">
                      <ImagePlus className="size-6" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">Foto del producto</p>
                    <p className="text-xs text-stone">
                      Se guarda localmente en este teléfono y en tu respaldo.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="inline-flex cursor-pointer items-center justify-center gap-1 rounded-xl bg-card px-3 py-2 text-xs font-medium text-ink shadow-2xs">
                    <Camera className="size-3.5" />
                    <span>{draft.photo ? "Cambiar" : "Subir foto"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => {
                        void handleDraftPhotoUpload(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  {draft.photo && (
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, photo: undefined })}
                      className="inline-flex items-center justify-center gap-1 rounded-xl px-2 py-1 text-xs text-clay"
                    >
                      <X className="size-3" />
                      Quitar foto
                    </button>
                  )}
                </div>
              </div>

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
                          // Si la sugerencia trae código, la ficha pública se trae sola abajo.
                          barcode: hint.code || draft.barcode,
                          facts: hint.code && hint.code !== draft.barcode ? undefined : draft.facts,
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

              {/* Ficha pública OFF + precios Open Prices (solo con código de barras) */}
              <FactsPanel draft={draft} onApply={applyFacts} />

              <TextField
                label="Marca (opcional)"
                value={draft.brand}
                onChange={(event) => setDraft({ ...draft, brand: event.target.value })}
              />

              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label="Categoría"
                  value={draft.category}
                  onChange={(event) => setDraft({ ...draft, category: event.target.value })}
                >
                  {CATEGORIES.map((item) => (
                    <option key={item}>{item}</option>
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

              {/* Sección dedicada: Unidades de compra vs. consumo (ej. "1 paquete = 6 piezas") */}
              <div className="rounded-2xl border border-line bg-soft p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-ink">
                    Unidades de compra vs. consumo
                  </p>
                  {draftEquivalence && (
                    <span className="rounded-lg bg-clay/15 px-2 py-0.5 text-xs font-semibold text-clay">
                      {draftEquivalence}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] text-stone">
                  Aclara cómo lo compras en tienda y cuánto trae para consumir en casa (ej. 1 paquete = 6 piezas).
                </p>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <SelectField
                    label="1 empaque de"
                    value={draft.packageType || "pieza"}
                    onChange={(event) =>
                      setDraft({ ...draft, packageType: event.target.value as PackageType })
                    }
                  >
                    {PACKAGE_TYPES.map((pkg) => (
                      <option key={pkg} value={pkg}>
                        {pkg}
                      </option>
                    ))}
                  </SelectField>

                  <TextField
                    label="Trae (cant.)"
                    inputMode="decimal"
                    placeholder="Ej. 6"
                    value={draft.packageSize !== undefined ? String(draft.packageSize) : ""}
                    onChange={(event) => {
                      const raw = event.target.value.trim();
                      setDraft({
                        ...draft,
                        packageSize: raw ? parseQty(raw) : undefined,
                      });
                    }}
                  />

                  <SelectField
                    label="Unidad consumo"
                    value={draft.packageUnit || "piezas"}
                    onChange={(event) =>
                      setDraft({ ...draft, packageUnit: event.target.value })
                    }
                  >
                    {CONSUMPTION_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </SelectField>
                </div>
              </div>

              {/* Qué debería tener vs. Qué tengo ahora */}
              <div className="grid grid-cols-3 gap-2">
                <TextField
                  label="Debería tener"
                  inputMode="decimal"
                  value={String(draft.targetQty)}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      targetQty: Number(event.target.value.replace(",", ".")) || 0,
                    })
                  }
                />
                <TextField
                  label="Tengo ahora"
                  inputMode="decimal"
                  value={String(draft.currentQty ?? draft.targetQty)}
                  onChange={(event) => {
                    const num = Number(event.target.value.replace(",", "."));
                    setDraft({
                      ...draft,
                      currentQty: Number.isFinite(num) && num >= 0 ? num : 0,
                    });
                  }}
                />
                <SelectField
                  label="Unidad despensa"
                  value={draft.unit}
                  onChange={(event) =>
                    setDraft({ ...draft, unit: event.target.value as Unit })
                  }
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
                  <p className="text-xs text-stone">
                    No puede faltar. Va primero en el escaneo y en la lista.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(draft.isEssential)}
                  onChange={(e) => setDraft({ ...draft, isEssential: e.target.checked })}
                  className="size-5 rounded border-line text-clay focus:ring-clay"
                />
              </label>

              <Button
                className="mt-2 w-full"
                onClick={saveDraft}
                disabled={draft.name.trim().length < 2}
              >
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
