/**
 * Piezas **puras** del cliente de IA: leer la respuesta del modelo y sacar el
 * JSON aunque venga envuelto en Markdown. Se separan de `ai.server.ts` porque
 * las usan módulos que también corren en el navegador (el parser de la lectura
 * de la alacena y el de las recetas), y el bundle del cliente no debe importar
 * nada que toque la llave.
 */

/** Contenido de un mensaje: texto simple o partes (texto + imagen). */
export type AiContent = string | Array<Record<string, unknown>>;

export type AiResult =
  | { ok: true; text: string }
  | { ok: false; reason: "no-key" | "busy" | "error"; status?: number };

/** Une los trozos de contenido que devuelve el servicio. */
export function aiTextOf(content: unknown): string {
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

/** Extrae el primer objeto JSON de una respuesta que pudo venir con Markdown. */
export function jsonFromAi(text: string): unknown | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}
