import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui";
import { usePantry } from "@/lib/store";

export const Route = createFileRoute("/privacidad")({ component: Privacidad });

function Privacidad() {
  const wipe = usePantry((state) => state.wipe);
  const [confirm, setConfirm] = useState(false);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <article className="safe-top mx-auto flex max-w-lg flex-col gap-4 px-5 pb-16">
        <Link to="/" className="text-sm text-stone">
          Volver
        </Link>
        <h1 className="font-display text-4xl">Privacidad</h1>
        <p className="text-sm leading-relaxed text-stone">
          mialacena guarda tu despensa y tus listas en este teléfono. No hay cuenta, no hay publicidad y no
          vendemos datos.
        </p>
        <section className="rounded-3xl bg-card p-5 text-sm leading-relaxed">
          <h2 className="font-medium">Qué se queda aquí</h2>
          <p className="mt-2 text-stone">
            Productos, marcas, cantidades, precios y listas viven en el almacenamiento local del navegador.
            Si borras los datos del sitio, se van. Otro teléfono no las ve, a menos que le cargues un
            respaldo.
          </p>
        </section>
        <section className="rounded-3xl bg-card p-5 text-sm leading-relaxed">
          <h2 className="font-medium">Respaldo</h2>
          <p className="mt-2 text-stone">
            «Guardar respaldo» arma en tu teléfono un archivo con tu despensa, tus listas y tus precios;
            no pasa por ningún servidor. Tú eliges dónde dejarlo, así que trátalo como algo personal.
            «Cargar respaldo» lo lee en el otro teléfono y reemplaza lo que haya ahí.
          </p>
        </section>
        <section className="rounded-3xl bg-card p-5 text-sm leading-relaxed">
          <h2 className="font-medium">Fotos y video</h2>
          <p className="mt-2 text-stone">
            Solo salen de tu teléfono cuando pulsas «Decirme qué falta». Antes se reducen a JPEG y se les
            quita el archivo original. El servidor no las guarda: las usa una vez para leer el estante y
            responde con la lista. La clave de ese servicio no viaja al navegador.
          </p>
        </section>
        <section className="rounded-3xl bg-card p-5 text-sm leading-relaxed">
          <h2 className="font-medium">Catálogo de marcas</h2>
          <p className="mt-2 text-stone">
            Al escribir un producto se consulta Open Food Facts, un catálogo público. Solo se envía el texto
            que escribes, no tu lista ni tus precios.
          </p>
        </section>
        <section className="rounded-3xl bg-card p-5 text-sm leading-relaxed">
          <h2 className="font-medium">Servicios públicos sin cuenta</h2>
          <p className="mt-2 text-stone">
            Ninguno pide registro ni llave, y cada uno recibe lo mínimo, solo cuando lo usas:
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-stone">
            <li>
              <strong className="text-ink">Open Food Facts y Open Prices:</strong> el código de barras que
              escaneaste, para traer su ficha (Nutri-Score, alérgenos, ingredientes) y precios públicos de
              referencia. La ficha se guarda después en tu teléfono.
            </li>
            <li>
              <strong className="text-ink">TheMealDB:</strong> un ingrediente en inglés («egg», «milk») para
              sugerir recetas. No viajan cantidades ni precios.
            </li>
            <li>
              <strong className="text-ink">Nager.Date:</strong> solo se pregunta qué feriados vienen en
              México; no viaja ningún dato tuyo.
            </li>
            <li>
              <strong className="text-ink">OpenStreetMap (Overpass):</strong> al pulsar «Buscar cerca de
              mí», tu ubicación va directo de tu teléfono al mapa público, con el permiso del sistema. No
              pasa por el servidor de mialacena ni se guarda.
            </li>
          </ul>
          <p className="mt-2 text-stone">
            La lectura de códigos de barras (ZXing) y el OCR de tickets (Tesseract.js) corren dentro de tu
            teléfono: esas fotos no salen a ningún servicio.
          </p>
        </section>
        <section className="rounded-3xl border border-line p-5">
          <h2 className="font-medium">Borrar este teléfono</h2>
          <p className="mt-2 text-sm text-stone">
            Quita la despensa, la compra abierta y las listas guardadas. Si las quieres conservar, guarda
            antes un respaldo desde Hoy.
          </p>
          {confirm ? (
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="quiet" onClick={() => setConfirm(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  wipe();
                  setConfirm(false);
                }}
              >
                Borrar
              </Button>
            </div>
          ) : (
            <Button variant="ghost" className="mt-4 w-full" onClick={() => setConfirm(true)}>
              Borrar datos de este teléfono
            </Button>
          )}
        </section>
      </article>
    </main>
  );
}
