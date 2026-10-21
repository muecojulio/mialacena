import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { summarizePublicPrices } from "./open-prices.ts";

/** Forma real de `GET prices.openfoodfacts.org/api/v1/prices?product_code=...` (recortada). */
const RESPONSE = {
  items: [
    {
      product_code: "3017620422003",
      price: 3.21,
      currency: "EUR",
      date: "2024-01-11",
      location: { osm_name: "Carrefour Villeurbanne", osm_address_country_code: "FR" },
    },
    {
      product_code: "3017620422003",
      price: 2.99,
      currency: "EUR",
      date: "2024-01-29",
      location: { osm_name: "Carrefour Market", osm_address_country_code: "FR" },
    },
    {
      product_code: "3017620422003",
      price: 3.5,
      currency: "EUR",
      date: "2024-02-02",
      location: { osm_name: "Monoprix", osm_address_country_code: "FR" },
    },
    // Otro código colado: debe ignorarse.
    { product_code: "999", price: 99, currency: "EUR", date: "2024-03-01", location: {} },
    // Precio inválido: debe ignorarse.
    { product_code: "3017620422003", price: 0, currency: "EUR", date: "2024-03-01", location: {} },
  ],
};

describe("summarizePublicPrices", () => {
  it("resume rango, mediana y último registro de la moneda dominante", () => {
    const summary = summarizePublicPrices(RESPONSE, "3017620422003");
    assert.ok(summary);
    assert.equal(summary.count, 3);
    assert.equal(summary.currency, "EUR");
    assert.equal(summary.min, 2.99);
    assert.equal(summary.median, 3.21);
    assert.equal(summary.max, 3.5);
    assert.equal(summary.latest?.place, "Monoprix");
    assert.equal(summary.latest?.country, "FR");
  });

  it("prefiere MXN si existe, aunque haya más registros en otra moneda", () => {
    const withMxn = {
      items: [
        ...RESPONSE.items,
        {
          product_code: "3017620422003",
          price: 68,
          currency: "MXN",
          date: "2025-01-01",
          location: { osm_name: "Walmart", osm_address_country_code: "MX" },
        },
      ],
    };
    const summary = summarizePublicPrices(withMxn, "3017620422003");
    assert.equal(summary?.currency, "MXN");
    assert.equal(summary?.median, 68);
  });

  it("sin precios útiles devuelve null", () => {
    assert.equal(summarizePublicPrices({ items: [] }, "1"), null);
    assert.equal(summarizePublicPrices(null, "1"), null);
  });
});
