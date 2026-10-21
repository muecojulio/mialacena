import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  Cookie,
  Database,
  FileDown,
  KeyRound,
  Mail,
  MapPin,
  RefreshCcw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
} from "lucide-react";
import { Button, Mark } from "@/components/ui";
import { usePantry } from "@/lib/store";

function Section({
  icon,
  tone,
  title,
  children,
}: {
  icon: React.ReactNode;
  tone: "sun" | "sky" | "sage" | "berry" | "grape" | "clay" | "aqua";
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-pop p-5">
      <h2 className="section-title text-base">
        <span className={`icon-blob icon-${tone} size-9`}>{icon}</span>
        {title}
      </h2>
      <div className="mt-2.5 text-sm leading-relaxed text-stone [&_strong]:text-ink">{children}</div>
    </section>
  );
}

export function PrivacidadView({ standalone = false }: { standalone?: boolean }) {
  const wipe = usePantry((state) => state.wipe);
  const setView = usePantry((state) => state.setView);
  const toast = usePantry((state) => state.toast);
  const [confirm, setConfirm] = useState(false);

  function handleWipe() {
    wipe();
    setConfirm(false);
    toast("Se borraron todos los datos locales de la app.");
    if (!standalone) {
      setView("hoy");
    }
  }

  return (
    <article className="flex flex-col gap-4">
      {standalone && (
        <Link
          to="/"
          className="inline-flex w-fit items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-1.5 text-sm font-semibold text-stone transition-transform active:scale-95"
        >
          ← Volver a la app
        </Link>
      )}

      <header className="hero hero-ink confetti px-5 py-6">
        <p className="sticker sticker-sage">
          <ShieldCheck className="size-3.5" />
          Aviso de privacidad
        </p>
        <h1 className="font-display mt-3 text-3xl sm:text-4xl leading-tight font-bold">
          Tus datos, tus reglas
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/90">
          mialacena guarda tu despensa y tus listas en este teléfono. No hay cuenta, no hay
          publicidad y no vendemos datos. Este aviso explica —en claro— qué pasa con tu
          información.
        </p>
        <p className="mt-3 text-xs font-medium text-white/75">
          Última actualización: 21 de octubre de 2026
        </p>
      </header>

      <div className="grid grid-cols-3 gap-2.5">
        <div className="card-pop card-sage rounded-2xl p-3 text-center">
          <p className="text-lg">📱</p>
          <p className="mt-1 text-[11px] leading-tight font-semibold">
            Todo se queda en tu teléfono
          </p>
        </div>
        <div className="card-pop card-sun rounded-2xl p-3 text-center">
          <p className="text-lg">🚫</p>
          <p className="mt-1 text-[11px] leading-tight font-semibold">
            Sin cuentas ni publicidad
          </p>
        </div>
        <div className="card-pop card-sky rounded-2xl p-3 text-center">
          <p className="text-lg">🤝</p>
          <p className="mt-1 text-[11px] leading-tight font-semibold">
            Nada se vende ni se comparte
          </p>
        </div>
      </div>

      <Section icon={<Database className="size-4.5" />} tone="sun" title="Qué se queda aquí">
        <p>
          Productos, marcas, cantidades, precios, fotos de producto y listas viven en el
          almacenamiento local del navegador. Si borras los datos del sitio, se van. Otro teléfono
          no las ve, a menos que le cargues un respaldo.
        </p>
      </Section>

      <Section icon={<Sparkles className="size-4.5" />} tone="grape" title="Qué NO recopilamos">
        <p>
          <strong>No pedimos correo ni contraseña</strong>, no creamos perfiles, no medimos tu
          actividad para anunciantes y no usamos cookies de publicidad ni de terceros. No hay
          analítica que te identifique.
        </p>
      </Section>

      <Section icon={<FileDown className="size-4.5" />} tone="sage" title="Respaldo">
        <p>
          «Guardar respaldo» arma en tu teléfono un archivo con tu despensa, tus listas y tus
          precios; <strong>no pasa por ningún servidor</strong>. Tú eliges dónde dejarlo, así que
          trátalo como algo personal. «Cargar respaldo» lo lee en el otro teléfono y reemplaza lo
          que haya ahí.
        </p>
      </Section>

      <Section icon={<ScanLine className="size-4.5" />} tone="clay" title="Fotos y video">
        <p>
          Solo salen de tu teléfono cuando pulsas «Decirme qué falta». Antes se reducen a JPEG y se
          les quita el archivo original. El servidor no las guarda: las usa una vez para leer el
          estante y responde con la lista. La clave de ese servicio no viaja al navegador.
        </p>
      </Section>

      <Section icon={<Cookie className="size-4.5" />} tone="berry" title="Catálogo de marcas">
        <p>
          Al escribir un producto se consulta Open Food Facts, un catálogo público. Solo se envía el
          texto que escribes, no tu lista ni tus precios.
        </p>
      </Section>

      <Section icon={<MapPin className="size-4.5" />} tone="aqua" title="Servicios públicos sin cuenta">
        <p>
          Ninguno pide registro ni llave, y cada uno recibe lo mínimo, solo cuando lo usas:
        </p>
        <ul className="mt-2.5 flex flex-col gap-2">
          <li className="rounded-2xl bg-soft p-2.5">
            <strong className="text-ink">Open Food Facts y Open Prices:</strong> el código de
            barras que escaneaste, para traer su ficha (Nutri-Score, alérgenos, ingredientes) y
            precios públicos de referencia. La ficha se guarda después en tu teléfono.
          </li>
          <li className="rounded-2xl bg-soft p-2.5">
            <strong className="text-ink">TheMealDB:</strong> un ingrediente en inglés («egg»,
            «milk») para sugerir recetas. No viajan cantidades ni precios.
          </li>
          <li className="rounded-2xl bg-soft p-2.5">
            <strong className="text-ink">Nager.Date:</strong> solo se pregunta qué feriados vienen
            en México; no viaja ningún dato tuyo.
          </li>
          <li className="rounded-2xl bg-soft p-2.5">
            <strong className="text-ink">OpenStreetMap (Overpass):</strong> al pulsar «Buscar cerca
            de mí», tu ubicación va directo de tu teléfono al mapa público, con el permiso del
            sistema. No pasa por el servidor de mialacena ni se guarda.
          </li>
        </ul>
        <p className="mt-2.5">
          La lectura de códigos de barras (ZXing) y el OCR de tickets (Tesseract.js) corren dentro
          de tu teléfono: esas fotos no salen a ningún servicio.
        </p>
      </Section>

      <Section icon={<Cookie className="size-4.5" />} tone="sky" title="Cookies y almacenamiento local">
        <p>
          mialacena usa el almacenamiento del navegador (y no cookies de rastreo) para recordar tu
          despensa, tus listas y tu tema claro/oscuro. Borrar los datos del sitio en tu navegador
          borra todo lo que la app guarda.
        </p>
      </Section>

      <Section icon={<KeyRound className="size-4.5" />} tone="grape" title="Seguridad">
        <p>
          La app responde con encabezados de seguridad (CSP, anti-MIME-sniffing, política de
          permisos y referer), limita la frecuencia de sus servicios y valida cada dato que entra.
          Aun así, ningún sistema es perfecto: guarda un respaldo si tu despensa es valiosa para
          ti.
        </p>
      </Section>

      <Section icon={<UserCheck className="size-4.5" />} tone="clay" title="Tus derechos (ARCO)">
        <p>
          Como tus datos viven solo en tu teléfono, tú ejerces tus derechos de acceso, rectificación,
          cancelación y oposición directamente en la app: edita o borra productos y listas cuando
          quieras, o usa «Borrar datos de este teléfono» de abajo. No hay copia en nuestros
          servidores que eliminar porque no existe.
        </p>
      </Section>

      <Section icon={<RefreshCcw className="size-4.5" />} tone="sage" title="Cambios a este aviso">
        <p>
          Si algún día la app cambia —por ejemplo, si se agregara sincronización entre
          dispositivos— este aviso se actualizará aquí mismo, con su fecha, y te avisaremos dentro
          de la app antes de que cambie el trato de tus datos.
        </p>
      </Section>

      <Section icon={<Mail className="size-4.5" />} tone="sun" title="Contacto">
        <p>
          ¿Dudas sobre privacidad? Escríbenos a{" "}
          <strong className="text-ink">privacidad@mialacena.app</strong> y te respondemos en
          español, sin robots de por medio.
        </p>
      </Section>

      <section className="card-pop card-berry p-5">
        <h2 className="section-title text-base">
          <span className="icon-blob icon-berry size-9">
            <Trash2 className="size-4.5" />
          </span>
          Borrar este teléfono
        </h2>
        <p className="mt-2.5 text-sm leading-relaxed text-stone">
          Quita la despensa, la compra abierta y las listas guardadas. Si las quieres conservar,
          guarda antes un respaldo desde Hoy.
        </p>
        {confirm ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="quiet" onClick={() => setConfirm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleWipe}>
              Sí, borrar todo
            </Button>
          </div>
        ) : (
          <Button variant="ghost" className="mt-4 w-full" onClick={() => setConfirm(true)}>
            Borrar datos de este teléfono
          </Button>
        )}
      </section>

      <footer className="mt-2 flex flex-col items-center gap-2 pb-4 text-center">
        <Mark className="size-10 text-ink" />
        <p className="text-xs font-medium text-stone">
          mialacena · Hecho con cariño en México 🇲🇽
        </p>
        <p className="text-[11px] text-stone">
          Este aviso se aplica a la app mialacena en este dispositivo.
        </p>
        <span className="sticker sticker-clay mt-1">
          <Bell className="size-3" />
          Sin spam, sin cuentas, sin sorpresas
        </span>
      </footer>
    </article>
  );
}
