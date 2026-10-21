import { useState } from "react";
import { Camera, Check, Video, Star, Barcode, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui";
import { fileToJpeg, framesFromVideo } from "@/lib/images";
import { diffPantry, surprises } from "@/lib/match";
import { plural } from "@/lib/money";
import { isRestocked } from "@/lib/restock";
import { scanPantry } from "@/lib/scan.functions";
import { blankList, lineFromItem, usePantry } from "@/lib/store";
import { UNITS, type PantryItem, type ScanHit, type Unit, type PackageType } from "@/lib/types";
import type { Gap } from "@/lib/match";
import { BarcodeModal } from "@/components/barcode-modal";

const MAX_SHOTS = 4;

export function Escanear() {
  const items = usePantry((state) => state.items);
  const current = usePantry((state) => state.current);
  const openList = usePantry((state) => state.openList);
  const rememberScan = usePantry((state) => state.rememberScan);
  const upsertItem = usePantry((state) => state.upsertItem);
  const toast = usePantry((state) => state.toast);

  const [shots, setShots] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [gaps, setGaps] = useState<Gap[] | null>(null);
  const [extra, setExtra] = useState<ScanHit[]>([]);
  // Lo repuesto en la última compra ya está en casa: entra activado.
  const [seen, setSeen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.filter(isRestocked).map((item) => [item.id, true])),
  );
  const [pending, setPending] = useState<PantryItem[] | null>(null);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const restockedCount = items.filter(isRestocked).length;

  async function addImages(list: FileList | null) {
    if (!list?.length) return;
    const next = [...shots];
    for (const file of Array.from(list)) {
      if (next.length >= MAX_SHOTS) break;
      try {
        next.push(await fileToJpeg(file));
      } catch {
        toast("Esa foto no se pudo leer. Prueba con JPG o PNG.");
      }
    }
    if (shots.length + list.length > MAX_SHOTS) toast("Máximo 4 fotos por lectura.");
    setShots(next);
    setGaps(null);
  }

  async function addVideo(list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const frames = await framesFromVideo(file, MAX_SHOTS);
      setShots(frames.slice(0, MAX_SHOTS));
      setGaps(null);
    } catch {
      toast("No pude sacar cuadros de ese video.");
    } finally {
      setBusy(false);
    }
  }

  async function analyze() {
    if (!shots.length || busy) return;
    if (!items.length) {
      toast("Primero configura qué debe haber en tu despensa.");
      return;
    }
    setBusy(true);
    try {
      const result = await scanPantry({
        data: {
          images: shots,
          expected: items.map((item) => ({ name: item.name, brand: item.brand })),
        },
      });
      if (!result.ok) {
        toast(result.error);
        return;
      }
      const nextGaps = diffPantry(items, result.items);
      setGaps(nextGaps);
      setExtra(surprises(items, result.items));
      const present = nextGaps.filter((gap) => gap.status === "ok").length;
      rememberScan({
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        note: result.note || (result.items.length ? "Lectura lista." : "No reconocí productos claros."),
        hits: result.items,
        present,
        missing: nextGaps.length - present,
        missingIds: nextGaps.filter((gap) => gap.status !== "ok").map((gap) => gap.item.id),
      });
    } finally {
      setBusy(false);
    }
  }

  function askOrOpen(missing: PantryItem[]) {
    if (!missing.length) {
      toast("Con lo que marcaste, no falta nada.");
      return;
    }

    // Imprescindible: sort essentials first!
    const sortedMissing = [...missing].sort((a, b) => {
      if (a.isEssential && !b.isEssential) return -1;
      if (!a.isEssential && b.isEssential) return 1;
      return 0;
    });

    if (current && current.lines.length > 0) {
      setPending(sortedMissing);
      return;
    }
    commit(sortedMissing);
  }

  function commit(missing: PantryItem[]) {
    const list = blankList("scan", "Faltantes del escaneo");
    list.lines = missing.map((item) => lineFromItem(item));
    openList(list);
    setPending(null);
  }

  function fromManual() {
    const missing = items.filter((item) => !seen[item.id]);
    // Marcar a mano también es un escaneo: queda como última lectura y lo repuesto deja de contar aparte.
    rememberScan({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      note: "Revisión a mano: activaste lo que sí había.",
      hits: [],
      present: items.length - missing.length,
      missing: missing.length,
      missingIds: missing.map((item) => item.id),
    });
    askOrOpen(missing);
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
    upsertItem({
      id: crypto.randomUUID(),
      name: product.name,
      brand: product.brand,
      barcode: product.barcode,
      category: product.category || "Abarrotes",
      packageType: (product.packageType as PackageType) || "pieza",
      unit: (product.unit as Unit) || "pza",
      targetQty: product.targetQty || 1,
      usualPrice: product.usualPrice || 0,
      isEssential: false,
    });
    toast(`«${product.name}» agregado a la despensa desde código de barras.`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">📸 Escanear</h1>
          <p className="mt-1 text-sm leading-relaxed text-stone">
            Fotos o video de tu alacena. Los productos imprescindibles irán primero en tu lista.
          </p>
        </div>
        <Button
          variant="ghost"
          className="size-12 shrink-0 px-0"
          aria-label="Escanear código de barras de producto"
          onClick={() => setBarcodeOpen(true)}
        >
          <Barcode className="size-5" />
        </Button>
      </div>

      {restockedCount > 0 && (
        <p className="flex items-start gap-2 rounded-2xl bg-sage/10 p-3 text-sm leading-relaxed">
          <PackageCheck className="mt-0.5 size-4 shrink-0 text-sage" aria-hidden="true" />
          <span>
            {plural(restockedCount, "producto repuesto", "productos repuestos")} en tu última compra{" "}
            {restockedCount === 1 ? "cuenta" : "cuentan"} como en casa hasta esta lectura.
          </span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl bg-clay text-clay-ink transition-transform duration-150 active:scale-[0.96]">
          <Camera className="size-6" />
          <span className="text-sm font-medium">Fotos</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="sr-only"
            onChange={(event) => {
              void addImages(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
        <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl bg-soft transition-transform duration-150 active:scale-[0.96]">
          <Video className="size-6" />
          <span className="text-sm font-medium">Video</span>
          <input
            type="file"
            accept="video/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => {
              void addVideo(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      {shots.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {shots.map((shot, index) => (
            <button
              key={shot.slice(0, 48) + index}
              type="button"
              className="overflow-hidden rounded-2xl border border-line"
              onClick={() => setShots(shots.filter((_, shotIndex) => shotIndex !== index))}
              aria-label="Quitar foto"
            >
              <img src={shot} alt="" className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <Button className="w-full" disabled={!shots.length || busy} onClick={() => void analyze()}>
        {busy ? "Leyendo el estante…" : "Decirme qué falta"}
      </Button>

      {gaps && (
        <section className="card-pop p-4">
          <p className="text-sm font-medium">Comparado con tu despensa</p>
          <p className="mt-0.5 text-xs text-stone">
            Los imprescindibles se acomodarán arriba en tu lista.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {gaps.map((gap) => (
              <li key={gap.item.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-1.5">
                  {gap.item.isEssential && (
                    <Star className="size-3.5 fill-clay text-clay" />
                  )}
                  {gap.item.name}
                  {gap.item.brand ? <span className="text-stone"> · {gap.item.brand}</span> : null}
                </span>
                <span className={gap.status === "ok" ? "text-sage" : "text-clay"}>
                  {gap.status === "ok" ? "Está" : gap.status === "low" ? `Faltan ${gap.missingQty}` : "Falta"}
                </span>
              </li>
            ))}
          </ul>
          <Button
            className="mt-4 w-full"
            onClick={() =>
              askOrOpen(
                gaps
                  .filter((gap) => gap.status !== "ok")
                  .map((gap) => ({ ...gap.item, targetQty: gap.missingQty || gap.item.targetQty })),
              )
            }
          >
            Pasar faltantes a la lista
          </Button>
          {extra.length > 0 && (
            <div className="mt-4 border-t border-line pt-4">
              <p className="text-sm text-stone">Vi esto y no está en tu despensa</p>
              {extra.map((hit) => (
                <button
                  key={`${hit.name}-${hit.brand}`}
                  type="button"
                  className="mt-2 flex w-full items-center justify-between rounded-2xl bg-soft px-3 py-3 text-left text-sm"
                  onClick={() => {
                    const unit = UNITS.includes(hit.unit as Unit) ? (hit.unit as Unit) : "pza";
                    upsertItem({
                      id: crypto.randomUUID(),
                      name: hit.name,
                      brand: hit.brand,
                      category: "Otros",
                      targetQty: hit.quantity && hit.quantity > 0 ? hit.quantity : 1,
                      unit,
                      packageType: "pieza",
                      usualPrice: 0,
                    });
                    toast("Agregado a tu despensa. Ponle precio cuando quieras.");
                  }}
                >
                  <span>
                    {hit.name}
                    {hit.brand ? ` · ${hit.brand}` : ""}
                  </span>
                  <span className="text-clay">Agregar</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="rounded-3xl bg-soft p-4">
        <p className="text-sm font-medium">O márcalo tú</p>
        <p className="mt-1 text-sm text-stone">
          {restockedCount > 0
            ? "Activa lo que sí viste. Lo repuesto en tu última compra ya viene activado. Lo demás entra a la lista."
            : "Activa lo que sí viste. Lo demás entra a la lista."}
        </p>
        <ul className="mt-3 flex max-h-80 flex-col gap-2 overflow-y-auto">
          {items.map((item) => {
            const on = Boolean(seen[item.id]);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  onClick={() => setSeen({ ...seen, [item.id]: !on })}
                  className="flex h-12 w-full items-center justify-between rounded-2xl bg-card px-3 text-left text-sm transition-colors duration-150"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    {item.isEssential && <Star className="size-3 shrink-0 fill-clay text-clay" />}
                    <span className="truncate">{item.name}</span>
                    <span className="shrink-0 text-stone"> · {item.targetQty} {item.unit}</span>
                    {item.restockedAt && (
                      <span className="shrink-0 rounded-md bg-sage/15 px-1.5 py-0.5 text-[10px] font-semibold text-sage">
                        Repuesto
                      </span>
                    )}
                  </span>
                  <span
                    className={`flex size-7 items-center justify-center rounded-full transition-transform duration-200 ${
                      on ? "scale-100 bg-sage text-sage-ink" : "scale-90 bg-soft text-transparent"
                    }`}
                  >
                    <Check className="size-4" />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <Button variant="quiet" className="mt-3 w-full" onClick={fromManual} disabled={!items.length}>
          Armar lista con lo que no marqué
        </Button>
      </section>

      {pending && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40">
          <div className="safe-bottom w-full max-w-lg rounded-t-3xl bg-card p-5">
            <h2 className="font-display text-2xl">Ya hay una lista abierta</h2>
            <p className="mt-2 text-sm text-stone">¿La sustituyo con estos faltantes?</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button variant="quiet" onClick={() => setPending(null)}>
                Cancelar
              </Button>
              <Button onClick={() => commit(pending)}>Sustituir</Button>
            </div>
          </div>
        </div>
      )}

      <BarcodeModal
        isOpen={barcodeOpen}
        onClose={() => setBarcodeOpen(false)}
        onFound={handleBarcodeFound}
        title="Código de barras en el súper"
      />
    </div>
  );
}
