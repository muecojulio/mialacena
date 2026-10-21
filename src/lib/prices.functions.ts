import { createServerFn } from "@tanstack/react-start";
import { openPricesUrl, summarizePublicPrices, type PublicPriceSummary } from "./open-prices.ts";
import { cleanBarcode, fetchJson, ttlCache } from "./public-fetch.ts";

type PricesOk = { ok: true; summary: PublicPriceSummary };
type PricesErr = { ok: false; error: string };

const cache = ttlCache<PublicPriceSummary>(60 * 60 * 1000);

/**
 * Precios públicos registrados por la comunidad (Open Prices). Es referencia
 * mundial por código de barras — casi siempre en otra moneda —, no el precio
 * de tu súper: la app lo muestra etiquetado y no lo copia a tu despensa.
 */
export const getPublicPrices = createServerFn({ method: "POST" })
  .validator((input: { barcode: string }): { barcode: string } => ({
    barcode: cleanBarcode(input?.barcode),
  }))
  .handler(async ({ data }): Promise<PricesOk | PricesErr> => {
    const hit = cache.get(data.barcode);
    if (hit) return { ok: true, summary: hit };

    const json = await fetchJson(openPricesUrl(data.barcode));
    if (!json) return { ok: false, error: "Los precios públicos no respondieron." };

    const summary = summarizePublicPrices(json, data.barcode);
    if (!summary) return { ok: false, error: "Aún no hay precios públicos para este código." };

    cache.set(data.barcode, summary);
    return { ok: true, summary };
  });
