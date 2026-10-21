import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Download,
  Laptop,
  PlusSquare,
  Share,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { installApp, isAppInstalled } from "@/lib/install";

type Platform = "ios" | "android" | "desktop";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function Instalar() {
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<Platform>("ios");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setInstalled(isAppInstalled());

    // Auto-detect current platform
    const ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/i.test(ua)) {
      setPlatform("ios");
    } else if (/Android/i.test(ua)) {
      setPlatform("android");
    } else {
      setPlatform("desktop");
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleNativeInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      installApp();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Hero principal */}
      <section className="hero hero-ink confetti px-5 py-6">
        <p className="sticker sticker-grape">
          <Smartphone className="size-3.5" />
          Instalar app
        </p>
        <h1 className="font-display mt-3 text-3xl leading-tight font-bold">
          mialacena en tu pantalla de inicio
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/90">
          Instálala como aplicación en tu celular o computadora. Sin tiendas de apps, sin descargas
          pesadas y sin perder tus datos locales.
        </p>

        <div className="mt-4">
          <Button
            variant="sun"
            className="btn-chunky w-full border-white/40 shadow-md"
            onClick={handleNativeInstall}
          >
            <Download className="size-4" />
            {installed ? "Reinstalar o abrir tutorial visual" : "Instalar en este dispositivo 📲"}
          </Button>
        </div>
      </section>

      {/* Estado actual de la app */}
      <section
        className={cn(
          "card-pop p-4",
          installed ? "card-sage" : "card-sun",
        )}
      >
        <div className="flex items-start gap-3">
          <span className={cn("icon-blob size-9", installed ? "icon-sage" : "icon-sun")}>
            {installed ? <CheckCircle2 className="size-5" /> : <Sparkles className="size-5" />}
          </span>
          <div>
            <h2 className="text-sm font-bold">
              {installed ? "¡App instalada y lista!" : "Navegando desde el navegador web"}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-stone">
              {installed
                ? "Estás corriendo mialacena en modo independiente. Disfruta de la experiencia a pantalla completa."
                : "Agrega mialacena a tu pantalla principal para entrar con un solo toque como cualquier app nativa."}
            </p>
          </div>
        </div>
      </section>

      {/* Selector de plataforma */}
      <section className="card-pop p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="section-title text-base">
            <span className="icon-blob icon-grape size-8">
              <Smartphone className="size-4" />
            </span>
            Guía paso a paso
          </h2>
          <span className="text-xs font-semibold text-stone">Selecciona tu equipo:</span>
        </div>

        <div
          role="tablist"
          aria-label="Plataforma de instalación"
          className="mt-3.5 grid grid-cols-3 gap-1.5 rounded-2xl bg-soft p-1.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={platform === "ios"}
            onClick={() => setPlatform("ios")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition-colors",
              platform === "ios" ? "bg-clay text-clay-ink shadow-sm" : "text-stone hover:text-ink",
            )}
          >
            <Smartphone className="size-4" />
            <span>iPhone / iPad</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={platform === "android"}
            onClick={() => setPlatform("android")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition-colors",
              platform === "android"
                ? "bg-clay text-clay-ink shadow-sm"
                : "text-stone hover:text-ink",
            )}
          >
            <Smartphone className="size-4" />
            <span>Android</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={platform === "desktop"}
            onClick={() => setPlatform("desktop")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition-colors",
              platform === "desktop"
                ? "bg-clay text-clay-ink shadow-sm"
                : "text-stone hover:text-ink",
            )}
          >
            <Laptop className="size-4" />
            <span>Computadora</span>
          </button>
        </div>

        {/* Instrucciones según plataforma */}
        <div className="mt-4">
          {platform === "ios" && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-stone">
                En Safari de Apple no necesitas App Store. Solo sigue estos tres sencillos pasos:
              </p>
              <ol className="flex flex-col gap-2.5">
                <li className="flex items-start gap-3 rounded-2xl border border-line bg-paper p-3 text-xs leading-relaxed">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-clay/15 font-bold text-clay">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-ink">Abre Safari</p>
                    <p className="mt-0.5 text-stone">
                      Asegúrate de estar navegando desde <strong>Safari</strong> (el navegador
                      predeterminado de iOS).
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3 rounded-2xl border border-line bg-paper p-3 text-xs leading-relaxed">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-clay/15 font-bold text-clay">
                    2
                  </span>
                  <div>
                    <p className="flex items-center gap-1.5 font-semibold text-ink">
                      <span>Toca Compartir</span>
                      <Share className="size-3.5 text-clay" />
                    </p>
                    <p className="mt-0.5 text-stone">
                      Pulsa el botón de <strong>Compartir</strong> (el recuadro con la flecha hacia
                      arriba) en la barra inferior o superior.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3 rounded-2xl border border-line bg-paper p-3 text-xs leading-relaxed">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-clay/15 font-bold text-clay">
                    3
                  </span>
                  <div>
                    <p className="flex items-center gap-1.5 font-semibold text-ink">
                      <span>Agregar a pantalla de inicio</span>
                      <PlusSquare className="size-3.5 text-clay" />
                    </p>
                    <p className="mt-0.5 text-stone">
                      Desliza hacia abajo en las opciones, selecciona{" "}
                      <strong>«Agregar a pantalla de inicio»</strong> y toca <strong>«Agregar»</strong>{" "}
                      en la esquina superior derecha.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          )}

          {platform === "android" && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-stone">
                En Android puedes instalarla directamente desde Google Chrome o Samsung Internet:
              </p>
              <ol className="flex flex-col gap-2.5">
                <li className="flex items-start gap-3 rounded-2xl border border-line bg-paper p-3 text-xs leading-relaxed">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-clay/15 font-bold text-clay">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-ink">Abre en Google Chrome</p>
                    <p className="mt-0.5 text-stone">
                      Abre esta misma dirección en <strong>Chrome</strong> o tu navegador favorito en
                      Android.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3 rounded-2xl border border-line bg-paper p-3 text-xs leading-relaxed">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-clay/15 font-bold text-clay">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-ink">Menú de tres puntos (⋮)</p>
                    <p className="mt-0.5 text-stone">
                      Toca el menú de opciones (tres puntos verticales en la esquina superior
                      derecha).
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3 rounded-2xl border border-line bg-paper p-3 text-xs leading-relaxed">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-clay/15 font-bold text-clay">
                    3
                  </span>
                  <div>
                    <p className="flex items-center gap-1.5 font-semibold text-ink">
                      <span>Instalar aplicación</span>
                      <Download className="size-3.5 text-clay" />
                    </p>
                    <p className="mt-0.5 text-stone">
                      Elige <strong>«Instalar aplicación»</strong> o{" "}
                      <strong>«Agregar a la pantalla principal»</strong> y confirma.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          )}

          {platform === "desktop" && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-stone">
                En Chrome, Edge o navegadores modernos para computadora:
              </p>
              <ol className="flex flex-col gap-2.5">
                <li className="flex items-start gap-3 rounded-2xl border border-line bg-paper p-3 text-xs leading-relaxed">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-clay/15 font-bold text-clay">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-ink">Ícono en la barra de direcciones</p>
                    <p className="mt-0.5 text-stone">
                      En la parte derecha de la barra de URL verás un ícono de monitor con flecha{" "}
                      <strong>«Instalar mialacena»</strong>.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3 rounded-2xl border border-line bg-paper p-3 text-xs leading-relaxed">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-clay/15 font-bold text-clay">
                    2
                  </span>
                  <div>
                    <p className="font-semibold text-ink">O desde el menú de opciones</p>
                    <p className="mt-0.5 text-stone">
                      Haz clic en los tres puntos (⋮) → <strong>«Guardar y compartir»</strong> →{" "}
                      <strong>«Instalar mialacena»</strong>.
                    </p>
                  </div>
                </li>
              </ol>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-line">
          <Button variant="quiet" className="w-full text-xs" onClick={() => installApp()}>
            Ver tutorial interactivo oficial
            <ChevronRight className="size-3.5 ml-1" />
          </Button>
        </div>
      </section>

      {/* Ventajas de tener la app instalada */}
      <section className="card-pop p-5">
        <h2 className="section-title text-base">
          <span className="icon-blob icon-sun size-8">
            <Zap className="size-4" />
          </span>
          Ventajas de instalarla
        </h2>

        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          <div className="card-pop card-sun rounded-2xl p-3">
            <p className="text-base">⚡</p>
            <p className="mt-1 text-xs font-bold text-ink">Acceso instantáneo</p>
            <p className="mt-0.5 text-[11px] leading-tight text-stone">
              Un toque en tu pantalla de inicio sin teclear direcciones.
            </p>
          </div>
          <div className="card-pop card-sky rounded-2xl p-3">
            <p className="text-base">📱</p>
            <p className="mt-1 text-xs font-bold text-ink">Pantalla completa</p>
            <p className="mt-0.5 text-[11px] leading-tight text-stone">
              Sin barras del navegador: más espacio para tu despensa.
            </p>
          </div>
          <div className="card-pop card-sage rounded-2xl p-3">
            <p className="text-base">🔒</p>
            <p className="mt-1 text-xs font-bold text-ink">100% privada</p>
            <p className="mt-0.5 text-[11px] leading-tight text-stone">
              Tus productos y listas se quedan guardados en tu teléfono.
            </p>
          </div>
          <div className="card-pop card-grape rounded-2xl p-3">
            <p className="text-base">📶</p>
            <p className="mt-1 text-xs font-bold text-ink">Rápida y ligera</p>
            <p className="mt-0.5 text-[11px] leading-tight text-stone">
              Pesa menos de 2 MB y abre de volada al hacer el súper.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
