import { createServerFn } from "@tanstack/react-start";
import { rateLimit } from "@/lib/rate-limit";
import { offProductUrl, parseOffProduct, type OffProduct } from "./off.ts";
import { cleanBarcode, fetchJson, ttlCache } from "./public-fetch.ts";

type FactsOk = { ok: true; product: OffProduct };
type FactsErr = { ok: false; error: string };

/** Una ficha pública cambia poco: caché de 6 horas por código. */
const cache = ttlCache<OffProduct>(6 * 60 * 60 * 1000);

/**
 * Ficha pública de un código (Open Food Facts): Nutri-Score, alérgenos,
 * ingredientes, nutrimentos y foto. Sin llave; solo viaja el código.
 */
export const getProductFacts = createServerFn({ method: "POST" })
  .middleware([rateLimit("facts", 30, 60_000)])
  .validator((input: { barcode: string }): { barcode: string } => ({
    barcode: cleanBarcode(input?.barcode),
  }))
  .handler(async ({ data }): Promise<FactsOk | FactsErr> => {
    const hit = cache.get(data.barcode);
    if (hit) return { ok: true, product: hit };

    const json = await fetchJson(offProductUrl(data.barcode));
    if (!json) return { ok: false, error: "La ficha pública no respondió. Tu despensa sigue como está." };

    const product = parseOffProduct(json);
    if (!product) {
      return { ok: false, error: "Open Food Facts aún no conoce este código. Puedes llenar el producto a mano." };
    }
    cache.set(data.barcode, product);
    return { ok: true, product };
  });
