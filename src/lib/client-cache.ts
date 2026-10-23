/**
 * Caché del navegador para las consultas a servicios públicos.
 *
 * Evita pedir la misma ficha o el mismo tipo de cambio cada vez que se abre y
 * se cierra el editor de un producto o se cambia de pestaña. Es solo memoria
 * (se va al recargar), comparte las peticiones en vuelo y guarda a lo mucho
 * una hora: nada de esto se escribe en disco ni se envía a nadie.
 *
 * Los datos de la persona (despensa, listas, precios) NO pasan por aquí: esos
 * viven en el almacenamiento local de la app.
 */

type Entry = { at: number; value: unknown };

const entries = new Map<string, Entry>();
const inFlight = new Map<string, Promise<unknown>>();
const MAX_ENTRIES = 80;

export async function cachedRequest<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const hit = entries.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;

  const running = inFlight.get(key);
  if (running) return running as Promise<T>;

  const promise = load()
    .then((value) => {
      entries.set(key, { at: Date.now(), value });
      if (entries.size > MAX_ENTRIES) {
        const oldest = entries.keys().next().value;
        if (oldest !== undefined) entries.delete(oldest);
      }
      return value;
    })
    .finally(() => inFlight.delete(key));

  inFlight.set(key, promise);
  return promise;
}

/** Al borrar los datos del teléfono también se olvida lo cacheado en memoria. */
export function clearClientCache(): void {
  entries.clear();
  inFlight.clear();
}
