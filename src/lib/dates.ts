/** Fechas de calendario (AAAA-MM-DD) en la hora local del teléfono. */

/** Días hacia adelante que «Caducidades próximas» considera «vence pronto». */
export const EXPIRY_SOON_DAYS = 7;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Día local en formato AAAA-MM-DD, el mismo que guarda un `<input type="date">`.
 * No se usa `toISOString()` porque da el día en UTC: en México, después de las 6 de la
 * tarde ya sería «mañana».
 */
export function dayKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDays(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  return dayKey(new Date(year!, month! - 1, day! + days));
}

/** Ya venció: la fecha es hoy o antes. */
export function isExpired(expiresAt: string, today: string = dayKey()): boolean {
  return expiresAt <= today;
}

/** Vencido o por vencer en los próximos días: lo que avisa «Caducidades próximas». */
export function expiresSoon(expiresAt: string, today: string = dayKey()): boolean {
  return expiresAt <= addDays(today, EXPIRY_SOON_DAYS);
}

/** Días enteros entre `fromDay` y `toDay` (ambos `AAAA-MM-DD`). Positivo si `toDay` es posterior. */
export function daysBetween(fromDay: string, toDay: string): number {
  const [y1, m1, d1] = fromDay.split("-").map(Number);
  const [y2, m2, d2] = toDay.split("-").map(Number);
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return 0;
  const utc1 = Date.UTC(y1, m1 - 1, d1);
  const utc2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((utc2 - utc1) / 86_400_000);
}

/** «21 oct» */
export function shortDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(date);
}

/** «21 oct» a partir de una fecha local `AAAA-MM-DD`. */
export function shortCalendarDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return day;
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(
    new Date(y, m - 1, d, 12, 0, 0),
  );
}

