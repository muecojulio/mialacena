/**
 * Encabezados de caché + seguridad en producción (Nitro → Vercel y
 * `vite preview`). Se registra como middleware global de h3 porque
 * `vite.config.ts` apunta `serverDir: "./server"`.
 *
 * El nombre `00-` lo mantiene primero en el orden de escaneo: así envuelve
 * también las respuestas que fabrica `grok-pwa.ts` (manifest / install) antes
 * de llamar a `next()`. La lógica vive en `scripts/http-headers.mjs`, el mismo
 * módulo que usa el dev server, para que dev y producción respondan igual.
 */
import { applyToResponse } from "../../scripts/http-headers.mjs";

interface HeadersEvent {
  url: URL;
  req: { method: string; headers: Headers };
}

function isHttps(event: HeadersEvent): boolean {
  const proto = event.req.headers.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0]!.trim() === "https";
  return false;
}

export default async function httpHeadersMiddleware(
  event: HeadersEvent,
  next: () => unknown | Promise<unknown>,
): Promise<unknown> {
  const opts = {
    pathname: event.url.pathname,
    method: event.req.method,
    isHttps: isHttps(event),
    isDev: false,
  };
  const result = await next();
  if (result instanceof Response) return applyToResponse(result, opts);
  return result;
}
