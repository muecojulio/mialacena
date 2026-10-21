import { createServerFn } from "@tanstack/react-start";
import { rateLimit } from "@/lib/rate-limit";
import type { ScanHit } from "@/lib/types";

type ScanInput = {
  images: string[];
  expected: { name: string; brand: string }[];
};

type ScanOk = { ok: true; items: ScanHit[]; note: string };
type ScanErr = { ok: false; error: string };

function asScanInput(input: ScanInput): ScanInput {
  if (!input || !Array.isArray(input.images)) throw new Error("Faltan las fotos");
  if (input.images.length < 1 || input.images.length > 4) {
    throw new Error("Envía entre 1 y 4 fotos");
  }
  for (const image of input.images) {
    if (typeof image !== "string" || !image.startsWith("data:image/jpeg;base64,")) {
      throw new Error("Cada foto tiene que ir comprimida");
    }
    if (image.length > 1_200_000) throw new Error("Una foto sigue siendo demasiado pesada");
  }
  const expected = Array.isArray(input.expected)
    ? input.expected.slice(0, 80).map((row) => ({
        name: String(row?.name ?? "").slice(0, 80),
        brand: String(row?.brand ?? "").slice(0, 80),
      }))
    : [];
  return { images: input.images, expected };
}

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) return String(part.text ?? "");
        return "";
      })
      .join("");
  }
  return "";
}

function parseHits(raw: string): { items: ScanHit[]; note: string } {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("respuesta vacía");
  const parsed = JSON.parse(raw.slice(start, end + 1)) as {
    items?: unknown;
    note?: unknown;
  };
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
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
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

    const payload = {
      model: "grok-4.5",
      temperature: 0.2,
      max_tokens: 900,
      messages: [{ role: "user", content }],
    };

    let response: Response | null = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
      if (response.ok || (response.status !== 429 && response.status !== 503)) break;
    }

    if (!response?.ok) {
      return { ok: false, error: "No se pudo leer la alacena en este momento. Inténtalo de nuevo." };
    }

    const body = (await response.json()) as {
      choices?: { message?: { content?: unknown } }[];
    };
    const text = textOf(body.choices?.[0]?.message?.content);
    try {
      const parsed = parseHits(text);
      return { ok: true, items: parsed.items, note: parsed.note };
    } catch {
      return { ok: false, error: "La lectura no salió clara. Prueba con más luz o marca lo que ves." };
    }
  });
