import { createServerFn } from "@tanstack/react-start";
import { rateLimit } from "@/lib/rate-limit";

type TicketInput = {
  image: string; // data:image/jpeg;base64,...
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
  rawText?: string;
};

type TicketErr = {
  ok: false;
  error: string;
};

function asTicketInput(input: TicketInput): TicketInput {
  if (!input || !input.image) throw new Error("Falta la foto del ticket");
  if (!input.image.startsWith("data:image/jpeg;base64,") && !input.image.startsWith("data:image/png;base64,")) {
    throw new Error("La foto del ticket debe estar en formato JPG o PNG comprimida");
  }
  return input;
}

export const scanTicketImage = createServerFn({ method: "POST" })
  // OCR con IA: cara y con cuota — pocas por minuto.
  .middleware([rateLimit("ticket", 8, 60_000)])
  .validator(asTicketInput)
  .handler(async ({ data }): Promise<TicketOk | TicketErr> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return {
        ok: false,
        error: "Lectura por IA no disponible sin llave de API. Puedes ingresar los precios directamente o subir el texto.",
      };
    }

    const payload = {
      model: "grok-4.5",
      temperature: 0.1,
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analiza esta foto de un ticket o recibo de compra de supermercado.
Extrae la lista de productos comprados con su precio final pagado (unitario o total si no viene desglosado).
Devuelve EXCLUSIVAMENTE un JSON válido con este formato:
{
  "items": [
    { "name": "Nombre producto", "price": 45.50, "qty": 1 }
  ],
  "total": 45.50
}
No agregues comentarios ni Markdown outside the JSON.`,
            },
            {
              type: "image_url",
              image_url: { url: data.image },
            },
          ],
        },
      ],
    };

    try {
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        return { ok: false, error: "No se pudo procesar la foto del ticket con el servicio." };
      }

      const body = (await response.json()) as {
        choices?: { message?: { content?: unknown } }[];
      };

      const raw = typeof body.choices?.[0]?.message?.content === "string" 
        ? body.choices[0].message.content 
        : "";

      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start >= 0 && end > start) {
        const parsed = JSON.parse(raw.slice(start, end + 1));
        const items = Array.isArray(parsed.items)
          ? parsed.items.map((i: any) => ({
              name: String(i.name || "").trim(),
              price: Number(i.price) || 0,
              qty: Number(i.qty) || 1,
            }))
          : [];
        return {
          ok: true,
          items,
          total: parsed.total ? Number(parsed.total) : undefined,
        };
      }
      return { ok: false, error: "No se detectaron productos claros en el ticket." };
    } catch {
      return { ok: false, error: "Error procesando el ticket." };
    }
  });
