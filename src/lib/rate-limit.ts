/**
 * Middleware de límite de frecuencia para `createServerFn` — DUAl (cliente/servidor),
 * igual que `@/lib/auth/middleware`: la fábrica vive en código que el cliente
 * puede importar, y los datos de conteo se cargan con `import()` dinámico
 * dentro del callback de servidor (que resuelve al módulo real solo en el
 * servidor; en el navegador `*.server.ts` es un stub que nunca se ejecuta).
 */
import { createMiddleware } from "@tanstack/react-start";

/**
 * `.middleware([rateLimit("scan", 8, 60_000)])` — consume un permiso por IP;
 * con más de `limit` llamadas por `windowMs` lanza error (el cliente lo ve
 * como fallo de la función) y la petición no llega al proxy externo.
 */
export function rateLimit(name: string, limit: number, windowMs = 60_000) {
  return createMiddleware({ type: "function" }).server(async ({ next }) => {
    const { allowRequest } = await import("./rate-limit.server.ts");
    if (!allowRequest(name, limit, windowMs)) {
      const err = new Error(
        "Vas muy rápido 🚦 Dale un segundo y vuelve a intentarlo (límite de uso de este servicio).",
      );
      (err as Error & { status?: number }).status = 429;
      throw err;
    }
    return next();
  });
}
