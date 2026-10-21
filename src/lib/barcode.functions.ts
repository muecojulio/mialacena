import { createServerFn } from "@tanstack/react-start";
import { COMMON_BARCODES } from "./barcode-db.ts";

type BarcodeHit = {
  barcode: string;
  name: string;
  brand: string;
  category?: string;
  packageType?: string;
  unit?: string;
  targetQty?: number;
  usualPrice?: number;
};

type BarcodeOk = { ok: true; product: BarcodeHit };
type BarcodeErr = { ok: false; error: string; fallbackCode?: string };

export const lookupBarcode = createServerFn({ method: "POST" })
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

    // Try Open Food Facts
    try {
      const url = `https://world.openfoodfacts.org/api/v2/product/${code}.json`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "mialacena/1.0 (despensa personal)",
        },
      });

      if (res.ok) {
        const json = await res.json() as any;
        if (json && json.status === 1 && json.product) {
          const p = json.product;
          const name = String(p.product_name_es || p.product_name || p.generic_name || "").trim();
          const brand = Array.isArray(p.brands_tags)
            ? String(p.brands_tags[0] || "").trim()
            : String(p.brands || "").split(",")[0]?.trim() || "";

          return {
            ok: true,
            product: {
              barcode: code,
              name: name || `Producto ${code}`,
              brand: brand || "",
              category: "Abarrotes",
              packageType: "pieza",
              unit: "pza",
              targetQty: 1,
              usualPrice: 0,
            },
          };
        }
      }
    } catch {
      // ignore network errors to fallback
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
