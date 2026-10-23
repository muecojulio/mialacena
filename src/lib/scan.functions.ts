import { createServerFn } from "@tanstack/react-start";
import { rateLimit } from "@/lib/rate-limit";
import type { ScanHit } from "@/lib/types";
import { jsonFromAi } from "./ai.ts";

type ScanInput = {
  images: string[];
  expected: { name: string; brand: string }[];
};

type ScanOk = { ok: true; items: ScanHit[]; note: string };
type ScanErr = { ok: false; error: string };

/** Tope por foto (JPEG ya comprimido en el teléfono) y tope del conjunto. */
const MAX_IMAGE_CHARS = 1_200_000;
const MAX_TOTAL_CHARS = 4_000_000;

function asScanInput(input: ScanInput): ScanInput {
  if (!input || !Array.isArray(input.images)) throw new Error("Faltan las fotos");
  if (input.images.length < 1 || input.images.length > 4) {
    throw new Error("Envía entre 1 y 4 fotos");
  }
  let total = 0;
  for (const image of input.images) {
    if (typeof image !== "string" || !image.startsWith("data:image/jpeg;base64,")) {
      throw new Error("Cada foto tiene que ir comprimida");
    }
    if (image.length > MAX_IMAGE_CHARS) throw new Error("Una foto sigue siendo demasiado pesada");
    total += image.length;
  }
  if (total > MAX_TOTAL_CHARS) throw new Error("Son demasiadas fotos juntas; manda menos");
  const expected = Array.isArray(input.expected)
    ? input.expected.slice(0, 80).map((row) => ({
        name: String(row?.name ?? "").slice(0, 80),
        brand: String(row?.brand ?? "").slice(0, 80),
      }))
    : [];
  return { images: input.images, expected };
}

/** Convierte la respuesta del modelo en lecturas; tolera texto alrededor del JSON. */
export function parseHits(raw: string): { items: ScanHit[]; note: string } {
  const parsed = jsonFromAi(raw) as { items?: unknown; note?: unknown } | null;
  if (!parsed || typeof parsed !== "object") throw new Error("respuesta vacía");
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  const hits: ScanHit[] = [];
  for (const row of items.slice(0, 40)) {
    if (!row || typeof row !== "object") continue;
    const record = row as Record<string, unknown>;
    const name = String(record.name ?? "").trim().slice(0, 80);
    if (!name) continue;
    const quantityRaw = record.quantity;
    const quantity =
      typeof quantityRaw === "number" && Number.isFinite(quantityRaw) && quantityRaw > 0
        ? Math.round(quantityRaw * 100) / 100
        : null;
    const confidenceRaw = Number(record.confidence);
    hits.push({
      name,
      brand: String(record.brand ?? "").trim().slice(0, 80),
      quantity,
      unit: String(record.unit ?? "").trim().slice(0, 16),
      confidence: Number.isFinite(confidenceRaw) ? Math.min(1, Math.max(0, confidenceRaw)) : 0.5,
    });
  }
  return { items: hits, note: String(parsed.note ?? "").trim().slice(0, 240) };
}

export const scanPantry = createServerFn({ method: "POST" })
  // Lectura con IA: cara y con cuota — pocas por minuto.
  .middleware([rateLimit("scan", 8, 60_000)])
  .validator(asScanInput)
  .handler(async ({ data }): Promise<ScanOk | ScanErr> => {
    // La llave vive en el módulo de servidor: se carga sólo dentro del handler.
    const { xaiAvailable, xaiChat } = await import("./ai.server.ts");
    if (!xaiAvailable()) {
      return {
        ok: false,
        error: "La lectura automática no está disponible. Marca tú lo que ves en el estante.",
      };
    }

    const expected = data.expected
      .filter((row) => row.name)
      .map((row) => (row.brand ? `${row.name} (${row.brand})` : row.name))
      .join(", ");

    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: [
          "Miras fotos de una alacena o despensa real.",
          "Lista solo productos que se vean: abarrotes, lácteos, bebidas, limpieza, botanas.",
          "No inventes productos ni marcas que no estén a la vista.",
          expected ? `Si coincide con esta despensa esperada, usa ese nombre: ${expected}.` : "",
          'Responde únicamente JSON: {"items":[{"name":"","brand":"","quantity":1,"unit":"pza","confidence":0.8}],"note":"una frase en español"}',
          "quantity es lo que se alcanza a contar, o null. unit corta: pza, kg, g, L, ml, paq, lata, bolsa.",
        ]
          .filter(Boolean)
          .join("\n"),
      },
      ...data.images.map((url) => ({ type: "image_url", image_url: { url } })),
    ];

    const result = await xaiChat({ content, maxTokens: 900, temperature: 0.2 });
    if (!result.ok) {
      return {
        ok: false,
        error:
          result.reason === "busy"
            ? "El lector está saturado. Espera un momento o marca lo que ves a mano."
            : "No se pudo leer la alacena en este momento. Inténtalo de nuevo.",
      };
    }

    try {
      const parsed = parseHits(result.text);
      return { ok: true, items: parsed.items, note: parsed.note };
    } catch {
      return { ok: false, error: "La lectura no salió clara. Prueba con más luz o marca lo que ves." };
    }
  });
