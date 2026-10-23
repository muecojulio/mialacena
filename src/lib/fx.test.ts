import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  envFallbackRate,
  fxDateLabel,
  fxUrl,
  normalizeCurrency,
  parseFxRate,
  toMxn,
} from "./fx.ts";

/** Respuesta real (recortada) de api.frankfurter.app/latest?from=USD&to=MXN. */
const USD_MXN = {
  amount: 1.0,
  base: "USD",
  date: "2026-10-22",
  rates: { MXN: 18.42 },
};

describe("parseFxRate", () => {
  it("convierte la respuesta del BCE en una cotización a pesos", () => {
    const quote = parseFxRate(USD_MXN, "usd");
    assert.ok(quote);
    assert.equal(quote.base, "USD");
    assert.equal(quote.currency, "MXN");
    assert.equal(quote.rate, 18.42);
    assert.equal(quote.date, "2026-10-22");
    assert.equal(quote.source, "frankfurter");
  });

  it("rechaza bases distintas, tasas basura y pesos como origen", () => {
    assert.equal(parseFxRate({ ...USD_MXN, base: "EUR" }, "USD"), null);
    assert.equal(parseFxRate({ ...USD_MXN, rates: { MXN: "x" } }, "USD"), null);
    assert.equal(parseFxRate({ ...USD_MXN, rates: { MXN: 0 } }, "USD"), null);
    assert.equal(parseFxRate(USD_MXN, "MXN"), null);
    assert.equal(parseFxRate(null, "USD"), null);
  });

  it("si el servicio no dice la base, se usa la pedida", () => {
    const quote = parseFxRate({ rates: { MXN: 20 } }, "EUR");
    assert.ok(quote);
    assert.equal(quote.base, "EUR");
    assert.equal(quote.rate, 20);
    assert.equal(quote.date, "");
  });
});

describe("envFallbackRate", () => {
  it("lee el respaldo con coma o punto y descarta lo inválido", () => {
    const quote = envFallbackRate("usd", "18,50");
    assert.ok(quote);
    assert.equal(quote.rate, 18.5);
    assert.equal(quote.source, "env");
    assert.equal(envFallbackRate("USD", ""), null);
    assert.equal(envFallbackRate("USD", "gratis"), null);
    assert.equal(envFallbackRate("USD", "-3"), null);
    assert.equal(envFallbackRate("MXN", "1"), null);
  });
});

describe("toMxn / fxDateLabel / fxUrl", () => {
  it("redondea a centavos", () => {
    assert.equal(toMxn(3.99, 18.4213), 73.5);
    assert.equal(toMxn(10, 0), 0);
    assert.equal(toMxn(Number.NaN, 18), 0);
  });

  it("fecha legible en español y URL con parámetros", () => {
    assert.equal(fxDateLabel("2026-10-22"), "22 oct 2026");
    assert.equal(fxDateLabel(""), "");
    assert.equal(fxDateLabel("22/10/2026"), "");
    const url = new URL(fxUrl("usd"));
    assert.equal(url.host, "api.frankfurter.app");
    assert.equal(url.searchParams.get("from"), "USD");
    assert.equal(url.searchParams.get("to"), "MXN");
    assert.equal(normalizeCurrency(" eur "), "EUR");
  });
});
