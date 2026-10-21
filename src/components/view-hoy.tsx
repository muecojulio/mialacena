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
  ShieldCheck,
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

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "🌙 Madrugada de despensa";
  if (hour < 12) return "🌅 Buenos días";
  if (hour < 19) return "☀️ Buenas tardes";
  return "🌙 Buenas noches";
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
      {/* Saludo del día */}
      <section className="hero hero-ink confetti px-5 py-5">
        <p className="sticker sticker-sun">{greeting()}</p>
        <p className="mt-3 font-display text-3xl leading-tight font-bold">
          Tu alacena, a todo color
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-white/90">
          {items.length} productos configurados ·{" "}
          {current && current.lines.length > 0
            ? `${current.lines.length} en la lista de hoy`
            : "sin compra abierta"}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setView("escanear")}
            className="btn-chunky inline-flex h-10 items-center gap-1.5 rounded-2xl bg-white px-3.5 text-xs font-bold text-clay"
          >
            📸 Escanear alacena
          </button>
          <button
            type="button"
            onClick={() => setView("lista")}
            className="inline-flex h-10 items-center gap-1.5 rounded-2xl border border-white/40 bg-white/15 px-3.5 text-xs font-bold text-white transition-transform active:scale-95"
          >
            🛒 Ir a la lista
          </button>
        </div>
      </section>

      {/* Recordatorio periódico de revisar despensa */}
      <section
        className={cn(
          "card-pop p-4",
          reminder.isDue ? "card-sun" : "",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className={cn("icon-blob size-9", reminder.isDue ? "icon-sun" : "icon-sage")}>
              <Bell className="size-4.5" />
            </span>
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
              className="rounded-xl border-[1.5px] border-line bg-paper px-2 py-1 text-xs text-ink"
            >
              {REVIEW_INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.days} value={opt.days}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-2 text-xs leading-relaxed text-stone">{reminder.subline}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openDespensaTab("comparar")}
            className="btn-chunky inline-flex h-9 items-center gap-1.5 rounded-2xl bg-clay px-3 text-xs font-semibold text-clay-ink"
          >
            <Scale className="size-3.5" />
            Revisar qué tengo ahora
          </button>
          <button
            type="button"
            onClick={() => markPantryReviewed()}
            className="btn-chunky inline-flex h-9 items-center gap-1.5 rounded-2xl bg-soft px-3 text-xs font-semibold text-ink"
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
        <section className="card-pop card-berry p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="icon-blob icon-clay size-9">
                <Clock className="size-4.5" />
              </span>
              <p className="text-sm font-semibold text-clay">
                Caducidades próximas ({expiringSoon.length})
              </p>
            </div>
            <button
              type="button"
              onClick={() => openDespensaTab("caducidades")}
              className="inline-flex items-center gap-1 rounded-2xl bg-berry/15 px-2.5 py-1 text-xs font-semibold text-berry transition-transform active:scale-[0.96]"
            >
              <CalendarClock className="size-3.5" />
              Modo revisar caducidades
            </button>
          </div>
          <p className="mt-2 text-xs text-stone">
            Lo que se vence pronto para consumirlo antes de que se eche a perder. Una vez vencido,
            pásalo a comprar de nuevo.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {expiringSoon.slice(0, 4).map(({ item, status, badgeText }) => {
              const expired = status === "expired" || status === "today";
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-paper p-3 text-xs"
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
                      <p className="truncate font-semibold">
                        {item.name} {item.brand ? `(${item.brand})` : ""}
                      </p>
                      <p
                        className={cn(
                          "mt-0.5 inline-block rounded-full px-2 py-0.5 font-semibold",
                          expired ? "bg-clay/15 text-clay" : "bg-sun/25 text-sun-ink",
                        )}
                      >
                        {badgeText} · {item.expiresAt}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSendExpiredToBuy(item)}
                    className="btn-chunky inline-flex shrink-0 items-center gap-1 rounded-2xl bg-soft px-2.5 py-1.5 text-xs font-semibold text-ink"
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
      <section className="card-pop p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="section-title text-sm">
              <span className="icon-blob icon-sage size-8">
                <Scale className="size-4" />
              </span>
              Qué tengo ahora vs. qué debería tener
            </p>
            <p className="mt-1.5 text-xs text-stone">
              {comparison.okCount} de {items.length} productos completos en tu alacena (
              {completenessPct}%)
            </p>
          </div>
          <button
            type="button"
            onClick={() => openDespensaTab("comparar")}
            className="inline-flex items-center gap-1 rounded-2xl bg-soft px-3 py-1.5 text-xs font-semibold text-ink transition-transform active:scale-[0.96]"
          >
            Ver detalle
            <ChevronRight className="size-3.5" />
          </button>
        </div>

        <div className="mt-3.5 h-3 w-full overflow-hidden rounded-full border border-line bg-soft">
          <div
            className="progress-sky h-full rounded-full transition-all duration-500"
            style={{ width: `${completenessPct}%` }}
          />
        </div>

        <div className="mt-3.5 grid grid-cols-3 gap-2.5 text-center">
          <div className="card-pop card-sage rounded-2xl p-2.5">
            <p className="font-display text-2xl font-bold text-sage">{comparison.okCount}</p>
            <p className="text-[11px] font-medium text-stone">✅ Completos</p>
          </div>
          <div className="card-pop card-sun rounded-2xl p-2.5">
            <p className="font-display text-2xl font-bold text-ink">{comparison.lowCount}</p>
            <p className="text-[11px] font-medium text-stone">📉 Bajos</p>
          </div>
          <div className="card-pop card-berry rounded-2xl p-2.5">
            <p className="font-display text-2xl font-bold text-clay">{comparison.emptyCount}</p>
            <p className="text-[11px] font-medium text-stone">🛒 Se acabaron</p>
          </div>
        </div>

        <div className="mt-3.5 grid grid-cols-2 gap-2">
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

      <section className="hero hero-ink px-5 py-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold text-white/85">🧺 Despensa configurada</p>
            <p className="font-display mt-1 text-5xl leading-none font-bold">{items.length}</p>
            <p className="mt-1.5 text-sm text-white/85">
              productos que tu alacena debería tener
            </p>
          </div>
          {items.some((i) => i.isEssential) && (
            <div className="sticker sticker-sun">
              <Star className="size-3.5 fill-current" />
              <span>{items.filter((i) => i.isEssential).length} imprescindibles</span>
            </div>
          )}
        </div>
        <Button
          variant="sun"
          className="btn-chunky mt-5 w-full border-white/40"
          onClick={() => setView("escanear")}
        >
          📸 Escanear alacena
        </Button>
      </section>

      <section className="card-pop p-5">
        <p className="section-title text-sm">
          <span className="icon-blob icon-sky size-8">
            <Clock className="size-4" />
          </span>
          Última lectura
        </p>
        {lastScan && home.scan ? (
          <>
            <p className="mt-2.5 text-sm font-medium text-stone">🗓️ {stamp(lastScan.at)}</p>
            <div
              className={cn("mt-4 grid gap-3", home.scan.back > 0 ? "grid-cols-3" : "grid-cols-2")}
            >
              <div className="card-pop card-sky rounded-2xl p-3">
                <p className="text-xs font-medium text-stone">👀 Vistos</p>
                <p className="font-display mt-1 text-3xl font-bold">{home.scan.seen}</p>
              </div>
              {home.scan.back > 0 && (
                <div className="card-pop card-sage rounded-2xl p-3">
                  <p className="text-xs font-medium text-stone">♻️ Repuestos</p>
                  <p className="font-display mt-1 text-3xl font-bold text-sage">{home.scan.back}</p>
                </div>
              )}
              <div className="card-pop card-berry rounded-2xl p-3">
                <p className="text-xs font-medium text-stone">🔍 Faltan</p>
                <p className="font-display mt-1 text-3xl font-bold text-clay">{home.scan.missing}</p>
              </div>
            </div>
            {lastScan.note && (
              <p className="mt-4 rounded-2xl bg-soft p-3 text-sm leading-relaxed text-ink">
                {lastScan.note}
              </p>
            )}
          </>
        ) : (
          <p className="mt-2.5 text-sm leading-relaxed text-stone">
            Todavía no hay una foto. Puedes escanear o marcar a mano lo que sí está en el estante.
          </p>
        )}
        {home.restocked > 0 && (
          <p className="mt-4 flex items-start gap-2 rounded-2xl border border-sage/30 bg-sage/10 p-3 text-sm leading-relaxed">
            <PackageCheck className="mt-0.5 size-4 shrink-0 text-sage" aria-hidden="true" />
            <span>{restockNote(home)}</span>
          </p>
        )}
      </section>

      <button
        type="button"
        onClick={() => setView("lista")}
        className="card-pop card-sky p-5 text-left transition-transform duration-150 ease-out active:scale-[0.97]"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">🛒 Compra en curso</p>
            {current && current.lines.length > 0 ? (
              <>
                <p className="font-display mt-1 text-3xl font-bold">{mxn(total)}</p>
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
          <span className="flex size-10 items-center justify-center rounded-full bg-sky/15 text-sky">
            <ChevronRight className="size-5" />
          </span>
        </div>
      </button>

      {/* Recetas públicas con lo que sí hay (TheMealDB), por caducidad */}
      <RecipesCard />

      <BackupCard />

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={installApp}
          className="grad-night flex h-28 flex-col items-start justify-between rounded-3xl p-4 text-left shadow-md transition-transform duration-150 ease-out active:scale-[0.96]"
        >
          <span className="icon-blob icon-grape size-9 bg-white/25">
            <Smartphone className="size-5 text-white" />
          </span>
          <span>
            <span className="block text-sm font-bold text-white">Instalar app</span>
            <span className="block text-[11px] text-white/80">Como en el celular 📲</span>
          </span>
        </button>
        <Link
          to="/privacidad"
          className="grad-ocean flex h-28 flex-col items-start justify-between rounded-3xl p-4 shadow-md transition-transform duration-150 ease-out active:scale-[0.96]"
        >
          <span className="icon-blob size-9 bg-white/25">
            <ShieldCheck className="size-5 text-white" />
          </span>
          <span>
            <span className="block text-sm font-bold text-white">Privacidad</span>
            <span className="block text-[11px] text-white/80">Tus datos, tus reglas 🔒</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
