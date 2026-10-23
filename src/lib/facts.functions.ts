import { createServerFn } from "@tanstack/react-start";
import { rateLimit } from "@/lib/rate-limit";
import type { OffProduct } from "./off.ts";
import { cleanBarcode } from "./public-fetch.ts";
import { findProductByCode } from "./product-sources.ts";

type FactsOk = { ok: true; product: OffProduct };
type FactsErr = { ok: false; error: string };

/**
 * Ficha pública de un código, sin llave ni registro. Se pregunta primero a
 * Open Food Facts y, si no lo conoce, a Open Beauty Facts y Open Products Facts
 * (limpieza, higiene). Solo viaja el código; la ficha se queda luego en el
 * teléfono.
 */
export const getProductFacts = createServerFn({ method: "POST" })
  .middleware([rateLimit("facts", 30, 60_000)])
  .validator((input: { barcode: string }): { barcode: string } => ({
    barcode: cleanBarcode(input?.barcode),
  }))
  .handler(async ({ data }): Promise<FactsOk | FactsErr> => {
    const found = await findProductByCode(data.barcode);
    if (found.product) return { ok: true, product: found.product };

    return {
      ok: false,
      error: found.answered
        ? "Ningún catálogo de la familia Open * Facts conoce este código todavía. Puedes llenar el producto a mano."
        : "La ficha pública no respondió. Tu despensa sigue como está.",
    };
  });
