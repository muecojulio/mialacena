export type SaveResult = "shared" | "downloaded" | "cancelled";

/** iPhone o iPad (el iPad moderno se presenta como Mac, pero con pantalla táctil). */
function isAppleMobile(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
}

function download(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revocar de inmediato puede cortar la descarga en algunos navegadores.
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Guarda un archivo generado en el teléfono.
 *
 * En iPhone/iPad abre la hoja de compartir («Guardar en Archivos», AirDrop, WhatsApp…), porque
 * dentro de la app instalada en la pantalla de inicio la descarga directa no siempre funciona.
 * En lo demás (Android, computadora) es una descarga normal.
 *
 * Debe llamarse directo desde el toque del usuario: compartir exige ese gesto.
 */
export async function saveFile(content: string, name: string, type: string): Promise<SaveResult> {
  const blob = new Blob([content], { type });
  if (isAppleMobile() && typeof navigator.share === "function" && typeof File === "function") {
    const file = new File([blob], name, { type });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: name });
        return "shared";
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
        // Cualquier otro error (permiso, tipo no admitido): se intenta la descarga normal.
      }
    }
  }
  download(blob, name);
  return "downloaded";
}
