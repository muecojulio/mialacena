/**
 * Contadores del límite de frecuencia (solo servidor — `.server.ts`).
 *
 * Es por instancia — en serverless cada copia lleva su propio contador — pero
 * alcanza para frenar abuso del proxy a APIs públicas y del `XAI_API_KEY`. El
 * almacenamiento se poda solo; nada de esto identifica ni guarda datos
 * personales.
 */
import { getRequest } from "@tanstack/react-start/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 2000;

/** Deja solo caracteres de IP/host y un tope de largo (nada de basura en la llave). */
function cleanIp(value: string): string {
  return value.replace(/[^0-9a-fA-F:.]/g, "").slice(0, 64) || "local";
}

/**
 * IP del cliente para contar permisos. Se prefieren los encabezados que pone
 * la plataforma (Vercel reescribe `x-vercel-forwarded-for`; el proxy, `x-real-ip`)
 * sobre un `x-forwarded-for` que el cliente podría intentar inventar. Aun así
 * esto es una defensa en profundidad: el límite es por instancia y su objetivo
 * es frenar abuso casual, no identificar a nadie (no se guarda en ningún lado).
 */
function clientIp(): string {
  const request = getRequest();
  if (!request) return "local";
  const headers = request.headers;
  const platform = headers.get("x-vercel-forwarded-for") ?? headers.get("x-real-ip");
  if (platform) return cleanIp(platform.split(",")[0]!.trim());
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return cleanIp(forwarded.split(",")[0]!.trim());
  return "local";
}

function prune(now: number): void {
  if (buckets.size <= MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
    if (buckets.size <= MAX_BUCKETS) break;
  }
}

/** Consume un permiso; `true` si sigue dentro del límite. */
export function allowRequest(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const id = `${key}|${clientIp()}`;
  const bucket = buckets.get(id);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + windowMs });
    prune(now);
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}
