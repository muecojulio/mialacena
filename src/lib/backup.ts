/**
 * Respaldo en archivo. Todo vive en el teléfono; este archivo es la forma de pasarlo a otro.
 * Se arma y se lee en el navegador: no pasa por ningún servidor.
 */
import { dayKey } from "./dates.ts";
import {
  PACKAGE_TYPES,
  UNITS,
  type ListLine,
  type PantryItem,
  type ScanHit,
  type ScanReport,
  type ShopList,
} from "./types.ts";

export const BACKUP_APP = "mialacena";
export const BACKUP_KIND = "respaldo";
export const BACKUP_VERSION = 1;
/** Un respaldo real pesa unos cuantos KB; el tope solo evita leer un archivo equivocado enorme. */
export const BACKUP_MAX_BYTES = 5 * 1024 * 1024;

export const NOT_A_BACKUP = "Ese archivo no es un respaldo de mialacena.";
export const NEWER_BACKUP =
  "Ese respaldo es de una versión más nueva de mialacena. Actualiza la app y vuelve a intentarlo.";

export type BackupData = {
  items: PantryItem[];
  current: ShopList | null;
  saved: ShopList[];
  lastScan: ScanReport | null;
  theme?: "light" | "dark";
  oneHandedMode?: boolean;
  reviewIntervalDays?: number;
  lastReviewedAt?: string | null;
};

export type Backup = {
  app: typeof BACKUP_APP;
  kind: typeof BACKUP_KIND;
  version: number;
  exportedAt: string;
  data: BackupData;
};

export type BackupSummary = {
  exportedAt: string;
  items: number;
  saved: number;
  /** Productos en la lista abierta; `null` si no hay lista abierta. */
  openLines: number | null;
};

export type ParsedBackup = { ok: true; backup: Backup } | { ok: false; error: string };

export function createBackup(data: BackupData, now: Date = new Date()): Backup {
  return {
    app: BACKUP_APP,
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data,
  };
}

export function serializeBackup(backup: Backup): string {
  return JSON.stringify(backup, null, 2);
}

/** `mialacena-respaldo-2026-10-21.json`, con el día local. */
export function backupFileName(now: Date = new Date()): string {
  return `mialacena-respaldo-${dayKey(now)}.json`;
}

export function summarizeBackup(backup: Backup): BackupSummary {
  return {
    exportedAt: backup.exportedAt,
    items: backup.data.items.length,
    saved: backup.data.saved.length,
    openLines: backup.data.current ? backup.data.current.lines.length : null,
  };
}

// ---------------------------------------------------------------------------
// Lectura. El sobre (app, tipo, versión, fecha) se exige; el contenido se lee con
// tolerancia: un registro dañado se omite o se corrige en vez de tirar todo el respaldo.
// ---------------------------------------------------------------------------

type Raw = Record<string, unknown>;
/** Devuelve el valor limpio, o `undefined` si falta o no sirve. */
type Reader<T> = (value: unknown) => T | undefined;
/**
 * Un lector por cada campo del tipo, opcionales incluidos. Si alguien agrega un campo a
 * `PantryItem`, `ListLine`, `ShopList` o `ScanReport` y no lo suma aquí, el typecheck falla
 * en lugar de perder ese dato al respaldar.
 */
type Shape<T> = { [K in keyof T]-?: Reader<Exclude<T[K], undefined>> };

function isRecord(value: unknown): value is Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const text: Reader<string> = (value) => (typeof value === "string" ? value : undefined);
const filled: Reader<string> = (value) =>
  typeof value === "string" && value.trim() ? value : undefined;
const flag: Reader<boolean> = (value) => (typeof value === "boolean" ? value : undefined);
const nonNegative: Reader<number> = (value) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
const positive: Reader<number> = (value) =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
const instant: Reader<string> = (value) =>
  typeof value === "string" && value && !Number.isNaN(Date.parse(value)) ? value : undefined;
const calendarDay: Reader<string> = (value) =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;

function oneOf<T extends string>(options: readonly T[]): Reader<T> {
  return (value) =>
    typeof value === "string" && (options as readonly string[]).includes(value)
      ? (value as T)
      : undefined;
}

function or<T>(read: Reader<T>, fallback: T): Reader<T> {
  return (value) => read(value) ?? fallback;
}

function listOf<T>(read: (value: unknown) => T | null): (value: unknown) => T[] {
  return (value) =>
    Array.isArray(value) ? value.map(read).filter((row): row is T => row !== null) : [];
}

function readShape<T>(raw: unknown, shape: Shape<T>, required: (keyof T)[]): T | null {
  if (!isRecord(raw)) return null;
  const out: Raw = {};
  for (const key of Object.keys(shape) as (keyof T & string)[]) {
    const value = shape[key](raw[key]);
    if (value === undefined) {
      if (required.includes(key)) return null;
      continue;
    }
    out[key] = value;
  }
  return out as T;
}

/** Si un id se repite se queda el primero (las llaves de React y las ediciones dependen de que sean únicos). */
function uniqueById<T extends { id: string }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

const itemShape: Shape<PantryItem> = {
  id: filled,
  name: filled,
  brand: or(text, ""),
  category: or(filled, "Otros"),
  targetQty: or(positive, 1),
  currentQty: nonNegative,
  unit: or(oneOf(UNITS), "pza"),
  usualPrice: or(nonNegative, 0),
  lastPrice: nonNegative,
  lastPriceDate: instant,
  packageType: oneOf(PACKAGE_TYPES),
  packageSize: positive,
  packageUnit: filled,
  isEssential: flag,
  barcode: filled,
  expiresAt: calendarDay,
  photo: filled,
  restockedAt: instant,
};

const lineShape: Shape<ListLine> = {
  id: filled,
  pantryItemId: or<string | null>(filled, null),
  name: filled,
  brand: or(text, ""),
  unit: or(filled, "pza"),
  qty: or(positive, 1),
  unitPrice: or(nonNegative, 0),
  inCart: or(flag, false),
  isEssential: flag,
  isExtra: flag,
  category: filled,
  lastPaidPrice: nonNegative,
};

const readLine = (raw: unknown) => readShape(raw, lineShape, ["id", "name"]);

const listShape: Shape<ShopList> = {
  id: filled,
  title: or(filled, "Lista de compra"),
  createdAt: instant,
  updatedAt: instant,
  finishedAt: or<string | null>(instant, null),
  status: or(oneOf(["active", "saved", "finished"] as const), "saved"),
  source: or(oneOf(["scan", "manual"] as const), "manual"),
  spendingBudget: or<number | null>(positive, null),
  lines: (value) => uniqueById(listOf(readLine)(value)),
};

const readList = (raw: unknown) => readShape(raw, listShape, ["id", "createdAt", "updatedAt"]);

const hitShape: Shape<ScanHit> = {
  name: filled,
  brand: or(text, ""),
  quantity: or<number | null>(nonNegative, null),
  unit: or(text, ""),
  confidence: or(nonNegative, 0),
};

const scanShape: Shape<ScanReport> = {
  id: filled,
  at: instant,
  note: or(text, ""),
  hits: listOf((raw) => readShape(raw, hitShape, ["name"])),
  present: or(nonNegative, 0),
  missing: or(nonNegative, 0),
  missingIds: (value) =>
    Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : undefined,
};

export function parseBackup(source: string): ParsedBackup {
  let raw: unknown;
  try {
    raw = JSON.parse(source.replace(/^\uFEFF/, ""));
  } catch {
    return { ok: false, error: NOT_A_BACKUP };
  }
  if (!isRecord(raw) || raw.app !== BACKUP_APP || raw.kind !== BACKUP_KIND) {
    return { ok: false, error: NOT_A_BACKUP };
  }
  const { version, data } = raw;
  const exportedAt = instant(raw.exportedAt);
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    return { ok: false, error: NOT_A_BACKUP };
  }
  if (version > BACKUP_VERSION) return { ok: false, error: NEWER_BACKUP };
  if (!exportedAt || !isRecord(data) || !Array.isArray(data.items)) {
    return { ok: false, error: NOT_A_BACKUP };
  }

  const open = readList(data.current);
  const parsedInterval = nonNegative(data.reviewIntervalDays);
  const parsedReviewedAt = instant(data.lastReviewedAt);
  return {
    ok: true,
    backup: {
      app: BACKUP_APP,
      kind: BACKUP_KIND,
      version: BACKUP_VERSION,
      exportedAt,
      data: {
        items: uniqueById(listOf((row) => readShape(row, itemShape, ["id", "name"]))(data.items)),
        // La lista abierta siempre vuelve como abierta, aunque el archivo diga otra cosa.
        current: open ? { ...open, status: "active", finishedAt: null } : null,
        saved: uniqueById(listOf(readList)(data.saved)),
        lastScan: readShape(data.lastScan, scanShape, ["id", "at"]),
        theme: oneOf(["light", "dark"] as const)(data.theme),
        oneHandedMode: flag(data.oneHandedMode),
        ...(parsedInterval !== undefined ? { reviewIntervalDays: Math.round(parsedInterval) } : {}),
        ...(parsedReviewedAt !== undefined
          ? { lastReviewedAt: parsedReviewedAt }
          : data.lastReviewedAt === null
            ? { lastReviewedAt: null }
            : {}),
      },
    },
  };
}
