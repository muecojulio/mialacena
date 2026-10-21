import { createServerFn } from "@tanstack/react-start";
import { rateLimit } from "@/lib/rate-limit";
import { COMMON_BARCODES } from "./barcode-db.ts";
import { offProductUrl, parseOffProduct } from "./off.ts";
import { fetchJson } from "./public-fetch.ts";
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
  /** Ficha pública (Nutri-Score, alérgenos, foto…) cuando OFF conoce el código. */
  facts?: PublicFacts;
};

type BarcodeOk = { ok: true; product: BarcodeHit };
type BarcodeErr = { ok: false; error: string; fallbackCode?: string };

export const lookupBarcode = createServerFn({ method: "POST" })
  .middleware([rateLimit("barcode", 30, 60_000)])
  .validator((input: { barcode: string }) => {
    const code = String(input?.barcode ?? "").trim().replace(/\D/g, "");
    if (code.length < 5) throw new Error("Código de barras inválido");
    return { barcode: code };
  })
  .handler(async ({ data }): Promise<BarcodeOk | BarcodeErr> => {
    const code = data.barcode;

    // Check local lookup first
    if (COMMON_BARCODES[code]) {
      const match = COMMON_BARCODES[code];
      return {
        ok: true,
        product: {
          barcode: code,
          name: match.name || "Producto " + code,
          brand: match.brand || "",
          category: match.category || "Abarrotes",
          packageType: match.packageType || "pieza",
          unit: match.unit || "pza",
          targetQty: match.targetQty || 1,
          usualPrice: match.usualPrice || 0,
        },
      };
    }

    // Try Open Food Facts (público, sin llave): nombre, marca y ficha completa
    const json = await fetchJson(offProductUrl(code));
    const off = json ? parseOffProduct(json) : null;
    if (off) {
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

    // Fallback: Return code with a generic suggestion
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
