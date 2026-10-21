import { downloadExcel } from "@/lib/excel";
import { lineAmount, mxn, stamp } from "@/lib/money";
import { usePantry } from "@/lib/store";
import { Button } from "@/components/ui";

export function Guardadas() {
  const saved = usePantry((state) => state.saved);
  const reuseSaved = usePantry((state) => state.reuseSaved);
  const deleteSaved = usePantry((state) => state.deleteSaved);
  const startNew = usePantry((state) => state.startNew);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Guardadas</h1>
          <p className="mt-1 text-sm text-stone">Cada compra que guardaste o finalizaste.</p>
        </div>
      </div>
      {saved.length === 0 && (
        <div className="rounded-3xl bg-card p-5">
          <p className="text-sm text-stone">Todavía no hay listas guardadas.</p>
          <Button className="mt-4" onClick={() => startNew("manual")}>
            Empezar una
          </Button>
        </div>
      )}
      <ul className="flex flex-col gap-3">
        {saved.map((list) => {
          const total = list.lines.reduce((sum, line) => sum + lineAmount(line.qty, line.unitPrice), 0);
          return (
            <li key={list.id} className="rounded-3xl border border-line bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{list.title}</p>
                  <p className="mt-1 text-sm text-stone">
                    {list.status === "finished" ? "Finalizada" : "Guardada"} · {stamp(list.updatedAt)}
                  </p>
                </div>
                <p className="font-medium">{mxn(total)}</p>
              </div>
              <p className="mt-2 text-sm text-stone">{list.lines.length} productos</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <Button variant="quiet" className="px-2" onClick={() => reuseSaved(list.id)}>
                  Repetir
                </Button>
                <Button variant="ghost" className="px-2" onClick={() => downloadExcel(list)}>
                  Excel
                </Button>
                <Button variant="ghost" className="px-2" onClick={() => deleteSaved(list.id)}>
                  Quitar
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
