/**
 * Nominatim — geocodificación inversa de OpenStreetMap (pública, sin llave ni
 * registro). La usa «Tiendas cercanas» para ponerle nombre al punto donde estás
 * («Súpers cerca de Coyoacán») en vez de enseñar coordenadas.
 *
 * Privacidad: la ubicación sale del teléfono directo a OpenStreetMap, con el
 * permiso del sistema, igual que la consulta de Overpass. No pasa por el
 * servidor de mialacena ni se guarda.
 *
 * Política de uso de Nominatim: máximo 1 petición por segundo y un
 * `User-Agent`/`Referer` identificable (aquí lo pone el navegador). Solo se
 * llama una vez por búsqueda, cuando la persona lo pide.
 */

export type GeoPlace = {
  /** «Coyoacán, Ciudad de México» — para el encabezado. */
  short: string;
  /** Nombre completo que devuelve el mapa, por si se quiere mostrar entero. */
  display: string;
};

export function reverseGeocodeUrl(lat: number, lon: number): string {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", lat.toFixed(5));
  url.searchParams.set("lon", lon.toFixed(5));
  url.searchParams.set("zoom", "16");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("accept-language", "es");
  return url.toString();
}

type Raw = Record<string, unknown>;

function asText(value: unknown, max = 80): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Convierte `reverse?format=jsonv2` en una etiqueta corta. `null` si no sirve. */
export function parseNominatimPlace(json: unknown): GeoPlace | null {
  if (typeof json !== "object" || json === null || Array.isArray(json)) return null;
  const root = json as Raw;
  if (typeof root.error === "string" || root.error === true) return null;

  const display = asText(root.display_name, 160);
  const address =
    typeof root.address === "object" && root.address !== null && !Array.isArray(root.address)
      ? (root.address as Raw)
      : {};

  const neighbourhood = asText(address.neighbourhood ?? address.suburb ?? address.quarter, 60);
  const city = asText(
    address.city ?? address.town ?? address.village ?? address.municipality ?? address.county,
    60,
  );
  const state = asText(address.state, 60);

  const parts = [neighbourhood || city, neighbourhood && city ? city : state].filter(
    (part, index, all) => Boolean(part) && all.indexOf(part) === index,
  );
  const short = parts.join(", ") || display.split(",").slice(0, 2).join(",").trim();
  if (!short) return null;
  return { short, display: display || short };
}

/** Pide el nombre del lugar al mapa público. `null` si no responde. */
export async function findPlaceName(lat: number, lon: number): Promise<GeoPlace | null> {
  try {
    const res = await fetch(reverseGeocodeUrl(lat, lon), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return parseNominatimPlace(await res.json());
  } catch {
    return null;
  }
}
