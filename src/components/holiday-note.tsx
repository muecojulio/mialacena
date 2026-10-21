import { useEffect, useState } from "react";
import { CalendarClock, ChevronRight } from "lucide-react";
import { dayKey, daysBetween, shortCalendarDay } from "@/lib/dates";
import { nextHolidays, type Holiday } from "@/lib/holidays.functions";
import { usePantry } from "@/lib/store";

/**
 * Aviso de feriado próximo en México (Nager.Date, sin llave). Solo aparece si
 * hay un feriado en los siguientes 10 días: la idea es adelantar la compra
 * antes de filas y horarios especiales. Si el servicio no responde, no muestra nada.
 */
export function HolidayNote() {
  const setView = usePantry((state) => state.setView);
  const [holiday, setHoliday] = useState<Holiday | null>(null);

  useEffect(() => {
    let live = true;
    void nextHolidays()
      .then((result) => {
        if (!live || !result.ok) return;
        const today = dayKey();
        const soon = result.holidays.find((row) => {
          const days = daysBetween(today, row.date);
          return days >= 0 && days <= 10;
        });
        setHoliday(soon ?? null);
      })
      .catch(() => {
        /* sin aviso: Hoy sigue igual */
      });
    return () => {
      live = false;
    };
  }, []);

  if (!holiday) return null;
  const days = daysBetween(dayKey(), holiday.date);
  const when = days === 0 ? "hoy" : days === 1 ? "mañana" : `en ${days} días`;

  return (
    <button
      type="button"
      onClick={() => setView("lista")}
      className="rounded-3xl border border-line bg-card p-4 text-left transition-transform duration-150 ease-out active:scale-[0.98]"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="flex items-start gap-2.5">
          <CalendarClock className="mt-0.5 size-4 shrink-0 text-clay" />
          <span>
            <span className="block text-sm font-semibold">
              {holiday.name} es {when} ({shortCalendarDay(holiday.date)})
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-stone">
              Los feriados llenan el súper y cambian horarios: vale la pena adelantar tu lista.
            </span>
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-stone" />
      </span>
    </button>
  );
}
