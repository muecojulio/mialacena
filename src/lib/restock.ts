/**
 * «Al finalizar, ya está en casa».
 *
 * Al cerrar una compra, lo que se marcó como «ya lo llevo» y pertenece a la despensa queda como
 * repuesto: deja de contar como faltante hasta el próximo escaneo (con foto o a mano), que es
 * el que vuelve a decir qué hay.
 */
import { dayKey, expiresSoon } from "./dates.ts";
import { diffPantry } from "./match.ts";
import type { PantryItem, ScanReport, ShopList } from "./types.ts";

export function isRestocked(item: PantryItem): boolean {
  return Boolean(item.restockedAt);
}

export function withoutRestock(item: PantryItem): PantryItem {
  const { restockedAt: _restockedAt, ...rest } = item;
  return rest;
}

/** Productos de la despensa marcados como llevados en la lista (sin repetir y que todavía existen). */
export function carriedPantryIds(list: ShopList, items: PantryItem[]): string[] {
  const known = new Set(items.map((item) => item.id));
  const ids = new Set<string>();
  for (const line of list.lines) {
    if (line.inCart && line.pantryItemId && known.has(line.pantryItemId))
      ids.add(line.pantryItemId);
  }
  return [...ids];
}

/**
 * Marca esos productos como repuestos. Si su caducidad ya había vencido o estaba por vencer,
 * se quita: llegó un empaque nuevo y esa fecha ya no aplica (si no, «Caducidades» lo volvería
 * a mandar a la lista).
 */
export function markRestocked(items: PantryItem[], ids: string[], at: string): PantryItem[] {
  if (ids.length === 0) return items;
  const wanted = new Set(ids);
  const today = dayKey(new Date(at));
  return items.map((item) => {
    if (!wanted.has(item.id)) return item;
    const next: PantryItem = { ...item, restockedAt: at };
    if (next.expiresAt && expiresSoon(next.expiresAt, today)) delete next.expiresAt;
    return next;
  });
}

/** Un escaneo nuevo manda: se borran todas las marcas de repuesto. */
export function clearRestocked(items: PantryItem[]): PantryItem[] {
  if (!items.some(isRestocked)) return items;
  return items.map((item) => (isRestocked(item) ? withoutRestock(item) : item));
}

/** Lo que faltaba en una lectura. Las lecturas anteriores a esta versión no lo guardaban: se recalcula con lo que vio. */
export function scanMissingIds(scan: ScanReport, items: PantryItem[]): string[] {
  if (scan.missingIds) return scan.missingIds;
  return diffPantry(items, scan.hits ?? [])
    .filter((gap) => gap.status !== "ok")
    .map((gap) => gap.item.id);
}

export type HomeSummary = {
  /** Productos que hoy cuentan como repuestos. */
  restocked: number;
  /** Primera y última marca de repuesto (ISO), para decir de qué compra vienen. */
  since: string | null;
  until: string | null;
  /** La última lectura, ajustada: lo que faltaba y ya se trajo cuenta como repuesto, no como faltante. */
  scan: { seen: number; back: number; missing: number } | null;
};

export function homeSummary(items: PantryItem[], lastScan: ScanReport | null): HomeSummary {
  const restocked = items.filter(isRestocked);
  const dates = restocked.map((item) => item.restockedAt!).sort();
  const summary: HomeSummary = {
    restocked: restocked.length,
    since: dates[0] ?? null,
    until: dates[dates.length - 1] ?? null,
    scan: null,
  };
  if (!lastScan) return summary;

  // Se parte de los números que guardó la lectura (lo mismo que se mostraba antes) y solo se
  // pasa a «repuestos» lo que faltaba entonces y ya se trajo.
  const home = new Set(restocked.map((item) => item.id));
  const back = new Set(scanMissingIds(lastScan, items).filter((id) => home.has(id))).size;
  summary.scan = { seen: lastScan.present, back, missing: Math.max(0, lastScan.missing - back) };
  return summary;
}
