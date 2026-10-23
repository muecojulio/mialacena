import { createServerFn } from "@tanstack/react-start";
import { rateLimit } from "@/lib/rate-limit";
import { COMMON_BARCODES } from "./barcode-db.ts";
import { cleanBarcode } from "./public-fetch.ts";
import { findProductByCode } from "./product-sources.ts";
import type { PublicFacts } from "./types.ts";

type BarcodeHit = {
  barcode: string;
  name: string;
  brand: string;
  category?: string;
  packageType?: string;
  unit?: string;
  targetQty?: number;
  usualPrice?: number;
  packageSize?: number;
  packageUnit?: string;
  /** Ficha pública (Nutri-Score, alérgenos, foto…) cuando la familia Open * Facts lo conoce. */
  facts?: PublicFacts;
};

type BarcodeOk = { ok: true; product: BarcodeHit };

/**
 * Código de barras → producto conocido. Tres niveles, todos sin llave:
 *   1. catálogo local de básicos (`barcode-db.ts`), instantáneo;
 *   2. Open Food Facts → Open Beauty Facts → Open Products Facts;
 *   3. si nadie lo conoce, una sugerencia editable con el código.
 */
export const lookupBarcode = createServerFn({ method: "POST" })
  .middleware([rateLimit("barcode", 30, 60_000)])
  .validator((input: { barcode: string }) => ({ barcode: cleanBarcode(input?.barcode) }))
  .handler(async ({ data }): Promise<BarcodeOk> => {
    const code = data.barcode;

    const local = COMMON_BARCODES[code];
    if (local) {
      return {
        ok: true,
        product: {
          barcode: code,
          name: local.name || `Producto ${code}`,
          brand: local.brand || "",
          category: local.category || "Abarrotes",
          packageType: local.packageType || "pieza",
          unit: local.unit || "pza",
          targetQty: local.targetQty || 1,
          usualPrice: local.usualPrice || 0,
        },
      };
    }

    const found = await findProductByCode(code);
    if (found.product) {
      const off = found.product;
      return {
        ok: true,
        product: {
          barcode: code,
          name: off.name,
          brand: off.brand,
          category: off.categoryGuess ?? "Abarrotes",
          packageType: "pieza",
          unit: "pza",
          targetQty: 1,
          usualPrice: 0,
          packageSize: off.packageSize,
          packageUnit: off.packageUnit,
          facts: off.facts,
        },
      };
    }

    return {
      ok: true,
      product: {
        barcode: code,
        name: `Producto ${code.slice(-4)}`,
        brand: "",
        category: "Abarrotes",
        packageType: "pieza",
        unit: "pza",
        targetQty: 1,
        usualPrice: 0,
      },
    };
  });
