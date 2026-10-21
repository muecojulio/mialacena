import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, dayKey, expiresSoon, isExpired } from "./dates.ts";
import {
  carriedPantryIds,
  clearRestocked,
  homeSummary,
  markRestocked,
  scanMissingIds,
} from "./restock.ts";
import type { PantryItem, ScanReport, ShopList } from "./types.ts";

// El store persiste en window.localStorage (zustand); en Node se simula con un Map.
const memory = new Map<string, string>();
Object.assign(globalThis, {
  window: {
    localStorage: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => void memory.set(key, String(value)),
      removeItem: (key: string) => void memory.delete(key),
    },
  },
});
const { usePantry } = await import("./store.ts");
const { createBackup } = await import("./backup.ts");

const item = (id: string, extra: Partial<PantryItem> = {}): PantryItem => ({
  id,
  name: id[0]!.toUpperCase() + id.slice(1),
  brand: "",
  category: "Abarrotes",
  targetQty: 1,
  unit: "pza",
  usualPrice: 10,
  ...extra,
});

const list = (lines: Array<[pantryItemId: string | null, inCart: boolean]>): ShopList => ({
  id: "lista",
  title: "Compra de la semana",
  createdAt: "2026-10-21T15:00:00.000Z",
  updatedAt: "2026-10-21T15:00:00.000Z",
  finishedAt: null,
  status: "active",
  source: "manual",
  lines: lines.map(([pantryItemId, inCart], index) => ({
    id: `l${index}`,
    pantryItemId,
    name: pantryItemId ?? `Extra ${index}`,
    brand: "",
    unit: "pieza",
    qty: 1,
    unitPrice: 20,
    inCart,
    isExtra: pantryItemId === null,
  })),
});

const AT = "2026-10-21T18:00:00.000Z";

test("fechas locales: sumar días y avisos de caducidad", () => {
  assert.equal(dayKey(new Date(2026, 9, 21, 23, 59)), "2026-10-21");
  assert.equal(addDays("2026-10-28", 7), "2026-11-04");
  assert.equal(addDays("2026-12-30", 3), "2027-01-02");
  assert.ok(isExpired("2026-10-21", "2026-10-21"));
  assert.ok(!isExpired("2026-10-22", "2026-10-21"));
  assert.ok(expiresSoon("2026-10-28", "2026-10-21"));
  assert.ok(!expiresSoon("2026-10-29", "2026-10-21"));
});

test("solo cuenta lo marcado como llevado que es de la despensa", () => {
  const items = [item("arroz"), item("leche"), item("cafe")];
  const ids = carriedPantryIds(
    list([
      ["arroz", true],
      ["leche", false], // no se llevó
      [null, true], // extra de visita
      ["borrado", true], // ya no está en la despensa
      ["arroz", true], // repetido
      ["cafe", true],
    ]),
    items,
  );
  assert.deepEqual(ids, ["arroz", "cafe"]);
});

test("al reponer se quita la caducidad vencida o próxima, no la lejana", () => {
  const items = [
    item("leche", { expiresAt: "2026-10-19" }), // vencida
    item("huevo", { expiresAt: "2026-10-25" }), // por vencer
    item("arroz", { expiresAt: "2027-05-01" }), // lejana
    item("sal", { expiresAt: "2026-10-19" }), // no se compró
  ];
  const next = markRestocked(items, ["leche", "huevo", "arroz"], AT);
  const byId = Object.fromEntries(next.map((row) => [row.id, row]));
  assert.equal(byId.leche!.restockedAt, AT);
  assert.equal(byId.leche!.expiresAt, undefined);
  assert.equal(byId.huevo!.expiresAt, undefined);
  assert.equal(byId.arroz!.expiresAt, "2027-05-01");
  assert.equal(byId.sal!.restockedAt, undefined);
  assert.equal(byId.sal!.expiresAt, "2026-10-19");
  assert.equal(next[3], items[3], "lo que no se tocó conserva su objeto");
});

test("un escaneo nuevo borra las marcas", () => {
  const items = markRestocked([item("arroz"), item("leche")], ["arroz"], AT);
  const cleared = clearRestocked(items);
  assert.ok(cleared.every((row) => !("restockedAt" in row)));
  const untouched = [item("sal")];
  assert.equal(clearRestocked(untouched), untouched);
});

test("la última lectura descuenta lo que ya se trajo", () => {
  const items = markRestocked(
    [item("arroz"), item("leche"), item("huevo"), item("cafe"), item("sal")],
    ["leche", "huevo", "sal"],
    AT,
  );
  const scan: ScanReport = {
    id: "s",
    at: "2026-10-20T10:00:00.000Z",
    note: "",
    hits: [],
    present: 2,
    missing: 4,
    missingIds: ["leche", "huevo", "cafe", "borrado"],
  };
  const summary = homeSummary(items, scan);
  assert.equal(summary.restocked, 3);
  assert.equal(summary.since, AT);
  assert.equal(summary.until, AT);
  // sal se repuso pero no faltaba; "borrado" se quitó de la despensa después de la lectura
  // (sigue contando como faltante, igual que antes): 4 faltaban, 2 ya se trajeron
  assert.deepEqual(summary.scan, { seen: 2, back: 2, missing: 2 });

  // Sin repuestos, Hoy muestra exactamente los números guardados de la lectura
  assert.deepEqual(homeSummary(clearRestocked(items), scan).scan, { seen: 2, back: 0, missing: 4 });

  const noScan = homeSummary(items, null);
  assert.equal(noScan.scan, null);
  assert.equal(noScan.restocked, 3);
});

test("las lecturas viejas sin ids se recalculan con lo que se vio", () => {
  const items = [item("arroz"), item("leche")];
  const legacy: ScanReport = {
    id: "s",
    at: "2026-10-20T10:00:00.000Z",
    note: "",
    hits: [{ name: "Arroz", brand: "", quantity: 1, unit: "pza", confidence: 0.9 }],
    present: 1,
    missing: 1,
  };
  assert.deepEqual(scanMissingIds(legacy, items), ["leche"]);
  const summary = homeSummary(markRestocked(items, ["leche"], AT), legacy);
  assert.deepEqual(summary.scan, { seen: 1, back: 1, missing: 0 });
});

function resetStore(items: PantryItem[], current: ShopList | null) {
  usePantry.setState({
    items,
    current,
    saved: [],
    lastScan: null,
    lastBackupAt: null,
    notice: null,
    view: "lista",
  });
}

test("finalizar deja en casa lo llevado y avisa cuántos", () => {
  resetStore(
    [item("arroz"), item("leche", { expiresAt: "2020-01-01" }), item("cafe")],
    list([
      ["arroz", true],
      ["leche", true],
      ["cafe", false],
      [null, true],
    ]),
  );
  usePantry.getState().finishList();
  const state = usePantry.getState();
  const byId = Object.fromEntries(state.items.map((row) => [row.id, row]));
  assert.ok(byId.arroz!.restockedAt);
  assert.ok(byId.leche!.restockedAt);
  assert.equal(byId.leche!.expiresAt, undefined);
  assert.equal(byId.cafe!.restockedAt, undefined);
  assert.equal(state.current, null);
  assert.equal(state.saved[0]!.status, "finished");
  assert.equal(state.notice?.text, "Compra finalizada. 2 productos ya están en casa.");

  // Lo repuesto no se vuelve a mandar a la lista por caducidad
  usePantry.getState().checkExpiredItems();
  assert.equal(usePantry.getState().current, null);
});

test("finalizar sin nada marcado deja la despensa igual", () => {
  resetStore([item("arroz")], list([["arroz", false]]));
  usePantry.getState().finishList();
  const state = usePantry.getState();
  assert.equal(state.items[0]!.restockedAt, undefined);
  assert.equal(state.notice?.text, "Compra finalizada. Precios pagados guardados.");
});

test("el próximo escaneo y «¡Se acabó!» quitan la marca", () => {
  resetStore(markRestocked([item("arroz"), item("leche")], ["arroz", "leche"], AT), null);
  usePantry
    .getState()
    .sendToShopList(usePantry.getState().items.find((row) => row.id === "leche")!);
  let byId = Object.fromEntries(usePantry.getState().items.map((row) => [row.id, row]));
  assert.ok(byId.arroz!.restockedAt);
  assert.equal(byId.leche!.restockedAt, undefined);
  assert.equal(usePantry.getState().current?.lines[0]?.pantryItemId, "leche");

  usePantry.getState().rememberScan({
    id: "s",
    at: new Date().toISOString(),
    note: "Revisión a mano.",
    hits: [],
    present: 1,
    missing: 1,
    missingIds: ["leche"],
  });
  byId = Object.fromEntries(usePantry.getState().items.map((row) => [row.id, row]));
  assert.equal(byId.arroz!.restockedAt, undefined);
  assert.equal(usePantry.getState().lastScan?.missingIds?.[0], "leche");
});

test("cargar un respaldo reemplaza todo y borrar el teléfono olvida el respaldo", () => {
  resetStore([item("viejo")], list([["viejo", false]]));
  const backup = createBackup(
    {
      items: [item("arroz"), item("leche")],
      current: null,
      saved: [{ ...list([["arroz", true]]), status: "finished", finishedAt: AT }],
      lastScan: null,
      theme: "light",
      oneHandedMode: true,
    },
    new Date(AT),
  );
  usePantry.getState().restoreBackup(backup);
  let state = usePantry.getState();
  assert.deepEqual(
    state.items.map((row) => row.id),
    ["arroz", "leche"],
  );
  assert.equal(state.current, null);
  assert.equal(state.saved.length, 1);
  assert.equal(state.theme, "light");
  assert.equal(state.oneHandedMode, true);
  assert.equal(state.lastBackupAt, AT);
  assert.equal(state.view, "hoy");
  assert.equal(state.notice?.text, "Respaldo cargado: 2 productos y 1 lista.");

  // Y queda guardado en el almacenamiento del teléfono
  const persisted = JSON.parse(memory.get("mialacena") ?? "{}");
  assert.equal(persisted.state.lastBackupAt, AT);
  assert.equal(persisted.state.items.length, 2);

  usePantry.getState().wipe();
  state = usePantry.getState();
  assert.equal(state.lastBackupAt, null);
  assert.equal(state.items.length, 0);
});

test("los datos de la versión anterior migran sin error y sin perder nada", () => {
  // El store está en version 2 y v1 no guardaba los campos de respaldo/revisión.
  // Sin `migrate`, zustand registra "couldn't be migrated" al abrir ese teléfono.
  const migrate = usePantry.persist.getOptions().migrate;
  assert.ok(migrate, "el store debe declarar migrate");
  const v1 = {
    theme: "light" as const,
    view: "lista" as const,
    despensaTab: "catalogo" as const,
    items: [item("cafe")],
    current: null,
    saved: [],
    lastScan: null,
    oneHandedMode: true,
  };
  assert.deepEqual(migrate(v1, 1), v1);
});
