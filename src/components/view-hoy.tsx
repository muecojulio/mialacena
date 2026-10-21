import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  PackageCheck,
  Scale,
  Shield,
  ShoppingCart,
  Smartphone,
  Star,
} from "lucide-react";
import { BackupCard } from "@/components/backup-card";
import { HolidayNote } from "@/components/holiday-note";
import { RecipesCard } from "@/components/recipes-card";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { dayKey, shortDay } from "@/lib/dates";
import { lineAmount, mxn, plural, stamp } from "@/lib/money";
import {
  filterExpiringItems,
  getReviewReminderStatus,
  summarizePantryComparison,
} from "@/lib/pantry-helpers";
import { homeSummary, type HomeSummary } from "@/lib/restock";
import { lineFromItem, usePantry } from "@/lib/store";
import { REVIEW_INTERVAL_OPTIONS } from "@/lib/types";

function installApp() {
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const url = new URL(window.location.href);
  url.searchParams.set("install", "1");
  url.searchParams.set("platform", ios ? "ios" : "android");
  window.location.assign(url.toString());
}

/** «Ya en casa: 5 productos de tu compra del 21 oct. Cuentan como repuestos hasta el próximo escaneo.» */
function restockNote({ restocked, since, until }: HomeSummary): string {
  const sameDay = since && until && dayKey(new Date(since)) === dayKey(new Date(until));
  const from = sameDay
    ? `de tu compra del ${shortDay(until)}`
    : `de tus compras desde el ${shortDay(since ?? "")}`;
  const counts = restocked === 1 ? "Cuenta como repuesto" : "Cuentan como repuestos";
  return `Ya en casa: ${plural(restocked, "producto", "productos")} ${from}. ${counts} hasta el próximo escaneo.`;
}

export function Hoy() {
  const items = usePantry((state) => state.items);
  const lastScan = usePantry((state) => state.lastScan);
  const current = usePantry((state) => state.current);
  const setView = usePantry((state) => state.setView);
  const openDespensaTab = usePantry((state) => state.openDespensaTab);
  const checkExpiredItems = usePantry((state) => state.checkExpiredItems);
  const addLine = usePantry((state) => state.addLine);
  const toast = usePantry((state) => state.toast);
  const reviewIntervalDays = usePantry((state) => state.reviewIntervalDays);
  const lastReviewedAt = usePantry((state) => state.lastReviewedAt);
  const setReviewIntervalDays = usePantry((state) => state.setReviewIntervalDays);
  const markPantryReviewed = usePantry((state) => state.markPantryReviewed);
  const sendMissingFromComparisonToList = usePantry(
    (state) => state.sendMissingFromComparisonToList,
  );

  useEffect(() => {
    // Run automated expiration check
    checkExpiredItems();
  }, [checkExpiredItems]);

  const total =
    current?.lines.reduce((sum, line) => sum + lineAmount(line.qty, line.unitPrice), 0) ?? 0;
  const carried = current?.lines.filter((line) => line.inCart).length ?? 0;

  // Calculate upcoming expirations (día local, igual que el campo de fecha)
  const todayStr = dayKey();
  const expiringSoon = filterExpiringItems(items, todayStr);

  // Recordatorio periódico de revisar despensa
  const reminder = getReviewReminderStatus(
    lastReviewedAt,
    lastScan?.at,
    reviewIntervalDays,
    todayStr,
  );

  // Resumen de «Qué tengo ahora» vs. «Qué debería tener»
  const comparison = summarizePantryComparison(items, lastScan);
  const completenessPct =
    items.length > 0 ? Math.round((comparison.okCount / items.length) * 100) : 100;

  // Última lectura, contando lo que ya se trajo de la compra (repuestos)
  const home = homeSummary(items, lastScan);

  function handleSendExpiredToBuy(item: (typeof items)[0]) {
    addLine(lineFromItem(item));
    toast(`«${item.name}» agregado a la lista para comprar de nuevo.`);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Recordatorio periódico de revisar despensa */}
      <section
        className={cn(
          "rounded-3xl border p-4",
          reminder.isDue
            ? "border-clay/40 bg-clay/10"
            : "border-line bg-card",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className={cn("size-4 shrink-0", reminder.isDue ? "text-clay" : "text-sage")} />
            <p className={cn("text-sm font-semibold", reminder.isDue ? "text-clay" : "text-ink")}>
              {reminder.headline}
            </p>
          </div>
          <label className="flex items-center gap-1 text-xs text-stone">
            <span className="sr-only">Frecuencia del recordatorio</span>
            <select
              aria-label="Frecuencia del recordatorio de revisar despensa"
              value={reviewIntervalDays}
              onChange={(event) => setReviewIntervalDays(Number(event.target.value))}
              className="rounded-xl border border-line bg-paper px-2 py-1 text-xs text-ink"
            >
              {REVIEW_INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.days} value={opt.days}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-1.5 text-xs leading-relaxed text-stone">{reminder.subline}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openDespensaTab("comparar")}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-clay px-3 text-xs font-semibold text-clay-ink transition-transform active:scale-[0.96]"
          >
            <Scale className="size-3.5" />
            Revisar qué tengo ahora
          </button>
          <button
            type="button"
            onClick={() => markPantryReviewed()}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-soft px-3 text-xs font-medium text-ink transition-transform active:scale-[0.96]"
          >
            <CheckCircle2 className="size-3.5 text-sage" />
            Ya revisé hoy
          </button>
        </div>
      </section>

      {/* Feriado próximo en México (Nager.Date): adelantar la compra */}
      <HolidayNote />

      {/* Caducidades en Hoy + acceso al Modo revisar caducidades */}
      {expiringSoon.length > 0 && (
        <section className="rounded-3xl border border-clay/30 bg-clay/5 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-clay" />
              <p className="text-sm font-semibold text-clay">
                Caducidades próximas ({expiringSoon.length})
              </p>
            </div>
            <button
              type="button"
              onClick={() => openDespensaTab("caducidades")}
              className="inline-flex items-center gap-1 rounded-xl bg-card px-2.5 py-1 text-xs font-semibold text-clay transition-transform active:scale-[0.96]"
            >
              <CalendarClock className="size-3.5" />
              Modo revisar caducidades
            </button>
          </div>
          <p className="mt-1 text-xs text-stone">
            Lo que se vence pronto para consumirlo antes de que se eche a perder. Una vez vencido,
            pásalo a comprar de nuevo.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {expiringSoon.slice(0, 4).map(({ item, status, badgeText }) => {
              const expired = status === "expired" || status === "today";
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-card p-3 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    {item.photo && (
                      <img
                        src={item.photo}
                        alt={item.name}
                        className="size-10 shrink-0 rounded-xl border border-line object-cover"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {item.name} {item.brand ? `(${item.brand})` : ""}
                      </p>
                      <p className={expired ? "font-semibold text-clay" : "text-stone"}>
                        {badgeText} · {item.expiresAt}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSendExpiredToBuy(item)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-soft px-2.5 py-1.5 font-medium text-ink transition-colors hover:bg-clay hover:text-clay-ink"
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

      {/* Vista resumen «Qué tengo ahora» vs. «Qué debería tener» */}
      <section className="rounded-3xl border border-line bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Qué tengo ahora vs. qué debería tener</p>
            <p className="mt-0.5 text-xs text-stone">
              {comparison.okCount} de {items.length} productos completos en tu alacena ({completenessPct}%)
            </p>
          </div>
          <button
            type="button"
            onClick={() => openDespensaTab("comparar")}
            className="inline-flex items-center gap-1 rounded-xl bg-soft px-3 py-1.5 text-xs font-semibold text-ink transition-transform active:scale-[0.96]"
          >
            Ver detalle
            <ChevronRight className="size-3.5" />
          </button>
        </div>

        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-soft">
          <div
            className="h-full rounded-full bg-sage transition-all duration-300"
            style={{ width: `${completenessPct}%` }}
          />
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-soft p-2.5">
            <p className="font-display text-2xl text-sage">{comparison.okCount}</p>
            <p className="text-[11px] text-stone">Completos</p>
          </div>
          <div className="rounded-2xl bg-soft p-2.5">
            <p className="font-display text-2xl text-ink">{comparison.lowCount}</p>
            <p className="text-[11px] text-stone">Bajos</p>
          </div>
          <div className="rounded-2xl bg-soft p-2.5">
            <p className="font-display text-2xl text-clay">{comparison.emptyCount}</p>
            <p className="text-[11px] text-stone">Se acabaron</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="quiet" className="h-10 text-xs" onClick={() => openDespensaTab("comparar")}>
            Ajustar qué tengo
          </Button>
          <Button
            className="h-10 text-xs"
            disabled={comparison.incompleteCount === 0}
            onClick={() => sendMissingFromComparisonToList()}
          >
            Pasar {comparison.incompleteCount} faltantes
          </Button>
        </div>
      </section>

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
        {lastScan && home.scan ? (
          <>
            <p className="mt-2 text-sm text-stone">{stamp(lastScan.at)}</p>
            <div className={cn("mt-4 grid gap-3", home.scan.back > 0 ? "grid-cols-3" : "grid-cols-2")}>
              <div className={cn("rounded-2xl bg-soft", home.scan.back > 0 ? "p-3" : "p-4")}>
                <p className="text-xs text-stone">Vistos</p>
                <p className="font-display mt-1 text-3xl">{home.scan.seen}</p>
              </div>
              {home.scan.back > 0 && (
                <div className="rounded-2xl bg-soft p-3">
                  <p className="text-xs text-stone">Repuestos</p>
                  <p className="font-display mt-1 text-3xl text-sage">{home.scan.back}</p>
                </div>
              )}
              <div className={cn("rounded-2xl bg-soft", home.scan.back > 0 ? "p-3" : "p-4")}>
                <p className="text-xs text-stone">Faltan</p>
                <p className="font-display mt-1 text-3xl text-clay">{home.scan.missing}</p>
              </div>
            </div>
            {lastScan.note && <p className="mt-4 text-sm leading-relaxed text-ink">{lastScan.note}</p>}
          </>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-stone">
            Todavía no hay una foto. Puedes escanear o marcar a mano lo que sí está en el estante.
          </p>
        )}
        {home.restocked > 0 && (
          <p className="mt-4 flex items-start gap-2 rounded-2xl bg-sage/10 p-3 text-sm leading-relaxed">
            <PackageCheck className="mt-0.5 size-4 shrink-0 text-sage" aria-hidden="true" />
            <span>{restockNote(home)}</span>
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
              <p className="mt-2 text-sm text-stone">
                No hay lista abierta. Empieza un escaneo o una lista nueva.
              </p>
            )}
          </div>
          <ChevronRight className="size-5 text-stone" />
        </div>
      </button>

      {/* Recetas públicas con lo que sí hay (TheMealDB), por caducidad */}
      <RecipesCard />

      <BackupCard />

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
