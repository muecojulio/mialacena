/**
 * Lector de códigos de barras en el navegador, en dos pisos:
 *
 * 1. `window.BarcodeDetector` nativo (Chrome/Android, iOS 17+): rápido y sin peso.
 * 2. Respaldo ZXing — repo público github.com/zxing-js/library (paquetes
 *    `@zxing/browser` + `@zxing/library`)— cargado bajo demanda solo en
 *    navegadores sin el detector nativo (Safari anterior, Firefox). Lee la
 *    foto o el cuadro de video tal cual: sin llaves y sin salir del teléfono.
 */

type Source = HTMLImageElement | HTMLCanvasElement | ImageBitmap | HTMLVideoElement;

const NATIVE_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"];

/** Forma mínima del `BarcodeDetector` nativo (Chrome/Android, iOS 17+). */
type NativeBarcode = { rawValue?: string };
type NativeDetector = { detect(source: Source): Promise<NativeBarcode[]> };
type NativeDetectorCtor = new (options: { formats: string[] }) => NativeDetector;

async function detectNative(source: Source): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const Detector = (window as unknown as { BarcodeDetector?: NativeDetectorCtor }).BarcodeDetector;
  if (!Detector) return null;
  try {
    const detector = new Detector({ formats: NATIVE_FORMATS });
    const barcodes = await detector.detect(source);
    if (barcodes && barcodes.length > 0) return String(barcodes[0].rawValue ?? "") || null;
  } catch (e) {
    console.warn("BarcodeDetector error:", e);
  }
  return null;
}

type ZxingReader = {
  decodeFromCanvas(canvas: HTMLCanvasElement): { getText(): string };
  decodeFromImageElement(source: HTMLImageElement): Promise<{ getText(): string }>;
};

let readerPromise: Promise<ZxingReader | null> | null = null;

function loadZxingReader(): Promise<ZxingReader | null> {
  readerPromise ??= (async () => {
    try {
      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
        import("@zxing/browser"),
        import("@zxing/library"),
      ]);
      const hints = new Map();
      hints.set(DecodeHintType.TRY_HARDER, true);
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.QR_CODE,
      ]);
      return new BrowserMultiFormatReader(hints) as unknown as ZxingReader;
    } catch {
      return null;
    }
  })();
  return readerPromise;
}

function toCanvas(source: Exclude<Source, HTMLCanvasElement>): HTMLCanvasElement | null {
  const width =
    source instanceof HTMLVideoElement ? source.videoWidth : (source as HTMLImageElement).naturalWidth || source.width;
  const height =
    source instanceof HTMLVideoElement ? source.videoHeight : (source as HTMLImageElement).naturalHeight || source.height;
  if (!width || !height) return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source as CanvasImageSource, 0, 0);
  return canvas;
}

async function detectWithZxing(source: Source): Promise<string | null> {
  const reader = await loadZxingReader();
  if (!reader) return null;
  try {
    if (source instanceof HTMLImageElement) {
      const result = await reader.decodeFromImageElement(source);
      return result.getText() || null;
    }
    const canvas = source instanceof HTMLCanvasElement ? source : toCanvas(source);
    if (!canvas) return null;
    return reader.decodeFromCanvas(canvas).getText() || null;
  } catch {
    // ZXing lanza NotFoundException cuando no hay código en el cuadro: es el caso normal al escanear.
    return null;
  }
}

function hasNativeDetector(): boolean {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

/**
 * Lee un código desde una imagen, canvas o el video en vivo. `null` = aún no se ve.
 * Con detector nativo, ZXing solo opina en fotos fijas (en video en vivo se
 * llamaría en cada cuadro y descargaría la librería sin necesidad); sin
 * detector nativo, ZXing es quien lee todo.
 */
export async function detectBarcodeFromImage(source: Source): Promise<string | null> {
  if (hasNativeDetector()) {
    const native = await detectNative(source);
    if (native) return native;
    if (source instanceof HTMLVideoElement) return null;
  }
  return detectWithZxing(source);
}
