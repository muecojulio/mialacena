import { createServerFn } from "@tanstack/react-start";
import { env } from "./env.server.ts";
import {
  ECB_CURRENCIES,
  envFallbackRate,
  fxUrl,
  normalizeCurrency,
  parseFxRate,
  type FxRate,
} from "./fx.ts";
import { fetchJson, ttlCache } from "./public-fetch.ts";
import { rateLimit } from "./rate-limit.ts";

type FxOk = { ok: true; quote: FxRate };
type FxErr = { ok: false; error: string };

/**
 * Tipo de cambio del día para pasar un precio público a pesos de referencia.
 * Frankfurter (BCE, sin llave) primero; si no responde, el respaldo opcional de
 * entorno; si tampoco hay, se dice y no se inventa nada.
 */
const cache = ttlCache<FxRate>(6 * 60 * 60 * 1000, 12);

const ENV_BY_CURRENCY: Record<string, string> = {
  USD: "FX_MXN_PER_USD",
  EUR: "FX_MXN_PER_EUR",
};

export const getMxnRate = createServerFn({ method: "POST" })
  .middleware([rateLimit("fx", 20, 60_000)])
  .validator((input: { currency: string }): { currency: string } => {
    const currency = normalizeCurrency(input?.currency);
    if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Moneda inválida");
    return { currency };
  })
  .handler(async ({ data }): Promise<FxOk | FxErr> => {
    const { currency } = data;
    if (currency === "MXN") {
      return { ok: true, quote: { base: "MXN", currency: "MXN", rate: 1, date: "", source: "env" } };
    }

    const hit = cache.get(currency);
    if (hit) return { ok: true, quote: hit };

    // El BCE no publica todas las monedas: ni siquiera se pregunta por las demás.
    if (ECB_CURRENCIES.has(currency)) {
      const json = await fetchJson(fxUrl(currency), 5000);
      const quote = json ? parseFxRate(json, currency) : null;
      if (quote) {
        cache.set(currency, quote);
        return { ok: true, quote };
      }
    }

    // Respaldo: variable de entorno, solo cuando el servicio público falló.
    const envKey = ENV_BY_CURRENCY[currency];
    const fallback = envKey ? envFallbackRate(currency, env(envKey)) : null;
    if (fallback) {
      cache.set(currency, fallback);
      return { ok: true, quote: fallback };
    }

    return {
      ok: false,
      error: "No pude traer el tipo de cambio; el precio público se queda en su moneda.",
    };
  });
