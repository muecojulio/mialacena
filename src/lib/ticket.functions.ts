import { createServerFn } from "@tanstack/react-start";
import { rateLimit } from "@/lib/rate-limit";
import { jsonFromAi } from "./ai.ts";

type TicketInput = {
  image: string; // data:image/jpeg;base64,... | data:image/png;base64,...
};

export type TicketLineResult = {
  name: string;
  price: number;
  qty?: number;
};

type TicketOk = {
  ok: true;
  items: TicketLineResult[];
  total?: number;
};

type TicketErr = {
  ok: false;
  error: string;
};

/** Una foto de ticket comprimida en el teléfono; 2.5 M caracteres ≈ 1.8 MB. */
const MAX_IMAGE_CHARS = 2_500_000;

function asTicketInput(input: TicketInput): TicketInput {
  if (!input || typeof input.image !== "string") throw new Error("Falta la foto del ticket");
  const image = input.image;
  if (!image.startsWith("data:image/jpeg;base64,") && !image.startsWith("data:image/png;base64,")) {
    throw new Error("La foto del ticket debe estar en formato JPG o PNG comprimida");
  }
  if (image.length > MAX_IMAGE_CHARS) {
    throw new Error("La foto del ticket pesa demasiado; vuelve a tomarla o usa el OCR local");
  }
  return { image };
}

export const scanTicketImage = createServerFn({ method: "POST" })
  // OCR con IA: cara y con cuota — pocas por minuto.
  .middleware([rateLimit("ticket", 8, 60_000)])
  .validator(asTicketInput)
  .handler(async ({ data }): Promise<TicketOk | TicketErr> => {
    const { xaiAvailable, xaiChat } = await import("./ai.server.ts");
    if (!xaiAvailable()) {
      return {
        ok: false,
        error:
          "Lectura por IA no disponible sin llave de API. Puedes usar el OCR local (en tu teléfono) o capturar los precios a mano.",
      };
    }

    const result = await xaiChat({
      maxTokens: 1000,
      temperature: 0.1,
      content: [
        {
          type: "text",
          text: [
            "Analiza esta foto de un ticket o recibo de compra de supermercado.",
            "Extrae la lista de productos comprados con su precio final pagado (unitario o total si no viene desglosado).",
            "Devuelve EXCLUSIVAMENTE un JSON válido con este formato:",
            '{"items":[{"name":"Nombre producto","price":45.50,"qty":1}],"total":45.50}',
            "Sin comentarios ni Markdown fuera del JSON. Los precios van en pesos mexicanos.",
          ].join("\n"),
        },
        { type: "image_url", image_url: { url: data.image } },
      ],
    });

    if (!result.ok) {
      return {
        ok: false,
        error:
          result.reason === "busy"
            ? "El lector está saturado. Prueba con el OCR local o captura los precios a mano."
            : "No se pudo procesar la foto del ticket con el servicio.",
      };
    }

    const parsed = jsonFromAi(result.text) as {
      items?: unknown;
      total?: unknown;
    } | null;
    if (!parsed) return { ok: false, error: "No se detectaron productos claros en el ticket." };

    const items: TicketLineResult[] = Array.isArray(parsed.items)
      ? parsed.items
          .slice(0, 120)
          .map((row) => {
            const entry = (row ?? {}) as Record<string, unknown>;
            const price = Number(entry.price);
            return {
              name: String(entry.name ?? "").replace(/\s+/g, " ").trim().slice(0, 80),
              price: Number.isFinite(price) && price >= 0 ? Math.round(price * 100) / 100 : 0,
              qty: Math.max(1, Math.min(999, Math.round(Number(entry.qty) || 1))),
            };
          })
          .filter((row) => row.name && row.price > 0)
      : [];

    if (!items.length) return { ok: false, error: "No se detectaron productos claros en el ticket." };

    const totalRaw = Number(parsed.total);
    return {
      ok: true,
      items,
      total: Number.isFinite(totalRaw) && totalRaw > 0 ? Math.round(totalRaw * 100) / 100 : undefined,
    };
  });
