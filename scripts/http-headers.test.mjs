import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CLIENT_API_HOSTS,
  applyToResponse,
  cacheControlFor,
  contentSecurityPolicy,
  securityHeaders,
} from "./http-headers.mjs";

describe("contentSecurityPolicy", () => {
  it("no deja comodines de red: sólo los hosts que la app usa de verdad", () => {
    const csp = contentSecurityPolicy();
    const connect = /connect-src ([^;]+)/.exec(csp)?.[1] ?? "";
    assert.ok(connect.startsWith("'self'"));
    for (const host of CLIENT_API_HOSTS) assert.ok(connect.includes(host), `falta ${host}`);
    assert.ok(!/\shttps:(\s|$)/.test(connect), "connect-src no debe permitir todo https");
    assert.ok(!connect.includes("http://"));
    // El OCR local necesita su CDN, el mapa y Nominatim en la lista.
    assert.ok(connect.includes("https://nominatim.openstreetmap.org"));
    assert.ok(connect.includes("https://overpass-api.de"));
  });

  it("las imágenes salen de los catálogos públicos y de la propia app", () => {
    const csp = contentSecurityPolicy();
    const img = /img-src ([^;]+)/.exec(csp)?.[1] ?? "";
    assert.ok(img.includes("'self'"));
    assert.ok(img.includes("data:"));
    assert.ok(img.includes("blob:"));
    assert.ok(img.includes("https://*.openfoodfacts.org"));
    assert.ok(img.includes("https://www.themealdb.com"));
    assert.ok(!/\shttps:(\s|$)/.test(img), "img-src no debe permitir todo https");
  });

  it("cierra lo peligroso y deja embeber sólo la vista previa", () => {
    const csp = contentSecurityPolicy();
    assert.ok(csp.includes("object-src 'none'"));
    assert.ok(csp.includes("base-uri 'self'"));
    assert.ok(csp.includes("frame-ancestors 'self'"));
    assert.ok(csp.includes("https://*.vercel.app"));
    assert.ok(!csp.includes("'unsafe-eval'"));
  });

  it("en desarrollo se permite el HMR por websocket y eval", () => {
    const csp = contentSecurityPolicy({ isDev: true });
    assert.ok(csp.includes("ws:"));
    assert.ok(csp.includes("'unsafe-eval'"));
  });
});

describe("securityHeaders", () => {
  it("trae los encabezados de seguridad y HSTS sólo sobre https", () => {
    const https = securityHeaders({ isHttps: true, isDev: false });
    assert.equal(https["x-content-type-options"], "nosniff");
    assert.equal(https["referrer-policy"], "strict-origin-when-cross-origin");
    assert.match(https["permissions-policy"], /camera=\(self\)/);
    assert.match(https["permissions-policy"], /microphone=\(\)/);
    assert.equal(https["cross-origin-opener-policy"], "same-origin-allow-popups");
    assert.equal(https["cross-origin-resource-policy"], "same-origin");
    assert.ok(https["strict-transport-security"].includes("max-age=31536000"));

    const http = securityHeaders({ isHttps: false });
    assert.equal(http["strict-transport-security"], undefined);
  });
});

describe("cacheControlFor", () => {
  it("assets inmutables, auth sin caché y HTML revalidado", () => {
    assert.equal(cacheControlFor("/assets/app-abc.js", "GET"), "public, max-age=31536000, immutable");
    assert.equal(cacheControlFor("/api/auth/session", "GET"), "no-store");
    assert.equal(cacheControlFor("/", "POST"), "no-store");
    assert.equal(cacheControlFor("/", "GET"), "no-cache");
    assert.equal(cacheControlFor("/__grok/manifest.webmanifest", "GET"), "public, max-age=3600");
  });
});

describe("applyToResponse", () => {
  it("copia cuerpo y estado, y agrega los encabezados", async () => {
    const original = new Response("hola", { status: 200, headers: { "x-app": "1" } });
    const out = applyToResponse(original, { pathname: "/", method: "GET", isHttps: true });
    assert.equal(await out.text(), "hola");
    assert.equal(out.status, 200);
    assert.equal(out.headers.get("x-app"), "1");
    assert.equal(out.headers.get("x-content-type-options"), "nosniff");
    assert.equal(out.headers.get("cache-control"), "no-cache");
  });
});
