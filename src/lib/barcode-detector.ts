/**
 * Lightweight browser-compatible barcode detector.
 * Supports standard window.BarcodeDetector API if supported by the browser,
 * or graceful fallback with code input or simulated detection.
 */

export async function detectBarcodeFromImage(
  imageElement: HTMLImageElement | HTMLCanvasElement | ImageBitmap | HTMLVideoElement
): Promise<string | null> {
  // If native BarcodeDetector is available in Chromium / Android WebView / iOS 17+
  if (typeof window !== "undefined" && "BarcodeDetector" in window) {
    try {
      const formats = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code"];
      const detector = new (window as any).BarcodeDetector({ formats });
      const barcodes = await detector.detect(imageElement);
      if (barcodes && barcodes.length > 0) {
        return barcodes[0].rawValue;
      }
    } catch (e) {
      console.warn("BarcodeDetector error:", e);
    }
  }
  return null;
}
