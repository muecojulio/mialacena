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

/** «21 oct» */
export function shortDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(date);
}
