/**
 * Familia **Open \* Facts** — tres servicios públicos, sin llave y sin registro,
 * que comparten el mismo servidor de datos abiertos (repositorio público
 * github.com/openfoodfacts/openfoodfacts-server, licencia ODbL):
 *
 *   1. **Open Food Facts** (alimentos) — el que ya usaba la app.
 *   2. **Open Beauty Facts** (higiene y belleza) — `world.openbeautyfacts.org`.
 *   3. **Open Products Facts** (limpieza y hogar) — `world.openproductsfacts.org`.
 *
 * La despensa no es solo comida: cloro, jabón y pasta de dientes también se
 * escanean. Con esta cadena, un código que Open Food Facts no conoce se busca
 * en los otros dos antes de darlo por desconocido. Todo se consulta por código
 * de barras; nunca sale de aquí un dato del teléfono.
 *
 * Este módulo no toca la red por sí mismo: recibe el `fetcher` para poder
 * probarse con respuestas reales recortadas.
 */
import { offProductUrl, parseOffProduct, type OffProduct } from "./off.ts";
import { fetchJson, ttlCache } from "./public-fetch.ts";
import type { PublicFactsSource } from "./types.ts";

export type ProductSource = {
  id: PublicFactsSource;
  /** Nombre público, para atribuir en la interfaz. */
  label: string;
  /** Qué tipo de productos cubre, en corto. */
  covers: string;
  host: string;
};

/** Orden de búsqueda: primero alimentos (lo más común en una despensa). */
export const PRODUCT_SOURCES: readonly ProductSource[] = [
  { id: "openfoodfacts", label: "Open Food Facts", covers: "Alimentos", host: "world.openfoodfacts.org" },
  {
    id: "openbeautyfacts",
    label: "Open Beauty Facts",
    covers: "Higiene y belleza",
    host: "world.openbeautyfacts.org",
  },
  {
    id: "openproductsfacts",
    label: "Open Products Facts",
    covers: "Limpieza y hogar",
    host: "world.openproductsfacts.org",
  },
];

export function productSourceLabel(source: PublicFactsSource): string {
  return PRODUCT_SOURCES.find((row) => row.id === source)?.label ?? PRODUCT_SOURCES[0]!.label;
}

/** URL de la API v2 de un servicio concreto. */
export function sourceProductUrl(source: PublicFactsSource, code: string): string {
  if (source === "openfoodfacts") return offProductUrl(code);
  const host = PRODUCT_SOURCES.find((row) => row.id === source)!.host;
  const url = new URL(offProductUrl(code));
  url.host = host;
  return url.toString();
}

/** Búsqueda por texto (autocompletar marcas) en un servicio concreto. */
export function sourceSearchUrl(source: PublicFactsSource, query: string): string {
  if (source === "openfoodfacts") {
    const url = new URL("https://search.openfoodfacts.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("page_size", "8");
    url.searchParams.set("lc", "es");
    return url.toString();
  }
  const host = PRODUCT_SOURCES.find((row) => row.id === source)!.host;
  const url = new URL(`https://${host}/cgi/search.pl`);
  url.searchParams.set("search_terms", query);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "8");
  url.searchParams.set("lc", "es");
  return url.toString();
}

export type SourceLookup = {
  /** Producto encontrado, o `null` si ningún servicio lo conoce. */
  product: OffProduct | null;
  /** Servicio que respondió con la ficha. */
  source: PublicFactsSource | null;
  /**
   * `true` si al menos un servicio contestó (aunque no conociera el código).
   * Distingue «no lo conozco» de «no hubo red», para el mensaje correcto.
   */
  answered: boolean;
};

/** Lo que necesita la búsqueda: una función que devuelva JSON o `null`. */
export type JsonFetcher = (url: string, timeoutMs?: number) => Promise<unknown | null>;

/**
 * Fichas ya vistas: 6 horas para las encontradas y 10 minutos para los códigos
 * que nadie conoce (así no se castiga a los tres servicios cada vez que alguien
 * vuelve a escanear el mismo producto de limpieza).
 */
const foundCache = ttlCache<OffProduct>(6 * 60 * 60 * 1000, 200);
const unknownCache = ttlCache<true>(10 * 60 * 1000, 200);

/**
 * Busca un código en toda la familia Open \* Facts, en orden, y se detiene en
 * el primer servicio que lo conoce. Con `sources` se puede acotar la búsqueda
 * (por ejemplo, sólo alimentos al escanear un producto comestible).
 */
export async function findProductByCode(
  code: string,
  fetcher: JsonFetcher = fetchJson,
  sources: readonly PublicFactsSource[] = PRODUCT_SOURCES.map((row) => row.id),
): Promise<SourceLookup> {
  const cached = foundCache.get(code);
  if (cached) return { product: cached, source: cached.source, answered: true };
  if (unknownCache.get(code)) return { product: null, source: null, answered: true };

  let answered = false;
  for (const source of sources) {
    const json = await fetcher(sourceProductUrl(source, code), 6000);
    if (!json) continue;
    answered = true;
    const product = parseOffProduct(json, new Date().toISOString(), source);
    if (product) {
      foundCache.set(code, product);
      return { product, source, answered: true };
    }
  }

  if (answered) unknownCache.set(code, true);
  return { product: null, source: null, answered };
}

export type CatalogHit = { code: string; name: string; brand: string };

/**
 * Normaliza la búsqueda por texto de dos respuestas distintas de la familia:
 *   - Open Food Facts (`search.openfoodfacts.org`): `{ hits: [{ code, product_name, brands[] }] }`
 *   - Open Beauty / Products Facts (Product Opener clásico): `{ products: [{ code, product_name, brands }] }`
 * Devuelve como máximo 6, sin nombres repetidos.
 */
export function parseCatalogSearch(json: unknown): CatalogHit[] {
  if (typeof json !== "object" || json === null) return [];
  const root = json as Record<string, unknown>;
  const rows = Array.isArray(root.hits)
    ? root.hits
    : Array.isArray(root.products)
      ? root.products
      : [];

  const out: CatalogHit[] = [];
  const seen = new Set<string>();
  for (const row of rows.slice(0, 20)) {
    if (typeof row !== "object" || row === null || Array.isArray(row)) continue;
    const entry = row as Record<string, unknown>;
    const name = String(entry.product_name ?? entry.product_name_es ?? "").trim().slice(0, 80);
    if (name.length < 2) continue;
    const brand = Array.isArray(entry.brands)
      ? String(entry.brands[0] ?? "").trim().slice(0, 80)
      : String(entry.brands ?? "").split(",")[0]?.trim().slice(0, 80) ?? "";
    const code = String(entry.code ?? "").replace(/\D/g, "").slice(0, 24);
    const id = `${name}|${brand}`.toLocaleLowerCase("es-MX");
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ code, name, brand });
    if (out.length >= 6) break;
  }
  return out;
}
