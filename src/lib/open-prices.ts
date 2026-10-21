/**
 * Open Prices (https://prices.openfoodfacts.org) — precios públicos registrados
 * por la comunidad de Open Food Facts, sin llave ni registro para leer.
 * Repo público: github.com/openfoodfacts/open-prices.
 *
 * Ojo: la mayoría de los registros son de Europa. Por eso el resumen conserva
 * moneda y país, y la app NUNCA copia estos precios como si fueran MXN:
 * son una referencia, no el precio de tu súper.
 */

export type PublicPriceSummary = {
  code: string;
  count: number;
  currency: string;
  min: number;
  median: number;
  max: number;
  latest?: { price: number; date: string; place?: string; country?: string };
};

type Raw = Record<string, unknown>;

function asRecord(value: unknown): Raw | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Raw)
    : null;
}

function asText(value: unknown, max = 80): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function openPricesUrl(code: string): string {
  const url = new URL("https://prices.openfoodfacts.org/api/v1/prices");
  url.searchParams.set("product_code", code);
  url.searchParams.set("size", "25");
  url.searchParams.set("order_by", "-date");
  return url.toString();
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return Math.round(value * 100) / 100;
}

/**
 * Resume `GET /api/v1/prices?product_code=...`: agrupa por moneda (gana MXN si
 * existe; si no, la moneda con más registros) y devuelve rango + mediana.
 */
export function summarizePublicPrices(json: unknown, code: string): PublicPriceSummary | null {
  const root = asRecord(json);
  const items = Array.isArray(root?.items) ? root.items : [];
  type Row = { price: number; currency: string; date: string; place?: string; country?: string };
  const rows: Row[] = [];

  for (const entry of items) {
    const item = asRecord(entry);
    if (!item) continue;
    // Solo el código pedido: la API puede mezclar si el parámetro se ignora.
    if (asText(item.product_code, 24) !== code) continue;
    const price = typeof item.price === "number" ? item.price : Number(item.price);
    const currency = asText(item.currency, 6).toUpperCase();
    if (!Number.isFinite(price) || price <= 0 || !currency) continue;
    const location = asRecord(item.location) ?? {};
    rows.push({
      price: Math.round(price * 100) / 100,
      currency,
      date: asText(item.date, 10),
      place: asText(location.osm_name, 60) || undefined,
      country: asText(location.osm_address_country_code, 4) || undefined,
    });
  }
  if (!rows.length) return null;

  const byCurrency = new Map<string, Row[]>();
  for (const row of rows) {
    const group = byCurrency.get(row.currency) ?? [];
    group.push(row);
    byCurrency.set(row.currency, group);
  }
  const currency =
    byCurrency.get("MXN")?.length
      ? "MXN"
      : [...byCurrency.entries()].sort((a, b) => b[1].length - a[1].length)[0][0];
  const group = byCurrency.get(currency) ?? [];
  const prices = group.map((row) => row.price).sort((a, b) => a - b);
  const latest = [...group].sort((a, b) => b.date.localeCompare(a.date))[0];

  return {
    code,
    count: group.length,
    currency,
    min: prices[0],
    median: median(prices),
    max: prices[prices.length - 1],
    latest: latest
      ? { price: latest.price, date: latest.date, place: latest.place, country: latest.country }
      : undefined,
  };
}
