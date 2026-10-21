import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, Shield, Smartphone, AlertTriangle, Clock, ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui";
import { lineAmount, mxn, stamp } from "@/lib/money";
import { usePantry, lineFromItem } from "@/lib/store";

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
  const checkExpiredItems = usePantry((state) => state.checkExpiredItems);
  const addLine = usePantry((state) => state.addLine);
  const toast = usePantry((state) => state.toast);

  useEffect(() => {
    // Run automated expiration check
    checkExpiredItems();
  }, [checkExpiredItems]);

  const total = current?.lines.reduce((sum, line) => sum + lineAmount(line.qty, line.unitPrice), 0) ?? 0;
  const carried = current?.lines.filter((line) => line.inCart).length ?? 0;

  // Calculate upcoming expirations
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const sevenDaysLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Expiring soon: expires within the next 7 days, or already expired
  const expiringSoon = items.filter((item) => {
    if (!item.expiresAt) return false;
    return item.expiresAt <= sevenDaysLater;
  }).sort((a, b) => (a.expiresAt! > b.expiresAt! ? 1 : -1));

  function handleSendExpiredToBuy(item: typeof items[0]) {
    addLine(lineFromItem(item));
    toast(`«${item.name}» agregado a la lista para comprar de nuevo.`);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Caducidades en Hoy */}
      {expiringSoon.length > 0 && (
        <section className="rounded-3xl border border-clay/30 bg-clay/5 p-4">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-clay" />
            <p className="text-sm font-semibold text-clay">Caducidades próximas</p>
          </div>
          <p className="mt-1 text-xs text-stone">
            Lo que se vence pronto para consumirlo antes de que se eche a perder. Una vez vencido, pásalo a comprar de nuevo.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {expiringSoon.map((item) => {
              const isExpired = item.expiresAt! <= todayStr;
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-card p-3 text-xs"
                >
                  <div>
                    <p className="font-medium">
                      {item.name} {item.brand ? `(${item.brand})` : ""}
                    </p>
                    <p className={isExpired ? "font-semibold text-clay" : "text-stone"}>
                      {isExpired ? `¡Venció el ${item.expiresAt}!` : `Vence pronto: ${item.expiresAt}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSendExpiredToBuy(item)}
                    className="inline-flex items-center gap-1 rounded-xl bg-soft px-2.5 py-1.5 font-medium text-ink transition-colors hover:bg-clay hover:text-clay-ink"
                  >
                    <ShoppingCart className="size-3.5" />
                    Comprar de nuevo
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="rounded-3xl bg-card p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-stone">Despensa configurada</p>
            <p className="font-display mt-1 text-4xl">{items.length}</p>
            <p className="mt-1 text-sm text-stone">productos que tu alacena debería tener</p>
          </div>
          {items.some((i) => i.isEssential) && (
            <div className="flex items-center gap-1 rounded-xl bg-soft px-2.5 py-1 text-xs text-clay">
              <Star className="size-3.5 fill-clay" />
              <span>{items.filter((i) => i.isEssential).length} imprescindibles</span>
            </div>
          )}
        </div>
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
        onClick={() => setView("lista")}
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
                  {current.spendingBudget ? ` · Tope: ${mxn(current.spendingBudget)}` : ""}
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
