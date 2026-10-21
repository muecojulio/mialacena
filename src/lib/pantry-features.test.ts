import test from "node:test";
import assert from "node:assert/strict";
import { parseTicketText } from "./ticket-parser.ts";
import { formatWhatsAppMessage } from "./whatsapp.ts";
import { lineFromItem } from "./store.ts";
import { COMMON_BARCODES } from "./barcode-db.ts";
import { categoryTotals, sheetXml } from "./excel.ts";
import { createBackup, parseBackup, serializeBackup } from "./backup.ts";
import {
  comparePantryItem,
  describePurchaseVsConsumption,
  filterExpiringItems,
  formatLineConsumptionDetail,
  formatPurchaseEquivalence,
  getReviewReminderStatus,
  summarizePantryComparison,
} from "./pantry-helpers.ts";
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
  assert.equal(result.items[0]!.name, "LECHE ENTERA LALA");
  assert.equal(result.items[0]!.price, 28.5);
  assert.equal(result.items[1]!.name, "HUEVO SAN JUAN");
  assert.equal(result.items[1]!.price, 52.0);
  assert.equal(result.total, 114.5);
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

test("Unidades de compra vs. consumo: formatea «1 paquete = 6 piezas» y convierte a paquetes", () => {
  const huevo: PantryItem = {
    id: "huevo",
    name: "Huevo",
    brand: "San Juan",
    category: "Lácteos y huevo",
    targetQty: 12,
    currentQty: 6,
    unit: "pza",
    usualPrice: 52,
    packageType: "paquete",
    packageSize: 6,
    packageUnit: "piezas",
  };

  assert.equal(formatPurchaseEquivalence(huevo), "1 paquete = 6 piezas");
  const info = describePurchaseVsConsumption(huevo);
  assert.equal(info.packagesCount, 2); // 12 piezas / 6 piezas por paquete = 2 paquetes
  assert.equal(info.consumptionCount, 12);
  assert.match(info.summary, /1 paquete = 6 piezas/);

  // En la lista: si llevas 2 paquetes, explica que llevas 12 piezas
  assert.equal(
    formatLineConsumptionDetail(huevo, 2),
    "1 paquete = 6 piezas · Llevas 2 paquetes (12 piezas)",
  );
});

test("Foto del producto guardada localmente: se conserva en respaldo de ida y vuelta", () => {
  const photoDataUrl = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/";
  const itemWithPhoto: PantryItem = {
    id: "cafe",
    name: "Café soluble",
    brand: "Nescafé",
    category: "Bebidas",
    targetQty: 1,
    currentQty: 0,
    unit: "pza",
    usualPrice: 89,
    packageType: "frasco",
    packageSize: 1,
    packageUnit: "piezas",
    photo: photoDataUrl,
  };

  const backup = createBackup({
    items: [itemWithPhoto],
    current: null,
    saved: [],
    lastScan: null,
    reviewIntervalDays: 14,
    lastReviewedAt: "2026-10-20T12:00:00.000Z",
  });

  const parsed = parseBackup(serializeBackup(backup));
  assert.ok(parsed.ok);
  assert.equal(parsed.backup.data.items[0]!.photo, photoDataUrl);
  assert.equal(parsed.backup.data.items[0]!.currentQty, 0);
  assert.equal(parsed.backup.data.reviewIntervalDays, 14);
  assert.equal(parsed.backup.data.lastReviewedAt, "2026-10-20T12:00:00.000Z");
});

test("Vista «qué tengo ahora» vs. «qué debería tener»: detecta completos, bajos y en cero", () => {
  const items: PantryItem[] = [
    {
      id: "arroz",
      name: "Arroz",
      brand: "Verde Valle",
      category: "Abarrotes",
      targetQty: 1,
      currentQty: 1,
      unit: "kg",
      usualPrice: 34,
    },
    {
      id: "huevo",
      name: "Huevo",
      brand: "San Juan",
      category: "Lácteos y huevo",
      targetQty: 12,
      currentQty: 6,
      unit: "pza",
      usualPrice: 52,
      packageType: "paquete",
      packageSize: 6,
      packageUnit: "piezas",
    },
    {
      id: "cafe",
      name: "Café",
      brand: "Nescafé",
      category: "Bebidas",
      targetQty: 1,
      currentQty: 0,
      unit: "pza",
      usualPrice: 89,
    },
  ];

  const summary = summarizePantryComparison(items);
  assert.equal(summary.okCount, 1);
  assert.equal(summary.lowCount, 1);
  assert.equal(summary.emptyCount, 1);
  assert.equal(summary.incompleteCount, 2);

  const huevoRow = comparePantryItem(items[1]!);
  assert.equal(huevoRow.haveQty, 6);
  assert.equal(huevoRow.shouldHaveQty, 12);
  assert.equal(huevoRow.missingQty, 6);
  assert.equal(huevoRow.packagesToBuy, 1); // faltan 6 piezas = 1 paquete de 6
});

test("Modo «revisar caducidades»: filtra solo lo que vence pronto y lo ordena por urgencia", () => {
  const today = "2026-10-21";
  const items: PantryItem[] = [
    {
      id: "lejano",
      name: "Atún",
      brand: "Dolores",
      category: "Abarrotes",
      targetQty: 3,
      unit: "lata",
      usualPrice: 22,
      expiresAt: "2026-12-15",
    },
    {
      id: "pronto",
      name: "Huevo",
      brand: "San Juan",
      category: "Lácteos y huevo",
      targetQty: 12,
      unit: "pza",
      usualPrice: 52,
      expiresAt: "2026-10-25",
    },
    {
      id: "vencido",
      name: "Leche",
      brand: "Lala",
      category: "Lácteos y huevo",
      targetQty: 2,
      unit: "L",
      usualPrice: 46,
      expiresAt: "2026-10-19",
    },
  ];

  const filtered = filterExpiringItems(items, today, 7);
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0]!.item.id, "vencido");
  assert.equal(filtered[0]!.status, "expired");
  assert.equal(filtered[1]!.item.id, "pronto");
  assert.equal(filtered[1]!.status, "soon");
  assert.equal(filtered[1]!.daysLeft, 4);
});

test("Recordatorio de «revisar despensa» periódico: avisa cuando ya toca revisar", () => {
  // Revisada el 10 de octubre, intervalo cada 7 días -> el 21 de octubre ya toca revisar
  const due = getReviewReminderStatus("2026-10-10T15:00:00.000Z", null, 7, "2026-10-21");
  assert.equal(due.enabled, true);
  assert.equal(due.isDue, true);
  assert.equal(due.daysSince, 11);

  // Revisada el 19 de octubre, intervalo cada 7 días -> el 21 de octubre faltan 5 días
  const ok = getReviewReminderStatus("2026-10-19T15:00:00.000Z", null, 7, "2026-10-21");
  assert.equal(ok.enabled, true);
  assert.equal(ok.isDue, false);
  assert.equal(ok.daysUntil, 5);
});

test("Total por categoría en la lista y en el Excel", () => {
  const shopList: ShopList = {
    id: "cat-list",
    title: "Compra semanal",
    createdAt: "2026-10-21T10:00:00.000Z",
    updatedAt: "2026-10-21T10:00:00.000Z",
    finishedAt: null,
    status: "active",
    source: "manual",
    lines: [
      {
        id: "1",
        pantryItemId: "leche",
        name: "Leche",
        brand: "Lala",
        unit: "caja",
        qty: 2,
        unitPrice: 46,
        inCart: true,
        category: "Lácteos y huevo",
      },
      {
        id: "2",
        pantryItemId: "arroz",
        name: "Arroz",
        brand: "Verde Valle",
        unit: "bolsa",
        qty: 1,
        unitPrice: 34,
        inCart: false,
        category: "Abarrotes",
      },
      {
        id: "3",
        pantryItemId: "frijol",
        name: "Frijol",
        brand: "Verde Valle",
        unit: "bolsa",
        qty: 2,
        unitPrice: 45,
        inCart: true,
        category: "Abarrotes",
      },
    ],
  };

  const totals = categoryTotals(shopList);
  assert.equal(totals.length, 2);
  assert.equal(totals[0]!.category, "Lácteos y huevo");
  assert.equal(totals[0]!.total, 92);
  assert.equal(totals[0]!.carried, 92);
  assert.equal(totals[1]!.category, "Abarrotes");
  assert.equal(totals[1]!.total, 124);
  assert.equal(totals[1]!.carried, 90);

  const xml = sheetXml(shopList);
  assert.ok(xml.includes("Total por categoría"));
  assert.ok(xml.includes("Lácteos y huevo"));
  assert.ok(xml.includes("Abarrotes"));
  assert.ok(xml.includes(">92</v>"));
  assert.ok(xml.includes(">124</v>"));
});

test("Store: guardar foto local, ajustar existencias y pasar faltantes a la lista", async () => {
  const mem = new Map<string, string>();
  Object.assign(globalThis, {
    window: {
      localStorage: {
        getItem: (k: string) => mem.get(k) ?? null,
        setItem: (k: string, v: string) => void mem.set(k, String(v)),
        removeItem: (k: string) => void mem.delete(k),
      },
    },
  });
  const { usePantry } = await import("./store.ts");

  usePantry.setState({
    items: [
      {
        id: "huevo",
        name: "Huevo",
        brand: "San Juan",
        category: "Lácteos y huevo",
        targetQty: 12,
        currentQty: 12,
        unit: "pza",
        usualPrice: 50,
        packageType: "paquete",
        packageSize: 6,
        packageUnit: "piezas",
      },
    ],
    current: null,
    saved: [],
    lastScan: null,
    reviewIntervalDays: 7,
    lastReviewedAt: null,
  });

  // 1. Foto local
  usePantry.getState().setItemPhoto("huevo", "data:image/jpeg;base64,ABC123");
  assert.equal(usePantry.getState().items[0]!.photo, "data:image/jpeg;base64,ABC123");

  // 2. Ajustar qué tengo ahora (de 12 a 6 piezas -> falta 1 paquete de 6 piezas)
  usePantry.getState().setItemCurrentQty("huevo", 6);
  assert.equal(usePantry.getState().items[0]!.currentQty, 6);

  // 3. Pasar faltantes de la vista comparativa a la lista
  usePantry.getState().sendMissingFromComparisonToList();
  const list = usePantry.getState().current;
  assert.ok(list);
  assert.equal(list.lines.length, 1);
  assert.equal(list.lines[0]!.pantryItemId, "huevo");
  assert.equal(list.lines[0]!.qty, 1); // 1 paquete = 6 piezas faltantes
  assert.equal(list.lines[0]!.unit, "paquete");

  // 4. Recordatorio periódico y cambio de pestaña
  usePantry.getState().setReviewIntervalDays(14);
  assert.equal(usePantry.getState().reviewIntervalDays, 14);
  usePantry.getState().markPantryReviewed("2026-10-21T14:00:00.000Z");
  assert.equal(usePantry.getState().lastReviewedAt, "2026-10-21T14:00:00.000Z");
  usePantry.getState().openDespensaTab("caducidades");
  assert.equal(usePantry.getState().view, "despensa");
  assert.equal(usePantry.getState().despensaTab, "caducidades");

  // 5. Pestañas de Instalar app y Privacidad
  usePantry.getState().setView("instalar");
  assert.equal(usePantry.getState().view, "instalar");
  usePantry.getState().setView("privacidad");
  assert.equal(usePantry.getState().view, "privacidad");
  usePantry.getState().setView("hoy");
  assert.equal(usePantry.getState().view, "hoy");
});


