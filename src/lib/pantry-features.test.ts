import test from "node:test";
import assert from "node:assert/strict";
import { parseTicketText } from "./ticket-parser.ts";
import { formatWhatsAppMessage } from "./whatsapp.ts";
import { lineFromItem } from "./store.ts";
import { COMMON_BARCODES } from "./barcode-db.ts";
import type { ShopList, PantryItem } from "./types.ts";

test("Ticket con foto: parseTicketText extrae nombres, precios y total", () => {
  const receipt = `
SUPERMERCADO EJEMPLO
FECHA: 2026-10-21
LECHE ENTERA LALA 28.50
HUEVO SAN JUAN 52.00
ARROZ VERDE VALLE 34.00
SUBTOTAL 114.50
IVA 0.00
TOTAL A PAGAR $ 114.50
GRACIAS POR SU COMPRA
`;
  const result = parseTicketText(receipt);
  assert.equal(result.items.length, 3);
  assert.equal(result.items[0].name, "LECHE ENTERA LALA");
  assert.equal(result.items[0].price, 28.50);
  assert.equal(result.items[1].name, "HUEVO SAN JUAN");
  assert.equal(result.items[1].price, 52.00);
  assert.equal(result.total, 114.50);
});

test("Enviar por WhatsApp: formatWhatsAppMessage formatea cantidades, precios y total", () => {
  const dummyList: ShopList = {
    id: "test-list",
    title: "Lista Súper Domingo",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    finishedAt: null,
    status: "active",
    source: "manual",
    spendingBudget: 500,
    lines: [
      {
        id: "1",
        pantryItemId: "leche",
        name: "Leche Lala",
        brand: "Lala",
        unit: "pieza",
        qty: 2,
        unitPrice: 28,
        inCart: false,
        isEssential: true,
      },
      {
        id: "2",
        pantryItemId: null,
        name: "Papas fritas",
        brand: "Sabritas",
        unit: "bolsa",
        qty: 1,
        unitPrice: 45,
        inCart: true,
        isExtra: true,
      },
    ],
  };

  const text = formatWhatsAppMessage(dummyList);
  assert.match(text, /Lista Súper Domingo/);
  assert.match(text, /Leche Lala/);
  assert.match(text, /Papas fritas/);
  assert.match(text, /Tope de gasto/);
  assert.match(text, /Total estimado/);
});

test("Empaque y Lo que has pagado: lineFromItem usa empaque y último precio pagado", () => {
  const item: PantryItem = {
    id: "arroz-1",
    name: "Arroz Extra",
    brand: "Verde Valle",
    category: "Abarrotes",
    targetQty: 2,
    unit: "kg",
    usualPrice: 35,
    packageType: "bolsa",
    isEssential: true,
    lastPrice: 38.5,
  };

  const line = lineFromItem(item);
  assert.equal(line.unit, "bolsa"); // talks in what you buy: bolsa
  assert.equal(line.unitPrice, 38.5); // starts with last real price paid, not usualPrice
  assert.equal(line.isEssential, true);
});

test("Código de barras: base de códigos rápidos reconoce EAN-13 habituales", () => {
  const code = "7501020512130";
  const item = COMMON_BARCODES[code];
  assert.ok(item);
  assert.equal(item.name, "Leche Entera 1L");
  assert.equal(item.brand, "Lala");
});
