/**
 * Ayudante compartido para consultar APIs públicas sin llave desde el servidor.
 * Nunca lanza: devuelve `null` si la API no responde, para que la app siga
 * funcionando sin internet o sin el servicio (degradación suave).
 */
export async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown | null> {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        // Cortesía con las APIs públicas: identificarse ayuda a no parecer abuso.
        "User-Agent": "mialacena/1.0 (despensa personal)",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

/** Caché en memoria con TTL, mismo patrón que el catálogo de productos. */
export function ttlCache<T>(ttlMs: number, maxEntries = 60) {
  const entries = new Map<string, { at: number; value: T }>();
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
        if (oldest) entries.delete(oldest);
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
