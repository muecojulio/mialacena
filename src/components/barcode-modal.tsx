import { useState, useRef, useEffect } from "react";
import { Barcode, Camera, X, Check, Loader2 } from "lucide-react";
import { Button, TextField } from "@/components/ui";
import { lookupBarcode } from "@/lib/barcode.functions";
import { detectBarcodeFromImage } from "@/lib/barcode-detector";
import { fileToJpeg } from "@/lib/images";

export type BarcodeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onFound: (product: {
    name: string;
    brand: string;
    barcode: string;
    category?: string;
    packageType?: string;
    unit?: string;
    targetQty?: number;
    usualPrice?: number;
  }) => void;
  title?: string;
};

export function BarcodeModal({ isOpen, onClose, onFound, title = "Escanear código de barras" }: BarcodeModalProps) {
  const [manualCode, setManualCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setError(null);
      setManualCode("");
    }
  }, [isOpen]);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      // Start detection loop
      scanLoop();
    } catch (e) {
      console.warn("Camera not available:", e);
      setError("No se pudo abrir la cámara. Puedes subir una foto o escribir el código.");
      setCameraActive(false);
    }
  }

  async function scanLoop() {
    if (!streamRef.current || !videoRef.current) return;
    try {
      const detected = await detectBarcodeFromImage(videoRef.current);
      if (detected) {
        stopCamera();
        await handleBarcode(detected);
        return;
      }
    } catch {
      // continue loop
    }
    if (streamRef.current) {
      requestAnimationFrame(() => {
        setTimeout(scanLoop, 300);
      });
    }
  }

  async function handleBarcode(code: string) {
    const clean = code.trim().replace(/\D/g, "");
    if (clean.length < 5) {
      setError("El código debe tener al menos 5 dígitos.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await lookupBarcode({ data: { barcode: clean } });
      if (res.ok) {
        onFound(res.product);
        onClose();
      } else {
        setError(res.error || "No se encontró el producto.");
      }
    } catch (err: any) {
      setError(err?.message || "Error al consultar el código.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePhotoCapture(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const dataUrl = await fileToJpeg(file);
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      const code = await detectBarcodeFromImage(img);
      if (code) {
        await handleBarcode(code);
      } else {
        setError("No se reconoció un código de barras nítido en la foto. Puedes escribirlo.");
      }
    } catch {
      setError("No se pudo procesar la foto.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 sm:items-center sm:p-4">
      <div className="safe-bottom max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Barcode className="size-5 text-clay" />
            <h2 className="font-display text-xl">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-soft text-stone"
          >
            <X className="size-5" />
          </button>
        </div>

        <p className="mb-4 text-xs text-stone">
          Apunta al código o toma una foto. Open Food Facts consultará nombre y marca al instante.
        </p>

        {error && (
          <div className="mb-3 rounded-2xl bg-clay/10 p-3 text-xs text-clay">
            {error}
          </div>
        )}

        {cameraActive ? (
          <div className="relative mb-4 overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} playsInline muted className="h-56 w-full object-cover" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-28 w-48 rounded-xl border-2 border-dashed border-clay/80" />
            </div>
            <button
              type="button"
              onClick={stopCamera}
              className="absolute top-2 right-2 rounded-full bg-ink/70 px-3 py-1 text-xs text-paper"
            >
              Apagar cámara
            </button>
          </div>
        ) : (
          <div className="mb-4 grid grid-cols-2 gap-2">
            <Button
              variant="sage"
              onClick={startCamera}
              className="flex items-center justify-center gap-2"
              disabled={loading}
            >
              <Camera className="size-4" />
              Cámara en vivo
            </Button>
            <label className="flex h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-soft text-sm font-medium transition-transform active:scale-[0.96]">
              <Barcode className="size-4" />
              Tomar foto
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => {
                  void handlePhotoCapture(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        )}

        <div className="rounded-2xl border border-line p-3">
          <p className="mb-2 text-xs font-medium text-stone">O ingresa los dígitos del código</p>
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              placeholder="Ej. 7501020512130"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleBarcode(manualCode);
                }
              }}
              className="h-11 flex-1 rounded-xl border border-line bg-paper px-3 text-sm"
            />
            <Button
              onClick={() => void handleBarcode(manualCode)}
              disabled={manualCode.trim().length < 5 || loading}
              className="h-11 px-4"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            </Button>
          </div>
        </div>

        <Button variant="quiet" onClick={onClose} className="mt-4 w-full">
          Cancelar
        </Button>
      </div>
    </div>
  );
}
