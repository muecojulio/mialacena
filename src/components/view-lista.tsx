import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button, TextField } from "@/components/ui";
import { downloadExcel } from "@/lib/excel";
import { lineAmount, mxn, parseMoney, parseQty } from "@/lib/money";
import { usePantry } from "@/lib/store";
import type { ListLine } from "@/lib/types";

function LineCard({ line }: { line: ListLine }) {
  const patchLine = usePantry((state) => state.patchLine);
  const removeLine = usePantry((state) => state.removeLine);
  const [qty, setQty] = useState(String(line.qty));
  const [price, setPrice] = useState(String(line.unitPrice));
  const amount = lineAmount(line.qty, line.unitPrice);

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

  return (
    <li
      className={`rounded-3xl border p-4 transition-colors duration-200 ${
        line.inCart ? "border-sage bg-card" : "border-line bg-card"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={line.inCart ? "font-medium line-through decoration-sage" : "font-medium"}>{line.name}</p>
          <p className="text-sm text-stone">{line.brand || "Sin marca"}</p>
        </div>
        <p className="font-medium">{mxn(amount)}</p>
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
        <span className="w-10 text-sm text-stone">{line.unit}</span>
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
        <span className="mb-1 block text-xs text-stone">Precio unitario</span>
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
  const startNew = usePantry((state) => state.startNew);
  const setView = usePantry((state) => state.setView);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);

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

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-16 z-10 -mx-5 bg-paper px-5 pb-3">
        <p className="text-sm text-stone">{current.title}</p>
        <p className="font-display text-4xl">{mxn(total)}</p>
        <p className="mt-1 text-sm text-stone">
          En el carrito {mxn(carried)} · {taken} de {current.lines.length}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="quiet" onClick={saveSnapshot}>
            Guardar
          </Button>
          <Button variant="ghost" onClick={() => downloadExcel(current)} disabled={!current.lines.length}>
            Excel
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              if (current.lines.length) setConfirmNew(true);
              else startNew("manual");
            }}
          >
            Nueva
          </Button>
          <Button variant="sage" onClick={() => setConfirmFinish(true)} disabled={!current.lines.length}>
            Finalizar
          </Button>
        </div>
      </div>

      {current.lines.length === 0 && (
        <p className="text-sm text-stone">Agrega productos o escanéala para llenarla con lo que falta.</p>
      )}

      <ul className="flex flex-col gap-3">
        {current.lines.map((line) => (
          <LineCard key={line.id} line={line} />
        ))}
      </ul>

      <form
        className="rounded-3xl bg-soft p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim().length < 2) return;
          const known = items.find(
            (item) => item.name.toLocaleLowerCase("es-MX") === name.trim().toLocaleLowerCase("es-MX"),
          );
          addLine({
            pantryItemId: known?.id ?? null,
            name: name.trim(),
            brand: known?.brand ?? "",
            unit: known?.unit ?? "pza",
            qty: known?.targetQty ?? 1,
            unitPrice: price ? parseMoney(price) : (known?.usualPrice ?? 0),
          });
          setName("");
          setPrice("");
        }}
      >
        <p className="mb-3 text-sm font-medium">Agregar a esta lista</p>
        <div className="flex flex-col gap-3">
          <TextField label="Producto" value={name} onChange={(event) => setName(event.target.value)} />
          <TextField
            label="Precio, si ya lo sabes"
            inputMode="decimal"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
          <Button type="submit" disabled={name.trim().length < 2}>
            Sumar producto
          </Button>
        </div>
      </form>

      {confirmFinish && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40">
          <div className="safe-bottom w-full max-w-lg rounded-t-3xl bg-card p-5">
            <h2 className="font-display text-2xl">Finalizar compra</h2>
            <p className="mt-2 text-sm text-stone">
              Se guarda en este teléfono con total {mxn(total)} y la lista queda libre para la siguiente.
            </p>
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
