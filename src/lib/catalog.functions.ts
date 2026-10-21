import { createServerFn } from "@tanstack/react-start";

type CatalogHit = { code: string; name: string; brand: string };
type CatalogOk = { ok: true; products: CatalogHit[] };
type CatalogErr = { ok: false; error: string };

const cache = new Map<string, { at: number; products: CatalogHit[] }>();
const CACHE_MS = 10 * 60 * 1000;

function asQuery(input: { query: string }): { query: string } {
  const query = String(input?.query ?? "")
    .trim()
    .slice(0, 60);
  if (query.length < 2) throw new Error("Escribe al menos 2 letras");
  return { query };
}

export const searchProducts = createServerFn({ method: "POST" })
  .validator(asQuery)
  .handler(async ({ data }): Promise<CatalogOk | CatalogErr> => {
    const key = data.query.toLocaleLowerCase("es-MX");
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) return { ok: true, products: hit.products };

    const url = new URL("https://search.openfoodfacts.org/search");
    url.searchParams.set("q", data.query);
    url.searchParams.set("page_size", "8");
    url.searchParams.set("lc", "es");

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "mialacena/1.0 (despensa personal)",
        },
      });
    } catch {
      return { ok: false, error: "El catálogo público no respondió." };
    }
    if (!response.ok) return { ok: false, error: "El catálogo público no está disponible." };

    const body = (await response.json()) as {
      hits?: { code?: string; product_name?: string; brands?: string[] | string }[];
    };
    const products: CatalogHit[] = [];
    const seen = new Set<string>();
    for (const row of body.hits ?? []) {
      const name = String(row.product_name ?? "").trim();
      if (!name) continue;
      const brand = Array.isArray(row.brands)
        ? String(row.brands[0] ?? "").trim()
        : String(row.brands ?? "")
            .split(",")[0]
            ?.trim() ?? "";
      const code = String(row.code ?? "");
      const id = `${name}|${brand}`.toLocaleLowerCase("es-MX");
      if (seen.has(id)) continue;
      seen.add(id);
      products.push({ code, name: name.slice(0, 80), brand: brand.slice(0, 80) });
      if (products.length >= 6) break;
    }
    cache.set(key, { at: Date.now(), products });
    if (cache.size > 50) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
    return { ok: true, products };
  });
