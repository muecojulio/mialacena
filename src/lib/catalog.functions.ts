import { createServerFn } from "@tanstack/react-start";
import { rateLimit } from "@/lib/rate-limit";
import { fetchJson, ttlCache } from "./public-fetch.ts";
import {
  parseCatalogSearch,
  sourceSearchUrl,
  type CatalogHit,
} from "./product-sources.ts";

type CatalogOk = { ok: true; products: CatalogHit[] };
type CatalogErr = { ok: false; error: string };

/** El catálogo cambia poco: 10 minutos por búsqueda, compartidos en el proceso. */
const cache = ttlCache<CatalogHit[]>(10 * 60 * 1000, 50);

function asQuery(input: { query: string }): { query: string } {
  const query = String(input?.query ?? "")
    .trim()
    .slice(0, 60);
  if (query.length < 2) throw new Error("Escribe al menos 2 letras");
  return { query };
}

/**
 * Autocompletar marcas y productos al escribir en la despensa. Busca primero en
 * Open Food Facts (alimentos) y, si no hay resultados, en Open Beauty Facts
 * (higiene y limpieza). Sin llave y sin cuenta; solo viaja el texto escrito.
 */
export const searchProducts = createServerFn({ method: "POST" })
  .middleware([rateLimit("catalog", 24, 60_000)])
  .validator(asQuery)
  .handler(async ({ data }): Promise<CatalogOk | CatalogErr> => {
    const key = data.query.toLocaleLowerCase("es-MX");
    const hit = cache.get(key);
    if (hit) return { ok: true, products: hit };

    let answered = false;
    for (const source of ["openfoodfacts", "openbeautyfacts"] as const) {
      const json = await fetchJson(sourceSearchUrl(source, data.query), 7000);
      if (!json) continue;
      answered = true;
      const products = parseCatalogSearch(json);
      if (products.length) {
        cache.set(key, products);
        return { ok: true, products };
      }
    }

    if (!answered) return { ok: false, error: "El catálogo público no respondió." };
    cache.set(key, []);
    return { ok: true, products: [] };
  });
