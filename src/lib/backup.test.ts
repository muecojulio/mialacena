import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BACKUP_VERSION,
  NEWER_BACKUP,
  NOT_A_BACKUP,
  backupFileName,
  createBackup,
  parseBackup,
  serializeBackup,
  summarizeBackup,
  type BackupData,
} from "./backup.ts";
import type { PantryItem, ScanReport, ShopList } from "./types.ts";

/** Un producto con todos los campos, para que el viaje de ida y vuelta no pierda ninguno. */
const fullItem: PantryItem = {
  id: "leche",
  name: "Leche",
  brand: "Lala",
  category: "Lácteos y huevo",
  targetQty: 2,
  unit: "L",
  usualPrice: 46,
  lastPrice: 42.5,
  lastPriceDate: "2026-10-20T18:00:00.000Z",
  packageType: "pieza",
  packageSize: 1,
  packageUnit: "L",
  isEssential: true,
  barcode: "7501020512130",
  expiresAt: "2026-10-28",
  restockedAt: "2026-10-21T16:30:00.000Z",
};

const plainItem: PantryItem = {
  id: "arroz",
  name: "Arroz",
  brand: "Verde Valle",
  category: "Abarrotes",
  targetQty: 1,
  unit: "kg",
  usualPrice: 34,
};

const openList: ShopList = {
  id: "abierta",
  title: "Compra de la semana",
  createdAt: "2026-10-21T15:00:00.000Z",
  updatedAt: "2026-10-21T15:10:00.000Z",
  finishedAt: null,
  status: "active",
  source: "scan",
  spendingBudget: 800,
  lines: [
    {
      id: "l1",
      pantryItemId: "leche",
      name: "Leche",
      brand: "Lala",
      unit: "pieza",
      qty: 2,
      unitPrice: 44,
      inCart: true,
      isEssential: true,
      isExtra: false,
      category: "Lácteos y huevo",
      lastPaidPrice: 42.5,
    },
    {
      id: "l2",
      pantryItemId: null,
      name: "Pastel",
      brand: "",
      unit: "pieza",
      qty: 1,
      unitPrice: 180,
      inCart: false,
      isExtra: true,
    },
  ],
};

const finishedList: ShopList = {
  ...openList,
  id: "vieja",
  title: "Compra de la semana · 14 oct",
  status: "finished",
  finishedAt: "2026-10-14T20:00:00.000Z",
  spendingBudget: null,
};

const scan: ScanReport = {
  id: "s1",
  at: "2026-10-21T14:00:00.000Z",
  note: "Lectura lista.",
  hits: [{ name: "Arroz", brand: "Verde Valle", quantity: 1, unit: "kg", confidence: 0.9 }],
  present: 1,
  missing: 1,
  missingIds: ["leche"],
};

const data: BackupData = {
  items: [fullItem, plainItem],
  current: openList,
  saved: [finishedList],
  lastScan: scan,
  theme: "light",
  oneHandedMode: true,
};

function wrap(payload: unknown): string {
  return JSON.stringify(payload);
}

test("el respaldo va y vuelve sin perder nada", () => {
  const backup = createBackup(data, new Date("2026-10-21T17:15:00.000Z"));
  const parsed = parseBackup(serializeBackup(backup));
  assert.ok(parsed.ok);
  assert.deepEqual(parsed.backup, backup);
  assert.equal(parsed.backup.version, BACKUP_VERSION);
  assert.equal(parsed.backup.exportedAt, "2026-10-21T17:15:00.000Z");
});

test("el resumen cuenta despensa, guardadas y la lista abierta", () => {
  const summary = summarizeBackup(createBackup(data));
  assert.equal(summary.items, 2);
  assert.equal(summary.saved, 1);
  assert.equal(summary.openLines, 2);
  const none = summarizeBackup(createBackup({ ...data, current: null }));
  assert.equal(none.openLines, null);
});

test("el nombre del archivo lleva el día local", () => {
  assert.equal(backupFileName(new Date(2026, 9, 21, 23, 40)), "mialacena-respaldo-2026-10-21.json");
  assert.equal(backupFileName(new Date(2026, 0, 5, 0, 5)), "mialacena-respaldo-2026-01-05.json");
});

test("rechaza lo que no es un respaldo", () => {
  for (const source of [
    "",
    "no es json",
    "[]",
    "null",
    wrap({ state: { items: [] }, version: 2 }), // el formato interno del navegador
    wrap({
      app: "otra-app",
      kind: "respaldo",
      version: 1,
      exportedAt: scan.at,
      data: { items: [] },
    }),
    wrap({ app: "mialacena", kind: "respaldo", version: 1, exportedAt: scan.at }),
    wrap({ app: "mialacena", kind: "respaldo", version: 1, exportedAt: scan.at, data: {} }),
    wrap({
      app: "mialacena",
      kind: "respaldo",
      version: 0,
      exportedAt: scan.at,
      data: { items: [] },
    }),
    wrap({
      app: "mialacena",
      kind: "respaldo",
      version: 1,
      exportedAt: "ayer",
      data: { items: [] },
    }),
  ]) {
    const parsed = parseBackup(source);
    assert.equal(parsed.ok, false, source);
    if (!parsed.ok) assert.equal(parsed.error, NOT_A_BACKUP);
  }
});

test("avisa si el respaldo viene de una versión más nueva", () => {
  const parsed = parseBackup(wrap({ ...createBackup(data), version: BACKUP_VERSION + 1 }));
  assert.equal(parsed.ok, false);
  if (!parsed.ok) assert.equal(parsed.error, NEWER_BACKUP);
});

test("acepta el archivo aunque traiga BOM", () => {
  const parsed = parseBackup(`\uFEFF${serializeBackup(createBackup(data))}`);
  assert.ok(parsed.ok);
});

test("un registro dañado se omite o se corrige sin tirar el respaldo", () => {
  const parsed = parseBackup(
    wrap({
      app: "mialacena",
      kind: "respaldo",
      version: 1,
      exportedAt: scan.at,
      data: {
        items: [
          { id: "ok", name: "Café", targetQty: -3, unit: "costal", usualPrice: "caro", extra: 1 },
          { id: "", name: "Sin id" },
          { id: "sin-nombre", name: "   " },
          { id: "ok", name: "Café repetido" },
          "basura",
          {
            id: "frijol",
            name: "Frijol",
            expiresAt: "pronto",
            packageType: "costal",
            isEssential: "sí",
          },
        ],
        current: {
          ...openList,
          status: "finished",
          finishedAt: scan.at,
          lines: [...openList.lines, { id: "x" }],
        },
        saved: [finishedList, { id: "rota" }, finishedList],
        lastScan: { id: "s", at: "no-es-fecha" },
        theme: "morado",
        oneHandedMode: "sí",
      },
    }),
  );
  assert.ok(parsed.ok);
  const { items, current, saved, lastScan, theme, oneHandedMode } = parsed.backup.data;

  assert.deepEqual(
    items.map((item) => item.id),
    ["ok", "frijol"],
  );
  assert.deepEqual(items[0], {
    id: "ok",
    name: "Café",
    brand: "",
    category: "Otros",
    targetQty: 1,
    unit: "pza",
    usualPrice: 0,
  });
  assert.equal(items[1]!.expiresAt, undefined);
  assert.equal(items[1]!.packageType, undefined);
  assert.equal(items[1]!.isEssential, undefined);

  // La lista abierta vuelve abierta y sin el renglón dañado
  assert.equal(current?.status, "active");
  assert.equal(current?.finishedAt, null);
  assert.equal(current?.lines.length, 2);

  assert.deepEqual(
    saved.map((list) => list.id),
    ["vieja"],
  );
  assert.equal(lastScan, null);
  assert.equal(theme, undefined);
  assert.equal(oneHandedMode, undefined);
});

test("un respaldo de un teléfono vacío también es válido", () => {
  const parsed = parseBackup(
    serializeBackup(createBackup({ items: [], current: null, saved: [], lastScan: null })),
  );
  assert.ok(parsed.ok);
  assert.equal(summarizeBackup(parsed.backup).items, 0);
});
