export function mxn(value: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function lineAmount(qty: number, price: number): number {
  const n = qty * price;
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function parseMoney(raw: string): number {
  const n = Number(raw.replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

export function parseQty(raw: string): number {
  const n = Number(raw.replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.round(n * 100) / 100;
}

export function stamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
