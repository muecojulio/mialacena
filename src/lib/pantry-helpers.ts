import { addDays, dayKey, daysBetween, EXPIRY_SOON_DAYS, shortCalendarDay } from "./dates.ts";
import type { PantryItem, ScanReport } from "./types.ts";

export function normalizeUnitFamily(u?: string): string {
  if (!u) return "pieza";
  const clean = u.trim().toLowerCase();
  if (clean === "pza" || clean === "pieza" || clean === "piezas") return "pieza";
  if (clean === "paq" || clean === "paquete" || clean === "paquetes") return "paquete";
  if (clean === "lata" || clean === "latas") return "lata";
  if (clean === "bolsa" || clean === "bolsas") return "bolsa";
  if (clean === "rollo" || clean === "rollos") return "rollo";
  if (clean === "sobre" || clean === "sobres") return "sobre";
  return u.trim();
}

export function formatUnitWord(rawUnit: string | undefined, count: number): string {
  const u = (rawUnit || "piezas").trim();
  const low = u.toLowerCase();
  const singular = count === 1;
  if (low === "pza" || low === "pieza" || low === "piezas") return singular ? "pieza" : "piezas";
  if (low === "paq" || low === "paquete" || low === "paquetes")
    return singular ? "paquete" : "paquetes";
  if (low === "lata" || low === "latas") return singular ? "lata" : "latas";
  if (low === "bolsa" || low === "bolsas") return singular ? "bolsa" : "bolsas";
  if (low === "rollo" || low === "rollos") return singular ? "rollo" : "rollos";
  if (low === "sobre" || low === "sobres") return singular ? "sobre" : "sobres";
  if (low === "botella" || low === "botellas") return singular ? "botella" : "botellas";
  if (low === "caja" || low === "cajas") return singular ? "caja" : "cajas";
  if (low === "frasco" || low === "frascos") return singular ? "frasco" : "frascos";
  if (low === "bote" || low === "botes") return singular ? "bote" : "botes";
  return u;
}

/**
 * Formatea la equivalencia entre unidad de compra y unidad de consumo.
 * Ejemplo: «1 paquete = 6 piezas», «1 bolsa = 1 kg», «1 caja = 12 L».
 */
export function formatPurchaseEquivalence(
  item: Pick<PantryItem, "packageType" | "packageSize" | "packageUnit" | "unit">,
): string | null {
  if (!item.packageSize || item.packageSize <= 0) return null;
  const pkg = item.packageType || "paquete";
  const unitWord = formatUnitWord(item.packageUnit || item.unit, item.packageSize);
  return `1 ${pkg} = ${item.packageSize} ${unitWord}`;
}

export type PurchaseVsConsumptionInfo = {
  equivalence: string | null;
  /** Cuántos empaques de compra equivalen a la cantidad objetivo (o faltante). */
  packagesCount: number;
  packageWord: string;
  /** Total en unidades de consumo (ej. 12 piezas, 400 g). */
  consumptionCount: number;
  consumptionWord: string;
  /** Texto resumido listo para mostrar en tarjeta o lista. */
  summary: string;
};

/**
 * Calcula con claridad la relación entre cómo se compra (empaque) y cómo se consume en casa.
 */
export function describePurchaseVsConsumption(
  item: Pick<PantryItem, "targetQty" | "unit" | "packageType" | "packageSize" | "packageUnit">,
  qtyInPantryUnits: number = item.targetQty,
): PurchaseVsConsumptionInfo {
  const pkgType = item.packageType || "pieza";
  const equivalence = formatPurchaseEquivalence(item);

  if (!item.packageSize || item.packageSize <= 0) {
    const pkgWord = formatUnitWord(pkgType, qtyInPantryUnits);
    const consWord = formatUnitWord(item.unit, qtyInPantryUnits);
    return {
      equivalence: null,
      packagesCount: qtyInPantryUnits,
      packageWord: pkgWord,
      consumptionCount: qtyInPantryUnits,
      consumptionWord: consWord,
      summary: `Compra: ${qtyInPantryUnits} ${pkgWord} · Consumo: ${qtyInPantryUnits} ${consWord}`,
    };
  }

  const unitFamily = normalizeUnitFamily(item.unit);
  const pkgUnitFamily = normalizeUnitFamily(item.packageUnit || item.unit);
  const pkgTypeFamily = normalizeUnitFamily(pkgType);

  // Caso 1: La despensa está expresada en unidades de consumo (ej. targetQty=12 pza, 1 paquete = 6 piezas)
  // y la unidad de despensa coincide con la unidad dentro del paquete (pero no es "paquete").
  const targetIsConsumptionUnit =
    unitFamily === pkgUnitFamily && unitFamily !== "paquete" && unitFamily !== pkgTypeFamily;

  if (targetIsConsumptionUnit) {
    const packagesCount =
      qtyInPantryUnits <= 0 ? 0 : Math.max(1, Math.ceil((qtyInPantryUnits / item.packageSize) * 100) / 100);
    const consumptionCount = Math.round(qtyInPantryUnits * 100) / 100;
    const packageWord = formatUnitWord(pkgType, packagesCount);
    const consumptionWord = formatUnitWord(item.packageUnit || item.unit, consumptionCount);
    return {
      equivalence,
      packagesCount,
      packageWord,
      consumptionCount,
      consumptionWord,
      summary: `${equivalence} · Compras ${packagesCount} ${packageWord} (${consumptionCount} ${consumptionWord})`,
    };
  }

  // Caso 2: La despensa está expresada en empaques (ej. 2 paq, donde 1 paquete = 6 piezas o 200 g)
  const packagesCount = Math.round(qtyInPantryUnits * 100) / 100;
  const consumptionCount = Math.round(packagesCount * item.packageSize * 100) / 100;
  const packageWord = formatUnitWord(pkgType, packagesCount);
  const consumptionWord = formatUnitWord(item.packageUnit || item.unit, consumptionCount);
  return {
    equivalence,
    packagesCount,
    packageWord,
    consumptionCount,
    consumptionWord,
    summary: `${equivalence} · ${packagesCount} ${packageWord} = ${consumptionCount} ${consumptionWord}`,
  };
}

/**
 * Para un renglón de la lista de compra (donde `lineQty` es cuántos empaques compras),
 * devuelve cuántas unidades de consumo estás llevando en total (ej. "2 paquetes = 12 piezas").
 */
export function formatLineConsumptionDetail(
  item: Pick<PantryItem, "packageType" | "packageSize" | "packageUnit" | "unit">,
  lineQty: number,
): string | null {
  const eq = formatPurchaseEquivalence(item);
  if (!eq || !item.packageSize || item.packageSize <= 0) return null;
  const totalConsumption = Math.round(lineQty * item.packageSize * 100) / 100;
  const consWord = formatUnitWord(item.packageUnit || item.unit, totalConsumption);
  const pkgWord = formatUnitWord(item.packageType || "paquete", lineQty);
  if (lineQty === 1) return eq;
  return `${eq} · Llevas ${lineQty} ${pkgWord} (${totalConsumption} ${consWord})`;
}

// ---------------------------------------------------------------------------
// Vista «Qué tengo ahora» vs. «Qué debería tener»
// ---------------------------------------------------------------------------

export type PantryComparisonStatus = "ok" | "low" | "empty";

export type PantryComparisonRow = {
  item: PantryItem;
  haveQty: number;
  shouldHaveQty: number;
  missingQty: number;
  ratio: number;
  status: PantryComparisonStatus;
  equivalence: string | null;
  packagesToBuy: number;
  packageWord: string;
};

/**
 * Determina cuánto tienes «ahora» de un producto:
 * 1. Si se repuso en la última compra finalizada (`restockedAt`), ya está en casa al menos en su meta (`targetQty`), salvo que después hayas ajustado `currentQty`.
 * 2. Si tiene `currentQty` numérico definido, usa ese valor.
 * 3. Si hay un escaneo previo (`lastScan`), usa 0 si estuvo en `missingIds`, o `targetQty` si estuvo visto.
 * 4. Por defecto, `targetQty`.
 */
export function getEffectiveCurrentQty(item: PantryItem, lastScan?: ScanReport | null): number {
  if (typeof item.currentQty === "number" && Number.isFinite(item.currentQty)) {
    return Math.max(0, Math.round(item.currentQty * 100) / 100);
  }
  if (item.restockedAt) {
    return item.targetQty;
  }
  if (lastScan) {
    if (lastScan.missingIds?.includes(item.id)) return 0;
    return item.targetQty;
  }
  return item.targetQty;
}

export function comparePantryItem(
  item: PantryItem,
  lastScan?: ScanReport | null,
): PantryComparisonRow {
  const haveQty = getEffectiveCurrentQty(item, lastScan);
  const shouldHaveQty = item.targetQty;
  const missingQty = Math.max(0, Math.round((shouldHaveQty - haveQty) * 100) / 100);
  const ratio = shouldHaveQty > 0 ? Math.min(1, Math.max(0, haveQty / shouldHaveQty)) : 1;
  const status: PantryComparisonStatus =
    haveQty >= shouldHaveQty ? "ok" : haveQty > 0 ? "low" : "empty";

  const info = describePurchaseVsConsumption(item, missingQty > 0 ? missingQty : shouldHaveQty);
  return {
    item,
    haveQty,
    shouldHaveQty,
    missingQty,
    ratio,
    status,
    equivalence: info.equivalence,
    packagesToBuy: missingQty > 0 ? Math.max(1, info.packagesCount) : 0,
    packageWord: info.packageWord,
  };
}

export type PantryComparisonSummary = {
  rows: PantryComparisonRow[];
  okCount: number;
  lowCount: number;
  emptyCount: number;
  incompleteCount: number;
};

export function summarizePantryComparison(
  items: PantryItem[],
  lastScan?: ScanReport | null,
): PantryComparisonSummary {
  const rows = items.map((item) => comparePantryItem(item, lastScan));
  let okCount = 0;
  let lowCount = 0;
  let emptyCount = 0;
  for (const r of rows) {
    if (r.status === "ok") okCount += 1;
    else if (r.status === "low") lowCount += 1;
    else emptyCount += 1;
  }
  return {
    rows,
    okCount,
    lowCount,
    emptyCount,
    incompleteCount: lowCount + emptyCount,
  };
}

// ---------------------------------------------------------------------------
// Modo «Revisar caducidades» (lista filtrada solo de lo que vence pronto)
// ---------------------------------------------------------------------------

export type ExpiryStatus = "expired" | "today" | "soon";

export type ExpiringItemRow = {
  item: PantryItem;
  expiresAt: string;
  daysLeft: number;
  status: ExpiryStatus;
  badgeText: string;
};

export function filterExpiringItems(
  items: PantryItem[],
  today: string = dayKey(),
  windowDays: number = EXPIRY_SOON_DAYS,
): ExpiringItemRow[] {
  const limitDay = addDays(today, windowDays);
  const out: ExpiringItemRow[] = [];

  for (const item of items) {
    if (!item.expiresAt) continue;
    if (item.expiresAt > limitDay) continue;
    const daysLeft = daysBetween(today, item.expiresAt);
    let status: ExpiryStatus;
    let badgeText: string;
    if (daysLeft < 0) {
      status = "expired";
      const ago = Math.abs(daysLeft);
      badgeText = ago === 1 ? "Venció ayer" : `Venció hace ${ago} días`;
    } else if (daysLeft === 0) {
      status = "today";
      badgeText = "¡Vence hoy!";
    } else {
      status = "soon";
      badgeText = daysLeft === 1 ? "Vence mañana" : `Vence en ${daysLeft} días`;
    }
    out.push({
      item,
      expiresAt: item.expiresAt,
      daysLeft,
      status,
      badgeText,
    });
  }

  return out.sort((a, b) => {
    if (a.expiresAt !== b.expiresAt) return a.expiresAt < b.expiresAt ? -1 : 1;
    if (a.item.isEssential && !b.item.isEssential) return -1;
    if (!a.item.isEssential && b.item.isEssential) return 1;
    return a.item.name.localeCompare(b.item.name, "es-MX");
  });
}

// ---------------------------------------------------------------------------
// Recordatorio de «Revisar despensa» periódico
// ---------------------------------------------------------------------------

export type ReviewReminderStatus = {
  enabled: boolean;
  intervalDays: number;
  isDue: boolean;
  neverReviewed: boolean;
  lastReviewIso: string | null;
  lastReviewDay: string | null;
  nextReviewDay: string | null;
  daysSince: number | null;
  daysUntil: number | null;
  headline: string;
  subline: string;
};

export function getReviewReminderStatus(
  lastReviewedAt: string | null | undefined,
  lastScanAt: string | null | undefined,
  intervalDays: number,
  today: string = dayKey(),
): ReviewReminderStatus {
  // Tomamos la fecha más reciente entre la última revisión manual y el último escaneo
  const candidates = [lastReviewedAt, lastScanAt].filter(
    (iso): iso is string => typeof iso === "string" && iso.length > 0 && !Number.isNaN(Date.parse(iso)),
  );
  candidates.sort();
  const lastReviewIso = candidates.length > 0 ? candidates[candidates.length - 1]! : null;
  const lastReviewDay = lastReviewIso ? dayKey(new Date(lastReviewIso)) : null;

  if (!intervalDays || intervalDays <= 0) {
    return {
      enabled: false,
      intervalDays: 0,
      isDue: false,
      neverReviewed: !lastReviewIso,
      lastReviewIso,
      lastReviewDay,
      nextReviewDay: null,
      daysSince: lastReviewDay ? daysBetween(lastReviewDay, today) : null,
      daysUntil: null,
      headline: "Recordatorio desactivado",
      subline: lastReviewDay
        ? `Última revisión: ${shortCalendarDay(lastReviewDay)}. Actívalo para que te avise periódicamente.`
        : "Elige cada cuántos días quieres que te recordemos revisar tu despensa.",
    };
  }

  if (!lastReviewDay) {
    return {
      enabled: true,
      intervalDays,
      isDue: true,
      neverReviewed: true,
      lastReviewIso: null,
      lastReviewDay: null,
      nextReviewDay: today,
      daysSince: null,
      daysUntil: 0,
      headline: "¡Te toca revisar tu despensa!",
      subline: `Recordatorio activo cada ${intervalDays} días. Haz tu primera revisión con foto o a mano.`,
    };
  }

  const nextReviewDay = addDays(lastReviewDay, intervalDays);
  const daysSince = Math.max(0, daysBetween(lastReviewDay, today));
  const daysUntil = daysBetween(today, nextReviewDay);
  const isDue = daysUntil <= 0;

  if (isDue) {
    const overdue = Math.abs(daysUntil);
    return {
      enabled: true,
      intervalDays,
      isDue: true,
      neverReviewed: false,
      lastReviewIso,
      lastReviewDay,
      nextReviewDay,
      daysSince,
      daysUntil,
      headline: "¡Te toca revisar tu despensa!",
      subline:
        overdue === 0
          ? `Hoy se cumplen ${intervalDays} días desde tu última revisión (${shortCalendarDay(lastReviewDay)}).`
          : `Pasaron ${daysSince} días desde tu última revisión (${shortCalendarDay(lastReviewDay)}). Programado cada ${intervalDays} días.`,
    };
  }

  return {
    enabled: true,
    intervalDays,
    isDue: false,
    neverReviewed: false,
    lastReviewIso,
    lastReviewDay,
    nextReviewDay,
    daysSince,
    daysUntil,
    headline: "Revisión de despensa al día",
    subline:
      daysSince === 0
        ? `Revisada hoy · Próximo recordatorio en ${daysUntil} días (${shortCalendarDay(nextReviewDay)}).`
        : `Revisada hace ${daysSince} ${daysSince === 1 ? "día" : "días"} · Próxima revisión en ${daysUntil} ${daysUntil === 1 ? "día" : "días"} (${shortCalendarDay(nextReviewDay)}).`,
  };
}
