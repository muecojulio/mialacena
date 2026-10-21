import { useEffect, useState } from "react";
import {
  Minus,
  Pencil,
  Plus,
  Trash2,
  Share2,
  Receipt,
  Barcode,
  Hand,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Star,
  DollarSign,
  PackageCheck,
} from "lucide-react";
import { Button, TextField } from "@/components/ui";
import { categoryTotals, downloadExcel, SUPERMARKET_AISLE_ORDER } from "@/lib/excel";
import { lineAmount, mxn, parseMoney, parseQty, plural } from "@/lib/money";
import { formatLineConsumptionDetail } from "@/lib/pantry-helpers";
import { carriedPantryIds } from "@/lib/restock";
import { usePantry } from "@/lib/store";
import type { ListLine, PantryItem } from "@/lib/types";
import { shareViaWhatsApp } from "@/lib/whatsapp";
import { TicketModal } from "@/components/ticket-modal";
import { BarcodeModal } from "@/components/barcode-modal";
import { StoresCard } from "@/components/stores-card";

function LineCard({
  line,
  pantryItem,
  oneHanded,
}: {
  line: ListLine;
  pantryItem?: PantryItem;
  oneHanded: boolean;
}) {
  const patchLine = usePantry((state) => state.patchLine);
  const removeLine = usePantry((state) => state.removeLine);
  const [qty, setQty] = useState(String(line.qty));
  const [price, setPrice] = useState(String(line.unitPrice));
  const amount = lineAmount(line.qty, line.unitPrice);
  const consumptionDetail = pantryItem ? formatLineConsumptionDetail(pantryItem, line.qty) : null;

  useEffect(() => {
    setQty(String(line.qty));
  }, [line.qty]);

  useEffect(() => {
    setPrice(String(line.unitPrice));
  }, [line.unitPrice]);

  function commitQty(raw: string) {
    const next = parseQty(raw);
    setQty(String(next));
    patchLine(line.id, { qty: next });
  }

  function commitPrice(raw: string) {
    const next = parseMoney(raw);
    setPrice(String(next));
    patchLine(line.id, { unitPrice: next });
  }

  function step(delta: number) {
    const next = Math.max(1, Math.round((line.qty + delta) * 100) / 100);
    setQty(String(next));
    patchLine(line.id, { qty: next });
  }

  // Price difference indicator compared to last paid price
  const hasHistory = line.lastPaidPrice !== undefined && line.lastPaidPrice > 0;
  const priceDiff = hasHistory ? line.unitPrice - line.lastPaidPrice! : 0;
  const priceIncreased = priceDiff > 0.1;
  const priceDecreased = priceDiff < -0.1;

  if (oneHanded) {
    // Letras grandes en el súper: Modo de una sola mano: producto, cantidad y el botón de “ya lo llevo”. El resto se esconde.
    return (
      <li
        className={`rounded-3xl border-2 p-5 transition-colors duration-200 ${
          line.inCart ? "border-sage bg-sage/10 opacity-70" : "border-line bg-card shadow-sm"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          {pantryItem?.photo && (
            <img
              src={pantryItem.photo}
              alt={line.name}
              className="size-14 shrink-0 rounded-2xl border border-line object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className={`text-2xl font-bold tracking-tight ${line.inCart ? "line-through text-stone" : "text-ink"}`}>
              {line.name}
            </p>
            <p className="mt-1 text-base text-stone">
              {line.qty} {line.unit} {line.brand ? `· ${line.brand}` : ""}
            </p>
            {consumptionDetail && (
              <p className="mt-0.5 text-xs font-medium text-clay">{consumptionDetail}</p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => patchLine(line.id, { inCart: !line.inCart })}
          className={`mt-4 flex h-16 w-full items-center justify-center rounded-2xl text-lg font-bold shadow-md transition-all active:scale-[0.98] ${
            line.inCart
              ? "bg-sage text-sage-ink ring-4 ring-sage/20"
              : "bg-clay text-clay-ink hover:bg-clay/90"
          }`}
        >
          {line.inCart ? "✓ Ya lo llevo" : "Ya lo llevo"}
        </button>
      </li>
    );
  }

  return (
    <li
      className={`rounded-3xl border p-4 transition-colors duration-200 ${
        line.inCart ? "border-sage bg-card" : "border-line bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {pantryItem?.photo && (
            <img
              src={pantryItem.photo}
              alt={line.name}
              className="size-12 shrink-0 rounded-2xl border border-line object-cover"
            />
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className={line.inCart ? "font-medium line-through decoration-sage" : "font-medium"}>
                {line.name}
              </p>
              {line.isEssential && (
                <span className="inline-flex items-center gap-0.5 rounded bg-clay/10 px-1 py-0.5 text-[10px] font-semibold text-clay">
                  <Star className="size-3 fill-clay" /> Imprescindible
                </span>
              )}
              {line.isExtra && (
                <span className="inline-flex items-center rounded bg-stone/15 px-1.5 py-0.5 text-[10px] font-semibold text-stone">
                  Extra de visita
                </span>
              )}
            </div>
            <p className="text-sm text-stone">{line.brand || "Sin marca"}</p>

            {/* Unidades de compra vs. consumo (ej. "1 paquete = 6 piezas") */}
            {consumptionDetail && (
              <p className="mt-1 inline-block rounded-lg bg-clay/10 px-2 py-0.5 text-xs font-medium text-clay">
                {consumptionDetail}
              </p>
            )}

            {/* Lo que has pagado: Historial de precio y si subió */}
            {hasHistory && (
              <div className="mt-1 flex items-center gap-1 text-xs">
                <span className="text-stone">Antes: {mxn(line.lastPaidPrice!)}</span>
                {priceIncreased && (
                  <span className="inline-flex items-center font-medium text-clay">
                    <TrendingUp className="mr-0.5 size-3" /> Subió {mxn(priceDiff)}
                  </span>
                )}
                {priceDecreased && (
                  <span className="inline-flex items-center font-medium text-sage">
                    <TrendingDown className="mr-0.5 size-3" /> Bajó {mxn(Math.abs(priceDiff))}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-medium">{mxn(amount)}</p>
          <span className="text-xs text-stone">{line.unit}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          aria-label="Menos"
          className="flex size-11 items-center justify-center rounded-full bg-soft transition-transform duration-150 active:scale-[0.96]"
          onClick={() => step(-1)}
        >
          <Minus className="size-4" />
        </button>
        <label className="flex-1">
          <span className="sr-only">Cantidad de {line.name}</span>
          <input
            inputMode="decimal"
            value={qty}
            onChange={(event) => setQty(event.target.value)}
            onBlur={() => commitQty(qty)}
            className="h-11 w-full rounded-2xl border border-line bg-paper text-center text-base"
          />
        </label>
        <span className="w-12 text-center text-sm text-stone">{line.unit}</span>
        <button
          type="button"
          aria-label="Más"
          className="flex size-11 items-center justify-center rounded-full bg-soft transition-transform duration-150 active:scale-[0.96]"
          onClick={() => step(1)}
        >
          <Plus className="size-4" />
        </button>
      </div>

      <label className="mt-3 block">
        <span className="mb-1 block text-xs text-stone">Precio unitario / empaque</span>
        <input
          inputMode="decimal"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          onBlur={() => commitPrice(price)}
          className="h-11 w-full rounded-2xl border border-line bg-paper px-3 text-base"
        />
      </label>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => patchLine(line.id, { inCart: !line.inCart })}
          className={`h-12 flex-1 rounded-2xl text-sm font-medium transition-[scale,background-color] duration-150 active:scale-[0.96] ${
            line.inCart ? "bg-sage text-sage-ink" : "bg-soft text-ink"
          }`}
        >
          {line.inCart ? "Ya lo llevo" : "Aún no lo llevo"}
        </button>
        <button
          type="button"
          aria-label={`Quitar ${line.name}`}
          className="flex size-12 items-center justify-center rounded-2xl bg-soft"
          onClick={() => removeLine(line.id)}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </li>
  );
}

export function Lista() {
  const current = usePantry((state) => state.current);
  const items = usePantry((state) => state.items);
  const addLine = usePantry((state) => state.addLine);
  const saveSnapshot = usePantry((state) => state.saveSnapshot);
  const finishList = usePantry((state) => state.finishList);
  const renameCurrent = usePantry((state) => state.renameCurrent);
  const startNew = usePantry((state) => state.startNew);
  const setView = usePantry((state) => state.setView);
  const setSpendingBudget = usePantry((state) => state.setSpendingBudget);
  const applyTicketPrices = usePantry((state) => state.applyTicketPrices);
  const toast = usePantry((state) => state.toast);
  const oneHandedMode = usePantry((state) => state.oneHandedMode);
  const setOneHandedMode = usePantry((state) => state.setOneHandedMode);

  const [name, setName] = useState("");
  const [title, setTitle] = useState(current?.title ?? "");
  const [price, setPrice] = useState("");
  const [isExtra, setIsExtra] = useState(false);
  const [isEssential, setIsEssential] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const [budgetModal, setBudgetModal] = useState(false);
  const [budgetValue, setBudgetValue] = useState(String(current?.spendingBudget ?? ""));
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [groupByCategory, setGroupByCategory] = useState(true);

  // Re-sync when another list takes the slot
  useEffect(() => {
    setTitle(current?.title ?? "");
    setBudgetValue(current?.spendingBudget ? String(current.spendingBudget) : "");
  }, [current?.id, current?.title, current?.spendingBudget]);

  if (!current) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-display text-3xl">Lista</h1>
        <p className="text-sm leading-relaxed text-stone">
          Aquí marcas lo que ya llevas, la cantidad y el precio. El total se calcula solo.
        </p>
        <Button onClick={() => startNew("manual")}>Nueva lista</Button>
        <Button variant="quiet" onClick={() => setView("escanear")}>
          Escanear lo que falta
        </Button>
      </div>
    );
  }

  const total = current.lines.reduce((sum, line) => sum + lineAmount(line.qty, line.unitPrice), 0);
  const carried = current.lines
    .filter((line) => line.inCart)
    .reduce((sum, line) => sum + lineAmount(line.qty, line.unitPrice), 0);
  const taken = current.lines.filter((line) => line.inCart).length;
  // Al finalizar, esto queda como repuesto en la despensa
  const homeCount = carriedPantryIds(current, items).length;

  // Tope de gasto
  const budget = current.spendingBudget;
  const hasBudget = typeof budget === "number" && budget > 0;
  const remainingBudget = hasBudget ? budget - carried : null;
  const isBudgetExceeded = hasBudget && carried > budget;

  // Handle ticket items applied
  function handleTicketApplied(ticketItems: { name: string; price: number; qty?: number }[]) {
    const matched = applyTicketPrices(ticketItems);
    toast(`Se actualizaron ${matched} precios reales desde el ticket.`);
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
    addLine({
      pantryItemId: null,
      name: product.name,
      brand: product.brand,
      unit: product.packageType || product.unit || "pieza",
      qty: 1,
      unitPrice: product.usualPrice || 0,
      category: product.category || "Abarrotes",
      isExtra: false,
    });
    toast(`«${product.name}» agregado a la lista desde código de barras.`);
  }

  // Orden del súper: Agrupado por pasillos/categorías
  // Imprescindibles se colocan primero dentro de cada categoría o arriba
  const sortedLines = [...current.lines].sort((a, b) => {
    // First: Essentials vs non-essentials
    if (a.isEssential && !b.isEssential) return -1;
    if (!a.isEssential && b.isEssential) return 1;
    return 0;
  });

  const pantryById = new Map(items.map((it) => [it.id, it]));
  const catSubtotals = categoryTotals(current);
  const catSubtotalByName = new Map(catSubtotals.map((c) => [c.category, c]));

  // Group lines by category in supermarket aisle order
  const groupedByCategoryMap = new Map<string, ListLine[]>();
  for (const cat of SUPERMARKET_AISLE_ORDER) {
    const matching = sortedLines.filter((l) => (l.category || "Abarrotes") === cat);
    if (matching.length > 0) groupedByCategoryMap.set(cat, matching);
  }
  for (const line of sortedLines) {
    const cat = line.category || "Abarrotes";
    if (!groupedByCategoryMap.has(cat)) {
      groupedByCategoryMap.set(cat, []);
    }
    if (!(SUPERMARKET_AISLE_ORDER as readonly string[]).includes(cat)) {
      groupedByCategoryMap.get(cat)!.push(line);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Sticky Header with Totals and Budget */}
      <div className="sticky top-16 z-10 -mx-5 bg-paper px-5 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Pencil className="size-3.5 shrink-0 text-stone" aria-hidden="true" />
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => renameCurrent(title)}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
              className="w-full truncate rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-sm text-stone focus:border-line focus:bg-card"
            />
          </div>

          {/* Toggle Modo una sola mano (Letras grandes) */}
          <button
            type="button"
            onClick={() => setOneHandedMode(!oneHandedMode)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold transition-colors ${
              oneHandedMode
                ? "bg-clay text-clay-ink"
                : "bg-soft text-stone hover:text-ink"
            }`}
            title="Letras grandes en el súper (modo de una sola mano)"
          >
            <Hand className="size-3.5" />
            {oneHandedMode ? "Modo normal" : "Modo súper"}
          </button>
        </div>

        {/* Total and Budget Banner */}
        <div className="mt-2 flex items-baseline justify-between">
          <div>
            <p className="font-display text-4xl">{mxn(total)}</p>
            <p className="mt-1 text-sm text-stone">
              En el carrito {mxn(carried)} · {taken} de {current.lines.length}
            </p>
          </div>

          {/* Tope de gasto display */}
          <div className="text-right">
            {hasBudget ? (
              <button
                type="button"
                onClick={() => setBudgetModal(true)}
                className={`rounded-2xl p-2.5 text-right transition-colors ${
                  isBudgetExceeded ? "bg-red-500/15 text-red-600 dark:text-red-400" : "bg-soft text-ink"
                }`}
              >
                <p className="text-[11px] font-medium text-stone">Tope de gasto</p>
                <p className={`text-base font-bold ${isBudgetExceeded ? "text-red-600 dark:text-red-400" : "text-ink"}`}>
                  {isBudgetExceeded ? `Te pasas por ${mxn(carried - budget!)}` : `Te queda ${mxn(remainingBudget!)}`}
                </p>
                <p className="text-[10px] text-stone">Máximo: {mxn(budget!)}</p>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setBudgetModal(true)}
                className="inline-flex items-center gap-1 rounded-xl bg-soft px-3 py-1.5 text-xs text-stone hover:text-ink"
              >
                <DollarSign className="size-3.5" />
                Fijar tope
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons: WhatsApp, Ticket, Barcode, etc. */}
        <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-4">
          <Button
            variant="ghost"
            className="flex h-11 flex-col items-center justify-center p-1 text-[11px]"
            onClick={() => shareViaWhatsApp(current)}
            title="Enviar por WhatsApp al chat de la casa"
          >
            <Share2 className="size-4 text-sage" />
            <span>WhatsApp</span>
          </Button>

          <Button
            variant="ghost"
            className="flex h-11 flex-col items-center justify-center p-1 text-[11px]"
            onClick={() => setTicketModalOpen(true)}
            title="Ticket con foto para llenar precios reales pagados"
          >
            <Receipt className="size-4 text-clay" />
            <span>Ticket</span>
          </Button>

          <Button
            variant="ghost"
            className="flex h-11 flex-col items-center justify-center p-1 text-[11px]"
            onClick={() => setBarcodeModalOpen(true)}
            title="Escanear código de barras en el súper"
          >
            <Barcode className="size-4" />
            <span>Código</span>
          </Button>

          <Button
            variant="ghost"
            className="flex h-11 flex-col items-center justify-center p-1 text-[11px]"
            onClick={() => setGroupByCategory(!groupByCategory)}
            title="Agrupar por categorías de pasillos del súper"
          >
            <Sparkles className="size-4 text-stone" />
            <span>{groupByCategory ? "Pasillos" : "Plana"}</span>
          </Button>
        </div>

        {/* Secondary controls */}
        <div className="mt-2 grid grid-cols-4 gap-2">
          <Button variant="quiet" className="h-10 text-xs" onClick={saveSnapshot}>
            Guardar
          </Button>
          <Button
            variant="ghost"
            className="h-10 text-xs"
            onClick={() => downloadExcel(current)}
            disabled={!current.lines.length}
          >
            Excel
          </Button>
          <Button
            variant="ghost"
            className="h-10 text-xs"
            onClick={() => {
              if (current.lines.length) setConfirmNew(true);
              else startNew("manual");
            }}
          >
            Nueva
          </Button>
          <Button
            variant="sage"
            className="h-10 text-xs"
            onClick={() => setConfirmFinish(true)}
            disabled={!current.lines.length}
          >
            Finalizar
          </Button>
        </div>
      </div>

      {/* ¿Dónde compro? Súpers cercanos (OpenStreetMap, sin llave) */}
      {!oneHandedMode && <StoresCard />}

      {current.lines.length === 0 && (
        <p className="text-sm text-stone">Agrega productos o escanéala para llenarla con lo que falta.</p>
      )}

      {/* Total por categoría en la lista */}
      {catSubtotals.length > 0 && !oneHandedMode && (
        <section className="rounded-3xl border border-line bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold tracking-wide text-stone uppercase">
              Total por categoría
            </p>
            <span className="text-xs text-stone">{catSubtotals.length} categorías</span>
          </div>
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {catSubtotals.map((cat) => (
              <li
                key={cat.category}
                className="flex items-center justify-between rounded-2xl bg-soft px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">{cat.category}</span>
                  <span className="text-stone">({cat.count} art.)</span>
                </div>
                <div className="flex items-center gap-2.5 text-right">
                  {cat.carried > 0 && (
                    <span className="text-sage">Carrito: {mxn(cat.carried)}</span>
                  )}
                  <span className="font-semibold text-ink">{mxn(cat.total)}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Lines display: Grouped by category (Orden del súper) or Flat */}
      {groupByCategory ? (
        <div className="flex flex-col gap-6">
          {Array.from(groupedByCategoryMap.entries()).map(([category, lines]) => {
            const sub = catSubtotalByName.get(category);
            return (
              <div key={category} className="flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-line pb-1.5">
                  <h3 className="font-display text-lg font-medium">{category}</h3>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-stone">{lines.length} art.</span>
                    {sub && (
                      <span className="rounded-lg bg-soft px-2 py-0.5 font-semibold text-ink">
                        {mxn(sub.total)}
                      </span>
                    )}
                  </div>
                </div>
                <ul className="flex flex-col gap-3">
                  {lines.map((line) => (
                    <LineCard
                      key={line.id}
                      line={line}
                      pantryItem={line.pantryItemId ? pantryById.get(line.pantryItemId) : undefined}
                      oneHanded={oneHandedMode}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {sortedLines.map((line) => (
            <LineCard
              key={line.id}
              line={line}
              pantryItem={line.pantryItemId ? pantryById.get(line.pantryItemId) : undefined}
              oneHanded={oneHandedMode}
            />
          ))}
        </ul>
      )}

      {/* Agregar a esta lista (Manual or Extras de visita) */}
      {!oneHandedMode && (
        <form
          className="rounded-3xl bg-soft p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (name.trim().length < 2) return;
            const known = items.find(
              (item) => item.name.toLocaleLowerCase("es-MX") === name.trim().toLocaleLowerCase("es-MX"),
            );
            addLine({
              pantryItemId: isExtra ? null : (known?.id ?? null),
              name: name.trim(),
              brand: known?.brand ?? "",
              unit: known?.packageType || known?.unit || "pieza",
              qty: known?.targetQty ?? 1,
              unitPrice: price ? parseMoney(price) : (known?.usualPrice ?? 0),
              isEssential: isEssential || known?.isEssential,
              isExtra,
              category: known?.category || "Abarrotes",
              lastPaidPrice: known?.lastPrice,
            });
            setName("");
            setPrice("");
            setIsExtra(false);
            setIsEssential(false);
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium">Agregar a esta lista</p>
            <button
              type="button"
              onClick={() => setBarcodeModalOpen(true)}
              className="inline-flex items-center gap-1 text-xs text-clay"
            >
              <Barcode className="size-3.5" />
              Por código
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <TextField label="Producto" value={name} onChange={(event) => setName(event.target.value)} />
            <TextField
              label="Precio, si ya lo sabes"
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />

            {/* Checkboxes: Extras de visita & Imprescindible */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-card p-2 text-xs">
                <input
                  type="checkbox"
                  checked={isExtra}
                  onChange={(e) => setIsExtra(e.target.checked)}
                  className="size-4 rounded border-line text-clay"
                />
                <div>
                  <span className="font-medium">Extra de visita</span>
                  <p className="text-[10px] text-stone">Solo para esta compra</p>
                </div>
              </label>

              <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-card p-2 text-xs">
                <input
                  type="checkbox"
                  checked={isEssential}
                  onChange={(e) => setIsEssential(e.target.checked)}
                  className="size-4 rounded border-line text-clay"
                />
                <div>
                  <span className="font-medium">Imprescindible</span>
                  <p className="text-[10px] text-stone">No puede faltar</p>
                </div>
              </label>
            </div>

            <Button type="submit" disabled={name.trim().length < 2}>
              Sumar producto
            </Button>
          </div>
        </form>
      )}

      {/* Modal Tope de Gasto */}
      {budgetModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-4">
          <div className="safe-bottom w-full max-w-sm rounded-t-3xl bg-card p-5 sm:rounded-3xl">
            <h2 className="font-display text-xl">Tope de gasto</h2>
            <p className="mt-1 text-xs text-stone">
              Pones un máximo y, conforme marcas “ya lo llevo”, ves cuánto te queda. Si te pasas, el total cambia de color.
            </p>
            <div className="mt-4">
              <TextField
                label="Monto máximo en MXN"
                inputMode="decimal"
                value={budgetValue}
                placeholder="Ej. 1500"
                onChange={(e) => setBudgetValue(e.target.value)}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                variant="quiet"
                onClick={() => {
                  setSpendingBudget(null);
                  setBudgetModal(false);
                }}
              >
                Sin tope
              </Button>
              <Button
                variant="sage"
                onClick={() => {
                  const b = parseMoney(budgetValue);
                  setSpendingBudget(b > 0 ? b : null);
                  setBudgetModal(false);
                }}
              >
                Guardar tope
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket con Foto Modal */}
      <TicketModal
        isOpen={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        onApply={handleTicketApplied}
      />

      {/* Barcode Modal */}
      <BarcodeModal
        isOpen={barcodeModalOpen}
        onClose={() => setBarcodeModalOpen(false)}
        onFound={handleBarcodeFound}
        title="Sumar a la lista por código"
      />

      {confirmFinish && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40">
          <div className="safe-bottom w-full max-w-lg rounded-t-3xl bg-card p-5">
            <h2 className="font-display text-2xl">Finalizar compra</h2>
            <p className="mt-2 text-sm text-stone">
              Se guarda en este teléfono con total {mxn(total)}. Los precios pagados se guardarán para actualizar tus costos habituales.
            </p>
            {homeCount > 0 ? (
              <p className="mt-3 flex items-start gap-2 rounded-2xl bg-sage/10 p-3 text-sm leading-relaxed">
                <PackageCheck className="mt-0.5 size-4 shrink-0 text-sage" aria-hidden="true" />
                <span>
                  <span className="font-medium">Ya en casa: {plural(homeCount, "producto", "productos")}.</span>{" "}
                  Lo que marcaste como llevado cuenta como repuesto en tu despensa hasta el próximo escaneo.
                </span>
              </p>
            ) : (
              <p className="mt-3 rounded-2xl bg-soft p-3 text-sm leading-relaxed text-stone">
                No marcaste como llevado nada de tu despensa, así que se queda igual.
              </p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button variant="quiet" onClick={() => setConfirmFinish(false)}>
                Seguir
              </Button>
              <Button
                variant="sage"
                onClick={() => {
                  setConfirmFinish(false);
                  finishList();
                }}
              >
                Finalizar
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmNew && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40">
          <div className="safe-bottom w-full max-w-lg rounded-t-3xl bg-card p-5">
            <h2 className="font-display text-2xl">Nueva lista</h2>
            <p className="mt-2 text-sm text-stone">La actual se reemplaza. Guárdala antes si la quieres conservar.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button variant="quiet" onClick={() => setConfirmNew(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  setConfirmNew(false);
                  startNew("manual");
                }}
              >
                Empezar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
