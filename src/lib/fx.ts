/**
 * Tipo de cambio de referencia para los precios públicos de Open Prices.
 *
 * Open Prices es una base mundial: la mayoría de los registros están en euros y
 * la app **nunca** los copia como pesos. Para dar una idea del orden de
 * magnitud, se convierte la mediana a MXN con el tipo de cambio del Banco
 * Central Europeo que publica [Frankfurter](https://frankfurter.dev) — API
 * pública, sin llave y sin registro (repo: github.com/lineofflight/frankfurter).
 *
 * Si Frankfurter no responde, se puede fijar un respaldo por variable de
 * entorno (`FX_MXN_PER_USD` / `FX_MXN_PER_EUR`), que se usa **solo** cuando el
 * servicio público falla. Sin ninguna de las dos cosas, la app no convierte y
 * lo dice: preferimos no mostrar un número inventado.
 *
 * Este módulo es puro (sin red) para poder probarlo con respuestas recortadas.
 */

export type FxRate = {
  /** Moneda de origen (la del precio público). */
  base: string;
  /** Siempre MXN: a cuántos pesos equivale 1 unidad de `base`. */
  currency: "MXN";
  rate: number;
  /** Día del tipo de cambio (`YYYY-MM-DD`). */
  date: string;
  /** De dónde salió: `frankfurter` (BCE) o `env` (respaldo configurado). */
  source: "frankfurter" | "env";
};

const MXN = "MXN";

/** Monedas que publica el BCE; el resto no se puede convertir con este servicio. */
export const ECB_CURRENCIES = new Set([
  "AUD", "BGN", "BRL", "CAD", "CHF", "CNY", "CZK", "DKK", "EUR", "GBP", "HKD", "HUF",
  "IDR", "ILS", "INR", "ISK", "JPY", "KRW", "MXN", "MYR", "NOK", "NZD", "PHP", "PLN",
  "RON", "SEK", "SGD", "THB", "TRY", "USD", "ZAR",
]);

export function fxUrl(base: string): string {
  const currency = normalizeCurrency(base);
  const url = new URL("https://api.frankfurter.app/latest");
  url.searchParams.set("from", currency);
  url.searchParams.set("to", MXN);
  return url.toString();
}

export function normalizeCurrency(input: unknown): string {
  return String(input ?? "").trim().toUpperCase().slice(0, 3);
}

type Raw = Record<string, unknown>;

function asRecord(value: unknown): Raw | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Raw)
    : null;
}

/**
 * Convierte la respuesta de `GET /latest?from=USD&to=MXN` en una cotización.
 * Devuelve `null` si la forma no sirve o la tasa no es un número positivo.
 */
export function parseFxRate(json: unknown, base: string): FxRate | null {
  const currency = normalizeCurrency(base);
  if (!currency || currency === MXN) return null;
  const root = asRecord(json);
  const rates = asRecord(root?.rates);
  if (!root || !rates) return null;

  // La API responde con `base` en mayúsculas; si no viene, se usa la pedida.
  const answeredBase = normalizeCurrency(root.base) || currency;
  if (answeredBase !== currency) return null;

  const rate = typeof rates[MXN] === "number" ? rates[MXN] : Number(rates[MXN]);
  if (!Number.isFinite(rate) || rate <= 0) return null;

  const date = typeof root.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(root.date)
    ? root.date
    : "";

  return {
    base: currency,
    currency: MXN,
    rate: Math.round(rate * 10_000) / 10_000,
    date,
    source: "frankfurter",
  };
}

/**
 * Respaldo por entorno. `raw` es el valor de `FX_MXN_PER_USD` /
 * `FX_MXN_PER_EUR`: cuántos pesos vale una unidad de esa moneda. Se ignora
 * cualquier cosa que no sea un número positivo razonable.
 */
export function envFallbackRate(base: string, raw: string | undefined): FxRate | null {
  const currency = normalizeCurrency(base);
  if (!currency || currency === MXN) return null;
  const rate = Number(String(raw ?? "").replace(",", "."));
  if (!Number.isFinite(rate) || rate <= 0 || rate > 100_000) return null;
  return { base: currency, currency: MXN, rate, date: "", source: "env" };
}

/** Convierte un importe a pesos con la cotización dada (redondeo a centavos). */
export function toMxn(amount: number, rate: number): number {
  if (!Number.isFinite(amount) || !Number.isFinite(rate) || rate <= 0) return 0;
  return Math.round(amount * rate * 100) / 100;
}

/** Fecha legible del tipo de cambio (`2026-10-23` → `23 oct 2026`). */
export function fxDateLabel(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "";
  const [, year, month, day] = match;
  const names = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const name = names[Number(month) - 1];
  if (!name) return "";
  return `${Number(day)} ${name} ${year}`;
}
