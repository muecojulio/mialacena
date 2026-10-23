/**
 * Cliente del servicio de IA (xAI) — **solo servidor**.
 *
 * La llave vive en `XAI_API_KEY` y nunca llega al navegador. Este módulo reúne
 * lo que antes estaba repetido en la lectura de la alacena, el OCR de tickets y
 * las recetas: tiempo límite, un reintento si el servicio está saturado y
 * lectura de la respuesta en texto, sin lanzar excepciones hacia arriba.
 *
 * Se importa **dinámicamente** desde los server functions (igual que
 * `rate-limit.server.ts`), para que el bundle del cliente nunca lo toque. Si no
 * hay llave, `xaiAvailable()` es `false` y quien lo usa cae a su alternativa
 * local o pública (degradación suave, nunca un fallo).
 */
import { aiTextOf } from "./ai.ts";
import { env } from "./env.server.ts";

const ENDPOINT = "https://api.x.ai/v1/chat/completions";

export function xaiAvailable(): boolean {
  return Boolean(env("XAI_API_KEY"));
}

/**
 * Una llamada al modelo de visión/texto. Reintenta una vez si el servicio
 * responde 429/503 (saturación), con un tope de tiempo por intento.
 */
export async function xaiChat(options: {
  content: unknown;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}): Promise<
  { ok: true; text: string } | { ok: false; reason: "no-key" | "busy" | "error"; status?: number }
> {
  const apiKey = env("XAI_API_KEY");
  if (!apiKey) return { ok: false, reason: "no-key" };

  const payload = {
    model: "grok-4.5",
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxTokens ?? 900,
    messages: [{ role: "user", content: options.content }],
  };

  let lastStatus = 0;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(options.timeoutMs ?? 25_000),
      });
      lastStatus = response.status;
      if (!response.ok) {
        if (response.status === 429 || response.status === 503) continue;
        return { ok: false, reason: "error", status: response.status };
      }
      const body = (await response.json()) as {
        choices?: { message?: { content?: unknown } }[];
      };
      return { ok: true, text: aiTextOf(body.choices?.[0]?.message?.content) };
    } catch {
      // Red caída o tiempo agotado: un reintento más y rendirse con suavidad.
    }
  }

  return {
    ok: false,
    reason: lastStatus === 429 || lastStatus === 503 ? "busy" : "error",
    status: lastStatus || undefined,
  };
}
