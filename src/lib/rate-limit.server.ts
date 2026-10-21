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

function clientIp(): string {
  const request = getRequest();
  if (!request) return "local";
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim().slice(0, 64);
  return (request.headers.get("x-real-ip") ?? "local").slice(0, 64);
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
