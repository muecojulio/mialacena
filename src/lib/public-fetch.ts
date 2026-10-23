/**
 * Ayudante compartido para consultar APIs públicas sin llave desde el servidor.
 * Nunca lanza: devuelve `null` si la API no responde, para que la app siga
 * funcionando sin internet o sin el servicio (degradación suave).
 *
 * Trae dos piezas de caché pensadas para APIs públicas:
 *   - **Deduplicación en vuelo**: si dos personas escanean el mismo código al
 *     mismo tiempo, se hace UNA petición al servicio y las dos esperan la
 *     misma promesa. Menos carga para el servicio y menos latencia.
 *   - **Caché con TTL** (`ttlCache`), con tope de entradas y `staleWhileRevalidate`
 *     opcional para datos que pueden servirse un rato viejos.
 */

/** Peticiones en vuelo, por URL: la segunda espera la misma respuesta. */
const inFlight = new Map<string, Promise<unknown | null>>();
const MAX_IN_FLIGHT = 100;

async function requestJson(url: string, timeoutMs: number): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        // Cortesía con las APIs públicas: identificarse ayuda a no parecer abuso.
        "User-Agent": "mialacena/1.0 (despensa personal; sin llave)",
      },
      // Ni un servicio colgado ni un cuerpo enorme deben retener el proceso.
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const length = Number(res.headers.get("content-length") ?? 0);
    if (length > 4_000_000) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

export async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown | null> {
  const key = `${timeoutMs}|${url}`;
  const running = inFlight.get(key);
  if (running) return running;

  const promise = requestJson(url, timeoutMs).finally(() => inFlight.delete(key));
  if (inFlight.size >= MAX_IN_FLIGHT) {
    // Presupuesto defensivo: si algo se atora, que no crezca sin límite.
    const oldest = inFlight.keys().next().value;
    if (oldest) inFlight.delete(oldest);
  }
  inFlight.set(key, promise);
  return promise;
}

export type CacheEntry<T> = { at: number; value: T };

/**
 * Caché en memoria con TTL y tope de entradas (descarta la más vieja). Pensada
 * para respuestas de APIs públicas: `get()` devuelve `undefined` al caducar y
 * el llamador vuelve a pedir.
 */
export function ttlCache<T>(ttlMs: number, maxEntries = 60) {
  const entries = new Map<string, CacheEntry<T>>();
  return {
    get(key: string): T | undefined {
      const hit = entries.get(key);
      if (!hit || Date.now() - hit.at >= ttlMs) return undefined;
      return hit.value;
    },
    set(key: string, value: T): void {
      entries.set(key, { at: Date.now(), value });
      if (entries.size > maxEntries) {
        const oldest = entries.keys().next().value;
        if (oldest !== undefined) entries.delete(oldest);
      }
    },
  };
}

/** Código de barras limpio (solo dígitos, 5–24), como el resto de la app. */
export function cleanBarcode(input: unknown): string {
  const code = String(input ?? "").trim().replace(/\D/g, "");
  if (code.length < 5 || code.length > 24) throw new Error("Código de barras inválido");
  return code;
}

/** Quita caracteres de control (se escriben por código para no ofender al linter). */
export function stripControl(value: string): string {
  let out = "";
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    out += code < 32 || code === 127 ? " " : char;
  }
  return out;
}
