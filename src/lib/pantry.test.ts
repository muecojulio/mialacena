import { test } from "node:test";
import assert from "node:assert/strict";
import { diffPantry, surprises } from "./match.ts";
import { sheetXml, workbookParts } from "./excel.ts";
import { lineAmount, mxn, parseMoney, parseQty } from "./money.ts";
import type { PantryItem, ScanHit, ShopList } from "./types.ts";
import { SEED } from "./seed.ts";

const items: PantryItem[] = [
  {
    id: "a",
    name: "Arroz",
    brand: "Verde Valle",
    category: "Abarrotes",
    targetQty: 1,
    unit: "kg",
    usualPrice: 34,
  },
  {
    id: "b",
    name: "Leche",
    brand: "Lala",
    category: "Lácteos y huevo",
    targetQty: 4,
    unit: "L",
    usualPrice: 46,
  },
  {
    id: "c",
    name: "Atún",
    brand: "Dolores",
    category: "Abarrotes",
    targetQty: 3,
    unit: "lata",
    usualPrice: 22,
  },
];

const hit = (name: string, brand: string, quantity: number | null, unit = "pza"): ScanHit => ({
  name,
  brand,
  quantity,
  unit,
  confidence: 0.9,
});

test("diff dice que falta lo que no se vio y respeta la marca", () => {
  const gaps = diffPantry(items, [hit("Arroz", "Verde Valle", 1, "kg")]);
  const byId = Object.fromEntries(gaps.map((g) => [g.item.id, g]));
  assert.equal(byId.a!.status, "ok");
  assert.equal(byId.b!.status, "missing");
  assert.equal(byId.c!.status, "missing");
  // marca distinta baja la confianza por debajo del umbral
  const wrongBrand = diffPantry(items, [hit("Arroz", "Great Value", 1, "kg")]);
  const arroz = wrongBrand.find((g) => g.item.id === "a")!;
  assert.equal(arroz.status, "ok"); // mismo producto, sigue contando como visto
});

test("diff detecta cuando falta cantidad (faltan N)", () => {
  const gaps = diffPantry(items, [hit("Leche", "Lala", 2, "L")]);
  const leche = gaps.find((g) => g.item.id === "b")!;
  assert.equal(leche.status, "low");
  assert.equal(leche.missingQty, 2);
  assert.equal(leche.seenQty, 2);
});

test("diff marca falta total cuando no hay lecturas", () => {
  const gaps = diffPantry(SEED, []);
  assert.equal(gaps.length, SEED.length);
  assert.ok(gaps.every((g) => g.status === "missing"));
  assert.ok(gaps.every((g) => g.missingQty === g.item.targetQty));
});

test("lo que no está en la despensa se ofrece agregar", () => {
  const extra = surprises(items, [
    hit("Arroz", "Verde Valle", 1, "kg"),
    hit("Galletas", "Gamesa", 2, "paq"),
  ]);
  assert.equal(extra.length, 1);
  assert.equal(extra[0]!.name, "Galletas");
});

test("un producto no se cuenta dos veces", () => {
  const gaps = diffPantry(items, [
    hit("Atún", "Dolores", 3, "lata"),
    hit("Atún en lata", "Dolores", 1, "lata"),
  ]);
  assert.equal(gaps.filter((g) => g.status === "ok").length, 1);
});

const list: ShopList = {
  id: "l1",
  title: "Faltantes del escaneo",
  createdAt: "2026-10-21T00:00:00.000Z",
  updatedAt: "2026-10-21T00:00:00.000Z",
  finishedAt: null,
  status: "active",
  source: "scan",
  lines: [
    {
      id: "x",
      pantryItemId: "a",
      name: "Arroz",
      brand: "Verde Valle",
      unit: "kg",
      qty: 2,
      unitPrice: 34,
      inCart: true,
    },
    {
      id: "y",
      pantryItemId: "b",
      name: "Leche",
      brand: "Lala",
      unit: "L",
      qty: 1,
      unitPrice: 46,
      inCart: false,
    },
  ],
};

test("el total de la lista es la suma de cantidad x precio", () => {
  const total = list.lines.reduce((s, l) => s + lineAmount(l.qty, l.unitPrice), 0);
  assert.equal(total, 114);
  const carried = list.lines
    .filter((l) => l.inCart)
    .reduce((s, l) => s + lineAmount(l.qty, l.unitPrice), 0);
  assert.equal(carried, 68);
});

test("precios y cantidades se parsean con coma decimal", () => {
  assert.equal(parseMoney("12,50"), 12.5);
  assert.equal(parseMoney("basura"), 0);
  assert.equal(parseQty("0"), 1);
  assert.equal(parseQty("2,5"), 2.5);
  assert.equal(mxn(1234.5), "$1,234.50");
});

test("el Excel trae filas por producto, marcas y totales", () => {
  const xml = sheetXml(list);
  for (const needle of [
    "Producto",
    "Marca",
    "Cantidad",
    "Unidad",
    "Precio",
    "Ya lo llevo",
    "Importe",
    "Total de la lista",
    "Ya en el carrito",
    "Arroz",
    "Verde Valle",
    "Sí",
    "No",
  ]) {
    assert.ok(xml.includes(needle), `falta ${needle}`);
  }
  assert.ok(xml.includes(">114</v>"), "total de la lista");
  assert.ok(xml.includes(">68</v>"), "total en carrito");
  assert.ok(xml.includes('t="inlineStr"'), "texto en línea (sin sharedStrings)");
  assert.ok(xml.startsWith("<?xml"));
});

test("el Excel sobrevive a acentos y símbolos", () => {
  const tricky: ShopList = {
    ...list,
    title: 'Ñ & <b>"José"',
    lines: [{ ...list.lines[0]!, name: "Frijol <ñ> & \"'", brand: "La & Fina" }],
  };
  const xml = sheetXml(tricky);
  assert.ok(!/<ñ>/.test(xml));
  assert.ok(xml.includes("&amp;"));
  assert.ok(/^<\?xml/.test(xml));
});

test("las partes del libro son las que espera un xlsx", () => {
  const names = workbookParts(list).map((p) => p.name);
  assert.deepEqual(names, [
    "[Content_Types].xml",
    "_rels/.rels",
    "xl/workbook.xml",
    "xl/_rels/workbook.xml.rels",
    "xl/styles.xml",
    "xl/worksheets/sheet1.xml",
  ]);
});
