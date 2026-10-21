import { useRef, useState } from "react";
import { FileDown, FileUp } from "lucide-react";
import { Button } from "@/components/ui";
import {
  BACKUP_MAX_BYTES,
  backupFileName,
  createBackup,
  parseBackup,
  serializeBackup,
  summarizeBackup,
  type Backup,
} from "@/lib/backup";
import { plural, stamp } from "@/lib/money";
import { saveFile } from "@/lib/save-file";
import { usePantry } from "@/lib/store";

const tile =
  "flex h-20 flex-col items-center justify-center gap-1.5 rounded-2xl px-2 text-sm font-medium transition-transform duration-150 ease-out active:scale-[0.96]";

function Count({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-2xl bg-soft px-2 py-3 text-center">
      <p className="font-display text-2xl">{value}</p>
      <p className="mt-0.5 text-xs leading-tight text-stone">{label}</p>
    </div>
  );
}

/** Respaldo: todo vive en el teléfono; un botón lo guarda en un archivo y otro lo vuelve a cargar. */
export function BackupCard() {
  const lastBackupAt = usePantry((state) => state.lastBackupAt);
  const itemCount = usePantry((state) => state.items.length);
  const listCount = usePantry((state) => state.saved.length + (state.current ? 1 : 0));
  const markBackedUp = usePantry((state) => state.markBackedUp);
  const restoreBackup = usePantry((state) => state.restoreBackup);
  const toast = usePantry((state) => state.toast);
  const picker = useRef<HTMLInputElement>(null);
  const [incoming, setIncoming] = useState<Backup | null>(null);

  async function save() {
    const state = usePantry.getState();
    const now = new Date();
    const backup = createBackup(
      {
        items: state.items,
        current: state.current,
        saved: state.saved,
        lastScan: state.lastScan,
        theme: state.theme,
        oneHandedMode: state.oneHandedMode,
        reviewIntervalDays: state.reviewIntervalDays,
        lastReviewedAt: state.lastReviewedAt,
      },
      now,
    );
    const name = backupFileName(now);
    const result = await saveFile(serializeBackup(backup), name, "application/json");
    if (result === "cancelled") return;
    markBackedUp(backup.exportedAt);
    toast(result === "shared" ? "Respaldo guardado." : `Respaldo descargado: ${name}`);
  }

  async function read(file: File | undefined) {
    if (!file) return;
    if (file.size > BACKUP_MAX_BYTES) {
      toast("Ese archivo es demasiado grande para ser un respaldo de mialacena.");
      return;
    }
    let source: string;
    try {
      source = await file.text();
    } catch {
      toast("No pude leer ese archivo.");
      return;
    }
    const parsed = parseBackup(source);
    if (!parsed.ok) {
      toast(parsed.error);
      return;
    }
    setIncoming(parsed.backup);
  }

  const summary = incoming ? summarizeBackup(incoming) : null;
  const replaceNote =
    itemCount === 0 && listCount === 0
      ? "Este teléfono no tiene nada guardado todavía."
      : `Reemplaza lo que hay ahora en este teléfono (${plural(itemCount, "producto", "productos")} y ${plural(listCount, "lista", "listas")}). Si lo quieres conservar, guarda antes su respaldo.`;

  return (
    <section className="rounded-3xl border border-line bg-card p-5">
      <p className="text-sm font-medium">Respaldo</p>
      <p className="mt-1 text-sm leading-relaxed text-stone">
        Todo vive en este teléfono. Guarda tu despensa y tus listas en un archivo, y cárgalo si
        cambias de aparato.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button type="button" className={`${tile} bg-soft text-ink`} onClick={() => void save()}>
          <FileDown className="size-5" aria-hidden="true" />
          Guardar respaldo
        </button>
        <button
          type="button"
          className={`${tile} border border-line text-ink`}
          onClick={() => picker.current?.click()}
        >
          <FileUp className="size-5" aria-hidden="true" />
          Cargar respaldo
        </button>
      </div>
      <p className="mt-3 text-xs text-stone">
        {lastBackupAt
          ? `Último respaldo: ${stamp(lastBackupAt)}`
          : "Aún no has guardado un respaldo de este teléfono."}
      </p>
      <input
        ref={picker}
        type="file"
        accept="application/json,.json,text/plain"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          void read(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {incoming && summary && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="respaldo-titulo"
        >
          <div className="safe-bottom w-full max-w-lg rounded-t-3xl bg-card p-5">
            <h2 id="respaldo-titulo" className="font-display text-2xl">
              ¿Cargar este respaldo?
            </h2>
            <p className="mt-1 text-sm text-stone">Guardado el {stamp(summary.exportedAt)}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Count value={summary.items} label={summary.items === 1 ? "producto" : "productos"} />
              <Count value={summary.saved} label={summary.saved === 1 ? "guardada" : "guardadas"} />
              <Count
                value={summary.openLines ?? "—"}
                label={summary.openLines === null ? "sin lista abierta" : "en la lista abierta"}
              />
            </div>
            <p className="mt-4 text-sm leading-relaxed text-stone">{replaceNote}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button variant="quiet" onClick={() => setIncoming(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  restoreBackup(incoming);
                  setIncoming(null);
                }}
              >
                Cargar respaldo
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
