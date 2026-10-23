// @ts-check
/**
 * Encabezados HTTP compartidos: caché y seguridad.
 *
 * Un solo origen de verdad para tres consumidores:
 *   - `server/middleware/00-headers.ts` (Nitro → Vercel y `vite preview`)
 *   - el plugin de dev en `vite.config.ts` (la vista previa corre `vite dev`)
 *   - `server/middleware/grok-pwa.ts` (respuestas fabricadas: manifest / install)
 *
 * Políticas:
 *   Caché — los assets con hash de Vite son inmutables; los documentos HTML se
 *   revalidan siempre (`no-cache`, el ETag hace el resto); lo que no es GET y
 *   `/api/auth/*` nunca se cachea.
 *   Seguridad — CSP estricta con excepciones explícitas, enumeradas host por
 *   host, para lo que la app usa de verdad: fotos en data:/blob:, las fotos de
 *   los catálogos públicos, el mapa, el motor de OCR y su wasm, el HMR en dev,
 *   y los orígenes que pueden embeber la vista previa en un iframe.
 *   `X-Frame-Options` se omite a propósito: no puede expresar la lista de
 *   embebidos permitidos y rompería la vista previa; `frame-ancestors` cubre el
 *   clickjacking. Se agrega COOP para aislar la ventana de un posible opener.
 */

/**
 * Hosts que el **navegador** consulta directamente (no los server functions).
 * Si se agrega un servicio público que se llame desde el cliente, hay que
 * sumarlo aquí: la CSP ya no permite cualquier `https:`.
 */
export const CLIENT_API_HOSTS = [
  // Tiendas cercanas (Overpass, con respaldo) y nombre del lugar (Nominatim).
  "https://overpass-api.de",
  "https://overpass.kumi.systems",
  "https://nominatim.openstreetmap.org",
  // OCR local: Tesseract.js baja su worker, el wasm y el idioma español.
  "https://cdn.jsdelivr.net",
  "https://tessdata.projectnaptha.com",
];

/** Hosts de imágenes públicas que la app muestra (fotos de producto y recetas). */
export const IMAGE_HOSTS = [
  "https://*.openfoodfacts.org",
  "https://*.openfoodfacts.net",
  "https://*.openbeautyfacts.org",
  "https://*.openproductsfacts.org",
  "https://www.themealdb.com",
];

/** Orígenes que pueden mostrar la app dentro de un iframe (vista previa / deploy). */
const FRAME_ANCESTORS = [
  "'self'",
  "https://*.e2b.app",
  "https://*.grok-sandbox.com",
  "https://*.grok.me",
  "https://grok.com",
  "https://*.grok.com",
  "https://*.vercel.app",
  "https://arena.ai",
  "https://*.arena.ai",
].join(" ");

/**
 * Content-Security-Policy para la app.
 * @param {{ isDev?: boolean }} [opts]
 */
export function contentSecurityPolicy(opts = {}) {
  const scriptSrc = [
    "'self'",
    "'unsafe-inline'",
    // El visor de la plataforma inyecta su extensión desde grok.com en la
    // vista previa; acotado a su carpeta, no a todo el dominio.
    "https://grok.com/grok-app-builder/",
    "https://*.grok.com/grok-app-builder/",
    // Tesseract.js crea su worker desde el CDN público (OCR local).
    "https://cdn.jsdelivr.net",
  ];
  // El runner de módulos de Vite en dev necesita eval; producción no.
  if (opts.isDev) scriptSrc.push("'unsafe-eval'");
  return [
    `default-src 'self'`,
    `script-src ${scriptSrc.join(" ")}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: ${IMAGE_HOSTS.join(" ")}`,
    `media-src 'self' blob: data:`,
    `font-src 'self' data:`,
    // Server functions son same-origin (por eso nada de comodines https:) y las
    // APIs públicas que se consultan desde el cliente están enumeradas.
    `connect-src 'self' ${CLIENT_API_HOSTS.join(" ")} ${opts.isDev ? "ws: wss:" : ""}`.trim(),
    `worker-src 'self' blob: https://cdn.jsdelivr.net`,
    `frame-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors ${FRAME_ANCESTORS}`,
  ].join("; ");
}

/**
 * Encabezados de seguridad, independientes del runtime.
 * @param {{ isHttps: boolean, isDev?: boolean }} opts
 * @returns {Record<string, string>}
 */
export function securityHeaders({ isHttps, isDev }) {
  /** @type {Record<string, string>} */
  const headers = {
    "content-security-policy": contentSecurityPolicy({ isDev }),
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    // Cámara (escanear) y ubicación (tiendas cercanas) son de la propia página;
    // todo lo demás sensible queda apagado.
    "permissions-policy":
      "camera=(self), geolocation=(self), microphone=(), payment=(), usb=(), browsing-topics=()",
    "x-permitted-cross-domain-policies": "none",
    "x-dns-prefetch-control": "off",
    // Aísla la ventana de un opener ajeno sin romper el popup de sesión del
    // mismo origen ni la vista previa embebida.
    "cross-origin-opener-policy": "same-origin-allow-popups",
    // Nada de la app debe cargarse como recurso de otro sitio.
    "cross-origin-resource-policy": "same-origin",
  };
  // HSTS solo tiene sentido sobre https (Vercel termina TLS; dev es http).
  if (isHttps) {
    headers["strict-transport-security"] = "max-age=31536000; includeSubDomains";
  }
  return headers;
}

/**
 * Cache-Control por ruta.
 * @param {string} pathname
 * @param {string} method
 * @returns {string}
 */
export function cacheControlFor(pathname, method) {
  if ((method ?? "GET").toUpperCase() !== "GET") return "no-store";
  if (pathname.startsWith("/api/auth")) return "no-store";
  if (pathname.startsWith("/assets/")) return "public, max-age=31536000, immutable";
  if (pathname.startsWith("/__grok/") || pathname === "/favicon.svg" || pathname.startsWith("/og")) {
    return "public, max-age=3600";
  }
  if (pathname.endsWith(".webmanifest") || pathname.endsWith(".json")) return "public, max-age=3600";
  // Documentos y el resto: revalidar siempre (ETag/barato, HTML siempre fresco).
  return "no-cache";
}

/**
 * Aplica caché + seguridad a un `Headers` web (respuestas de Nitro/h3).
 * @param {Headers} headers
 * @param {{ pathname: string, method?: string, isHttps: boolean, isDev?: boolean }} opts
 */
export function applyToWebHeaders(headers, opts) {
  for (const [key, value] of Object.entries(securityHeaders(opts))) {
    headers.set(key, value);
  }
  headers.set("cache-control", cacheControlFor(opts.pathname, opts.method ?? "GET"));
  return headers;
}

/**
 * Aplica caché + seguridad a una `Response` (devuelve una nueva si hace falta).
 * @param {Response} response
 * @param {{ pathname: string, method?: string, isHttps: boolean, isDev?: boolean }} opts
 */
export function applyToResponse(response, opts) {
  const headers = new Headers(response.headers);
  applyToWebHeaders(headers, opts);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Versión para el `res` de Node (middleware de Vite en dev).
 * @param {{ setHeader: (k: string, v: string) => void }} res
 * @param {{ pathname: string, method?: string, isHttps: boolean, isDev?: boolean }} opts
 */
export function applyToNodeRes(res, opts) {
  for (const [key, value] of Object.entries(securityHeaders(opts))) {
    res.setHeader(key, value);
  }
  res.setHeader("cache-control", cacheControlFor(opts.pathname, opts.method ?? "GET"));
}
