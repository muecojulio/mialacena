import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  Bot,
  Clock,
  Cookie,
  Database,
  EyeOff,
  FileDown,
  Globe2,
  KeyRound,
  Lock,
  Mail,
  RefreshCcw,
  ScanLine,
  ShieldCheck,
  Trash2,
  UserCheck,
} from "lucide-react";
import { Button, Mark } from "@/components/ui";
import { usePantry } from "@/lib/store";

const UPDATED_AT = "23 de octubre de 2026";
const VERSION = "2";

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

/**
 * Aviso de privacidad completo de mialacena.
 *
 * Regla editorial: si una función nueva manda algo fuera del teléfono, tiene
 * que quedar listada aquí —con qué se envía y cuándo— en la misma entrega.
 * La versión y la fecha se actualizan junto con el cambio.
 */
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
          información, qué sale del teléfono y cuándo.
        </p>
        <p className="mt-3 text-xs font-medium text-white/75">
          Versión {VERSION} · Última actualización: {UPDATED_AT}
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

      <Section icon={<UserCheck className="size-4.5" />} tone="aqua" title="Quién es el responsable">
        <p>
          <strong>mialacena</strong> es una aplicación personal de despensa. El responsable del
          tratamiento de tus datos es el equipo de mialacena, con contacto en{" "}
          <strong className="text-ink">privacidad@mialacena.app</strong>. Se rige por la Ley Federal
          de Protección de Datos Personales en Posesión de los Particulares (México) en lo que
          resulte aplicable.
        </p>
      </Section>

      <Section icon={<Database className="size-4.5" />} tone="sun" title="Qué se queda aquí (y por cuánto tiempo)">
        <p>
          Productos, marcas, cantidades, precios, fotos de producto, caducidades, listas, lecturas
          de la alacena y preferencias (tema claro/oscuro, modo una mano, recordatorio de revisión)
          viven en el <strong className="text-ink">almacenamiento local del navegador</strong> de
          este dispositivo. Se conservan hasta que borres los datos del sitio o uses «Borrar datos
          de este teléfono», aquí abajo.
        </p>
        <p className="mt-2.5">
          <strong className="text-ink">Copia de respaldo:</strong> el archivo JSON lo arma tu
          teléfono y lo guardas tú donde quieras. Ese archivo no está cifrado y viaja contigo: si lo
          compartes o lo subes a la nube, pasa a estar bajo las reglas de ese servicio.
        </p>
      </Section>

      <Section icon={<EyeOff className="size-4.5" />} tone="grape" title="Qué NO recopilamos">
        <p>
          <strong>No pedimos correo ni contraseña</strong>, no creamos perfiles, no accedemos a tus
          contactos, no leemos tu ubicación en segundo plano y no medimos tu actividad para
          anunciantes. No hay cookies de publicidad ni de terceros, ni analítica que te identifique.
          No hay venta, renta ni cesión de datos personales a nadie.
        </p>
      </Section>

      <Section icon={<Globe2 className="size-4.5" />} tone="sky" title="Qué sale del teléfono, cuándo y a dónde">
        <p>
          Nada sale solo: cada consulta ocurre cuando tú la pides (escanear, buscar, abrir una
          ficha). Todas estas APIs son públicas, sin llave y sin registro, y reciben lo mínimo:
        </p>
        <ul className="mt-2.5 flex flex-col gap-2">
          <li className="rounded-2xl bg-soft p-2.5">
            <strong className="text-ink">Open Food Facts, Open Beauty Facts y Open Products
            Facts:</strong> el <strong>código de barras</strong> que escaneaste (o el texto que
            escribes al buscar) para traer su ficha: foto, Nutri-Score, alérgenos, ingredientes y
            presentación. La ficha queda luego en tu teléfono. Datos abiertos bajo ODbL.
          </li>
          <li className="rounded-2xl bg-soft p-2.5">
            <strong className="text-ink">Open Prices:</strong> el mismo código, para enseñar precios
            públicos de referencia. Nunca se copian a tu despensa como si fueran pesos.
          </li>
          <li className="rounded-2xl bg-soft p-2.5">
            <strong className="text-ink">Frankfurter (Banco Central Europeo):</strong> solo la
            <strong> moneda</strong> del precio público (por ejemplo «EUR»), para dar una
            equivalencia aproximada en pesos. No viaja ningún dato tuyo.
          </li>
          <li className="rounded-2xl bg-soft p-2.5">
            <strong className="text-ink">TheMealDB:</strong> un <strong>ingrediente en inglés</strong>{" "}
            («egg», «milk») para sugerir recetas. No viajan cantidades, precios ni el resto de tu
            despensa.
          </li>
          <li className="rounded-2xl bg-soft p-2.5">
            <strong className="text-ink">Nager.Date:</strong> solo se pregunta qué feriados vienen en
            México; no viaja ningún dato tuyo.
          </li>
          <li className="rounded-2xl bg-soft p-2.5">
            <strong className="text-ink">OpenStreetMap (Overpass y Nominatim):</strong> al pulsar
            «Buscar cerca de mí», tu <strong>ubicación</strong> va directo de tu teléfono al mapa
            público, con el permiso del sistema, para listar súpers en 2 km y nombrar la colonia.
            No pasa por el servidor de mialacena ni se guarda.
          </li>
        </ul>
        <p className="mt-2.5">
          Las consultas a esas APIs se hacen desde el servidor de la app (salvo la del mapa), que no
          guarda tus datos: mantiene en memoria unas horas la ficha o el tipo de cambio ya
          consultado, sin asociarlo a ninguna persona.
        </p>
      </Section>

      <Section icon={<ScanLine className="size-4.5" />} tone="clay" title="Fotos, video y lectura con IA">
        <p>
          Las fotos y el video se reducen en tu teléfono y <strong>solo salen</strong> cuando pulsas
          «Decirme qué falta» o el análisis de un ticket. En ese caso se envían al servicio de
          lectura con IA (xAI) para identificar productos o precios y la app recibe el resultado;{" "}
          <strong>no se almacenan</strong> en el servidor de mialacena y la llave del servicio nunca
          llega al navegador. Son fotos de tu alacena o de tu ticket: evita enfocar datos que no
          quieras compartir.
        </p>
        <p className="mt-2.5">
          Si esa lectura no está configurada, o falla, la app usa el <strong>OCR local</strong>
          (Tesseract.js) y el <strong>lector de códigos ZXing</strong>, que corren dentro de tu
          teléfono: esas imágenes no salen a ningún servicio.
        </p>
      </Section>

      <Section icon={<Bot className="size-4.5" />} tone="berry" title="Cuando un servicio público falla">
        <p>
          La app intenta primero el servicio público. Si no responde y la lectura con IA está
          configurada, puede pedirle <strong>solo los nombres de los productos</strong> de tu
          despensa (sin precios ni cantidades) para sugerir recetas; esas sugerencias se marcan como
          «sugerida por IA». El tipo de cambio también puede venir de un valor de respaldo
          configurado por la propia app cuando el servicio del BCE no responde. En ningún caso se
          crea un perfil con esa información.
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

      <Section icon={<Cookie className="size-4.5" />} tone="sky" title="Cookies y almacenamiento local">
        <p>
          mialacena <strong>no usa cookies de rastreo</strong>. Usa el almacenamiento del navegador
          para recordar tu despensa, tus listas y tu tema. Borrar los datos del sitio en tu
          navegador borra todo lo que la app guarda; también puedes hacerlo con el botón de abajo.
        </p>
      </Section>

      <Section icon={<Lock className="size-4.5" />} tone="grape" title="Seguridad">
        <p>
          La app responde con encabezados de seguridad (CSP, anti-MIME-sniffing, política de
          permisos, referer y aislamiento de ventana), limita la frecuencia de sus servicios y valida
          cada dato que entra. Las llaves de servicios viven solo en el servidor. La conexión con el
          sitio usa HTTPS. Ningún sistema es perfecto: si tu despensa es valiosa para ti, guarda un
          respaldo.
        </p>
      </Section>

      <Section icon={<Clock className="size-4.5" />} tone="sun" title="Cuánto tiempo se conserva">
        <p>
          En tu teléfono, hasta que tú lo borres. En el servidor de la app, <strong>nada</strong>:
          no hay base de datos de usuarios ni de despensas. Los servicios públicos consultados
          aplican sus propias políticas de retención de registros técnicos (dirección IP) por
          seguridad; mialacena no controla eso ni les envía un identificador tuyo.
        </p>
      </Section>

      <Section icon={<KeyRound className="size-4.5" />} tone="grape" title="Tus derechos (ARCO)">
        <p>
          Como tus datos viven solo en tu teléfono, tú ejerces tus derechos de acceso, rectificación,
          cancelación y oposición directamente en la app: edita o borra productos y listas cuando
          quieras, descarga un respaldo o usa «Borrar datos de este teléfono». No hay copia en
          nuestros servidores que eliminar porque no existe. Para dudas o ejercicio de derechos por
          correo, escríbenos a <strong className="text-ink">privacidad@mialacena.app</strong>.
        </p>
      </Section>

      <Section icon={<RefreshCcw className="size-4.5" />} tone="sage" title="Menores de edad">
        <p>
          mialacena no está dirigida a menores de edad y no recopila datos de menores de forma
          consciente, porque no recopila datos personales de nadie. Si un menor usa la app, es
          responsabilidad de quien ejerce la patria potestad supervisar el dispositivo.
        </p>
      </Section>

      <Section icon={<RefreshCcw className="size-4.5" />} tone="clay" title="Cambios a este aviso">
        <p>
          Si algún día la app cambia —por ejemplo, si se agregara sincronización entre dispositivos
          o un servicio nuevo que reciba datos— este aviso se actualizará aquí mismo, con su versión
          y fecha, y te avisaremos dentro de la app antes de que cambie el trato de tus datos.
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
          Versión {VERSION} del aviso · aplica a la app mialacena en este dispositivo.
        </p>
        <span className="sticker sticker-clay mt-1">
          <Bell className="size-3" />
          Sin spam, sin cuentas, sin sorpresas
        </span>
      </footer>
    </article>
  );
}
