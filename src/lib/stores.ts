/**
 * Tiendas cercanas con OpenStreetMap (API Overpass) — pública, sin llave.
 * Consulta el patrón `node/way["shop"=...](around:...)` de la documentación
 * abierta de Overpass QL.
 *
 * Privacidad: la ubicación sale del teléfono directo a Overpass desde el
 * navegador (con el permiso que pide el sistema); nunca pasa por el servidor
 * de mialacena ni se guarda.
 */

export type NearbyStore = {
  id: string;
  name: string;
  brand?: string;
  kind: string; // "Súper" | "Tienda" | "Tienda departamental"
  distanceM: number;
  lat: number;
  lon: number;
  mapUrl: string;
  directionsUrl: string;
};

const KIND_ES: Record<string, string> = {
  supermarket: "Súper",
  convenience: "Tienda",
  grocery: "Tienda",
  department_store: "Tienda departamental",
};

/** Distancia en línea recta (haversine), en metros. */
export function haversineM(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6_371_000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1).replace(".", ",")} km`;
}

export function buildOverpassQuery(lat: number, lon: number, radiusM = 2000): string {
  const kinds = "supermarket|convenience|grocery|department_store";
  return [
    "[out:json][timeout:15];",
    "(",
    `  node["shop"~"^(${kinds})$"](around:${radiusM},${lat},${lon});`,
    `  way["shop"~"^(${kinds})$"](around:${radiusM},${lat},${lon});`,
    ");",
    "out center 40;",
  ].join("\n");
}

type Raw = Record<string, unknown>;

function asRecord(value: unknown): Raw | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Raw)
    : null;
}

function asText(value: unknown, max = 80): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** Convierte la respuesta de Overpass en tiendas ordenadas por distancia. */
export function parseOverpassStores(
  json: unknown,
  origin: { lat: number; lon: number },
  limit = 8,
): NearbyStore[] {
  const elements = asRecord(json)?.elements;
  if (!Array.isArray(elements)) return [];
  const seen = new Set<string>();
  const stores: NearbyStore[] = [];

  for (const entry of elements) {
    const el = asRecord(entry);
    if (!el) continue;
    const tags = asRecord(el.tags) ?? {};
    const center = asRecord(el.center) ?? {};
    const lat = typeof el.lat === "number" ? el.lat : Number(center.lat);
    const lon = typeof el.lon === "number" ? el.lon : Number(center.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const kind = KIND_ES[asText(tags.shop, 30)] ?? "Tienda";
    const brand = asText(tags.brand, 50) || undefined;
    const name = asText(tags.name, 60) || brand || kind;
    const type = asText(el.type, 10) || "node";
    const id = String(el.id ?? `${lat},${lon}`);
    const dedupe = `${name.toLocaleLowerCase("es-MX")}@${lat.toFixed(4)},${lon.toFixed(4)}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    stores.push({
      id: `${type}/${id}`,
      name,
      brand,
      kind,
      distanceM: haversineM(origin.lat, origin.lon, lat, lon),
      lat,
      lon,
      mapUrl: `https://www.openstreetmap.org/${type}/${id}`,
      directionsUrl: `https://www.openstreetmap.org/directions?to=${lat}%2C${lon}`,
    });
  }
  return stores.sort((a, b) => a.distanceM - b.distanceM).slice(0, limit);
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function currentPosition(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Este navegador no comparte ubicación."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "Sin permiso de ubicación no puedo buscar tiendas cerca de ti."
              : "No se pudo obtener tu ubicación. Inténtalo de nuevo.",
          ),
        ),
      { timeout: 12_000, maximumAge: 300_000 },
    );
  });
}

/** Pide ubicación (permiso del sistema) y trae las tiendas en un radio de 2 km. */
export async function findNearbyStores(radiusM = 2000): Promise<NearbyStore[]> {
  const origin = await currentPosition();
  const query = buildOverpassQuery(origin.lat, origin.lon, radiusM);
  let lastError: unknown = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) throw new Error(`Overpass ${res.status}`);
      return parseOverpassStores(await res.json(), origin);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("El mapa público no respondió.");
}
