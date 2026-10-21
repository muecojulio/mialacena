import { Link } from "@tanstack/react-router";
import { ChevronRight, Shield, Smartphone } from "lucide-react";
import { Button } from "@/components/ui";
import { lineAmount, mxn, stamp } from "@/lib/money";
import { usePantry } from "@/lib/store";

function installApp() {
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const url = new URL(window.location.href);
  url.searchParams.set("install", "1");
  url.searchParams.set("platform", ios ? "ios" : "android");
  window.location.assign(url.toString());
}

export function Hoy() {
  const items = usePantry((state) => state.items);
  const lastScan = usePantry((state) => state.lastScan);
  const current = usePantry((state) => state.current);
  const setView = usePantry((state) => state.setView);
  const total = current?.lines.reduce((sum, line) => sum + lineAmount(line.qty, line.unitPrice), 0) ?? 0;
  const carried = current?.lines.filter((line) => line.inCart).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-3xl bg-card p-5">
        <p className="text-sm text-stone">Despensa configurada</p>
        <p className="font-display mt-1 text-4xl">{items.length}</p>
        <p className="mt-1 text-sm text-stone">productos que tu alacena debería tener</p>
        <Button className="mt-5 w-full" onClick={() => setView("escanear")}>
          Escanear alacena
        </Button>
      </section>

      <section className="rounded-3xl border border-line bg-card p-5">
        <p className="text-sm font-medium">Última lectura</p>
        {lastScan ? (
          <>
            <p className="mt-2 text-sm text-stone">{stamp(lastScan.at)}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-soft p-4">
                <p className="text-xs text-stone">Vistos</p>
                <p className="font-display mt-1 text-3xl">{lastScan.present}</p>
              </div>
              <div className="rounded-2xl bg-soft p-4">
                <p className="text-xs text-stone">Faltan</p>
                <p className="font-display mt-1 text-3xl text-clay">{lastScan.missing}</p>
              </div>
            </div>
            {lastScan.note && <p className="mt-4 text-sm leading-relaxed text-ink">{lastScan.note}</p>}
          </>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-stone">
            Todavía no hay una foto. Puedes escanear o marcar a mano lo que sí está en el estante.
          </p>
        )}
      </section>

      <button
        type="button"
        onClick={() => setView(current ? "lista" : "lista")}
        className="rounded-3xl border border-line bg-card p-5 text-left transition-transform duration-150 ease-out active:scale-[0.96]"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Compra en curso</p>
            {current && current.lines.length > 0 ? (
              <>
                <p className="font-display mt-1 text-3xl">{mxn(total)}</p>
                <p className="mt-1 text-sm text-stone">
                  {carried} de {current.lines.length} ya en el carrito
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-stone">No hay lista abierta. Empieza un escaneo o una lista nueva.</p>
            )}
          </div>
          <ChevronRight className="size-5 text-stone" />
        </div>
      </button>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={installApp}
          className="flex h-24 flex-col items-start justify-between rounded-3xl bg-soft p-4 text-left transition-transform duration-150 ease-out active:scale-[0.96]"
        >
          <Smartphone className="size-5" />
          <span className="text-sm font-medium">Instalar</span>
        </button>
        <Link
          to="/privacidad"
          className="flex h-24 flex-col items-start justify-between rounded-3xl bg-soft p-4 transition-transform duration-150 ease-out active:scale-[0.96]"
        >
          <Shield className="size-5" />
          <span className="text-sm font-medium">Privacidad</span>
        </Link>
      </div>
    </div>
  );
}
