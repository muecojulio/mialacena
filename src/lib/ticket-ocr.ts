/**
 * OCR local para tickets con Tesseract.js — repo público
 * github.com/naptha/tesseract.js (motor Tesseract compilado a WebAssembly).
 *
 * Es el respaldo sin llave de la lectura por IA: la foto se lee EN el teléfono
 * (nunca sube a ningún servidor) y el texto pasa por el mismo parser de tickets
 * de siempre. La primera vez descarga el motor y el idioma español (~algunos
 * MB desde el CDN de la librería) y el navegador los guarda en caché.
 */
export async function recognizeTicketText(
  imageDataUrl: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const mod = await import("tesseract.js");
  const Tesseract = (mod as unknown as { default?: typeof mod }).default ?? mod;
  const result = await Tesseract.recognize(imageDataUrl, "spa", {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });
  return result.data.text ?? "";
}
