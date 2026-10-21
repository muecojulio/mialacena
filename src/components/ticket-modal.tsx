import { useState } from "react";
import { Receipt, Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui";
import { fileToJpeg } from "@/lib/images";
import { scanTicketImage } from "@/lib/ticket.functions";
import { parseTicketText, type TicketItem } from "@/lib/ticket-parser";
import { recognizeTicketText } from "@/lib/ticket-ocr";

export type TicketModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onApply: (items: TicketItem[]) => void;
};

export function TicketModal({ isOpen, onClose, onApply }: TicketModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedItems, setScannedItems] = useState<TicketItem[]>([]);
  const [rawText, setRawText] = useState("");
  const [mode, setMode] = useState<"photo" | "manual">("photo");
  const [ocrPct, setOcrPct] = useState<number | null>(null);

  if (!isOpen) return null;

  async function handleTicketPhoto(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    setOcrPct(null);
    try {
      const dataUrl = await fileToJpeg(file);
      // Primero, lectura por IA en el servidor (si está configurada)...
      const result = await scanTicketImage({ data: { image: dataUrl } });
      if (result.ok && result.items.length > 0) {
        setScannedItems(result.items);
        return;
      }
      // ...y si no, OCR local con Tesseract.js: sin llave y sin subir la foto a ningún lado.
      try {
        setOcrPct(0);
        const text = await recognizeTicketText(dataUrl, setOcrPct);
        const parsed = parseTicketText(text);
        if (parsed.items.length > 0) {
          setScannedItems(parsed.items);
          return;
        }
        setRawText(text);
        setError(
          "El OCR de tu teléfono leyó el ticket pero no distinguió precios claros. Revisa el texto leído y ajústalo aquí.",
        );
        setMode("manual");
      } catch {
        setError(
          (result.ok
            ? "No se pudieron distinguir precios en el ticket."
            : result.error + " Tampoco se pudo leer con el OCR del teléfono.") +
            " Puedes pegar el texto del ticket abajo.",
        );
        setMode("manual");
      }
    } catch {
      setError("No se pudo procesar la foto del ticket. Puedes escribir o pegar los datos.");
      setMode("manual");
    } finally {
      setLoading(false);
      setOcrPct(null);
    }
  }

  function handleParseManualText() {
    if (!rawText.trim()) return;
    const res = parseTicketText(rawText);
    if (res.items.length > 0) {
      setScannedItems(res.items);
      setError(null);
    } else {
      setError("No se encontraron líneas con formato de precio (ej. 'Leche 28.50').");
    }
  }

  function applyAndFinish() {
    if (scannedItems.length === 0) return;
    onApply(scannedItems);
    onClose();
  }

  function updateItemPrice(index: number, priceStr: string) {
    const p = parseFloat(priceStr.replace(",", ".")) || 0;
    const next = [...scannedItems];
    next[index] = { ...next[index], price: p };
    setScannedItems(next);
  }

  function removeItem(index: number) {
    setScannedItems(scannedItems.filter((_, i) => i !== index));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 sm:items-center sm:p-4">
      <div className="safe-bottom max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-5 shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="size-5 text-clay" />
            <h2 className="font-display text-xl">Ticket con foto</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full bg-soft text-stone"
          >
            <X className="size-5" />
          </button>
        </div>

        <p className="mb-4 text-xs leading-relaxed text-stone">
          Toma una foto de tu ticket del súper. Se llenarán los precios reales que pagaste y la próxima lista arrancará con esos precios.
          Si la lectura por IA no está disponible, el ticket se lee aquí mismo en tu teléfono con
          Tesseract.js (OCR abierto, sin llave): la foto no sale del dispositivo y la primera vez puede
          tardar porque descarga el idioma español.
        </p>

        {error && (
          <div className="mb-3 rounded-2xl bg-clay/10 p-3 text-xs text-clay">
            {error}
          </div>
        )}

        {scannedItems.length === 0 ? (
          <div>
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={() => setMode("photo")}
                className={`flex-1 rounded-2xl py-2 text-xs font-medium ${
                  mode === "photo" ? "bg-ink text-paper" : "bg-soft text-stone"
                }`}
              >
                Foto de ticket
              </button>
              <button
                type="button"
                onClick={() => setMode("manual")}
                className={`flex-1 rounded-2xl py-2 text-xs font-medium ${
                  mode === "manual" ? "bg-ink text-paper" : "bg-soft text-stone"
                }`}
              >
                Texto o desglose
              </button>
            </div>

            {mode === "photo" ? (
              <div className="flex flex-col gap-3">
                <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-soft/50 text-stone transition-colors active:scale-[0.98]">
                  {loading ? (
                    <>
                      <Loader2 className="size-8 animate-spin text-clay" />
                      {ocrPct !== null && (
                        <span className="text-xs text-stone">
                          Leyendo el ticket en tu teléfono… {ocrPct}%
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <Camera className="size-8 text-clay" />
                      <span className="text-sm font-medium text-ink">Tomar foto o subir ticket</span>
                      <span className="text-xs text-stone">Walmart, Soriana, Oxxo, Chedraui...</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="sr-only"
                    disabled={loading}
                    onChange={(e) => {
                      void handleTicketPhoto(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <textarea
                  rows={5}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={"Pega las líneas del ticket aquí:\nLeche Lala 28.50\nHuevo San Juan 52.00\nArroz 34.00"}
                  className="w-full rounded-2xl border border-line bg-paper p-3 text-sm"
                />
                <Button onClick={handleParseManualText} disabled={!rawText.trim()}>
                  Extraer precios
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium text-stone">
                Productos detectados ({scannedItems.length})
              </p>
              <button
                type="button"
                onClick={() => setScannedItems([])}
                className="text-xs text-clay"
              >
                Reintentar foto
              </button>
            </div>

            <ul className="mb-4 flex max-h-60 flex-col gap-2 overflow-y-auto">
              {scannedItems.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-paper p-2.5 text-xs"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-stone">$</span>
                    <input
                      inputMode="decimal"
                      value={String(item.price)}
                      onChange={(e) => updateItemPrice(idx, e.target.value)}
                      className="h-8 w-16 rounded-lg border border-line bg-card text-center text-xs font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-stone hover:text-clay"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex gap-2">
              <Button variant="quiet" onClick={() => setScannedItems([])} className="flex-1">
                Atrás
              </Button>
              <Button variant="sage" onClick={applyAndFinish} className="flex-1">
                Llenar en la lista
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
