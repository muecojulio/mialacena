import { createServerFn } from "@tanstack/react-start";
import { rateLimit } from "./rate-limit.ts";
import { fetchJson, ttlCache } from "./public-fetch.ts";

/**
 * Próximos feriados en México (Nager.Date, API pública sin llave:
 * https://date.nager.at). Sirve para adelantar la compra antes de que el
 * súper se llene o cambie de horario. No viaja ningún dato del teléfono.
 */

export type Holiday = { date: string; name: string };

const cache = ttlCache<Holiday[]>(24 * 60 * 60 * 1000, 1);

export const nextHolidays = createServerFn({ method: "POST" })
  .middleware([rateLimit("holidays", 12, 60_000)])
  .handler(
  async (): Promise<{ ok: boolean; holidays: Holiday[] }> => {
    const hit = cache.get("MX");
    if (hit) return { ok: true, holidays: hit };

    const json = await fetchJson("https://date.nager.at/api/v3/NextPublicHolidays/MX");
    if (!Array.isArray(json)) return { ok: false, holidays: [] };

    const holidays: Holiday[] = [];
    for (const row of json.slice(0, 3)) {
      const entry = row as Record<string, unknown> | null;
      const date = typeof entry?.date === "string" ? entry.date.slice(0, 10) : "";
      const name =
        typeof entry?.localName === "string"
          ? entry.localName.trim().slice(0, 60)
          : typeof entry?.name === "string"
            ? entry.name.trim().slice(0, 60)
            : "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && name) holidays.push({ date, name });
    }
    cache.set("MX", holidays);
    return { ok: true, holidays };
  },
);
