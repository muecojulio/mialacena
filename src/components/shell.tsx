import { useEffect } from "react";
import {
  Archive,
  House,
  LayoutGrid,
  ScanLine,
  ShieldCheck,
  ShoppingBasket,
  Smartphone,
} from "lucide-react";
import { Mark, Switch } from "@/components/ui";
import { cn } from "@/lib/cn";
import { usePantry } from "@/lib/store";
import type { ViewId } from "@/lib/types";
import { Hoy } from "@/components/view-hoy";
import { Despensa } from "@/components/view-despensa";
import { Escanear } from "@/components/view-scan";
import { Lista } from "@/components/view-lista";
import { Guardadas } from "@/components/view-saved";
import { Instalar } from "@/components/view-install";
import { PrivacidadView } from "@/components/view-privacidad";

const NAV: {
  id: ViewId;
  label: string;
  icon: typeof House;
  accent: string;
  pill: string;
  dot: string;
}[] = [
  { id: "hoy", label: "Hoy", icon: House, accent: "text-clay", pill: "bg-clay/15", dot: "bg-clay" },
  { id: "despensa", label: "Despensa", icon: LayoutGrid, accent: "text-sage", pill: "bg-sage/15", dot: "bg-sage" },
  { id: "lista", label: "Lista", icon: ShoppingBasket, accent: "text-sky", pill: "bg-sky/15", dot: "bg-sky" },
  { id: "escanear", label: "Escanear", icon: ScanLine, accent: "text-sun-ink", pill: "", dot: "bg-sun" },
  { id: "guardadas", label: "Guardadas", icon: Archive, accent: "text-berry", pill: "bg-berry/15", dot: "bg-berry" },
  { id: "instalar", label: "Instalar", icon: Smartphone, accent: "text-grape", pill: "bg-grape/15", dot: "bg-grape" },
  { id: "privacidad", label: "Privacidad", icon: ShieldCheck, accent: "text-aqua", pill: "bg-aqua/15", dot: "bg-aqua" },
];

export function Shell() {
  const view = usePantry((state) => state.view);
  const setView = usePantry((state) => state.setView);
  const theme = usePantry((state) => state.theme);
  const setTheme = usePantry((state) => state.setTheme);
  const notice = usePantry((state) => state.notice);
  const clearNotice = usePantry((state) => state.clearNotice);
  const pending = usePantry((state) => state.current?.lines.length ?? 0);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(clearNotice, 2800);
    return () => window.clearTimeout(timer);
  }, [notice, clearNotice]);

  return (
    <div className="min-h-screen text-ink">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col">
        <header className="safe-top sticky top-0 z-20 px-4 pb-3">
          <div className="hero hero-ink relative flex items-center justify-between gap-3 rounded-[1.55rem] px-4 py-3">
            <span className="blob -top-6 -left-6 size-20 bg-white/25" aria-hidden="true" />
            <div className="flex items-center gap-3">
              <span className="pop-in float-slow flex size-11 items-center justify-center rounded-2xl bg-white/90 shadow-sm">
                <Mark className="size-8 text-ink" />
              </span>
              <div>
                <p className="font-display text-2xl leading-none font-bold drop-shadow-sm">
                  mialacena
                </p>
                <p className="mt-1 text-xs font-medium text-white/90">
                  🥑 Tu despensa, viva y a tope
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setView("privacidad")}
                aria-label="Políticas de privacidad"
                className={cn(
                  "flex size-9 items-center justify-center rounded-full transition-transform active:scale-95",
                  view === "privacidad" ? "bg-white text-ink shadow-sm" : "bg-white/25 text-white",
                )}
              >
                <ShieldCheck className="size-4.5" />
              </button>
              <Switch
                checked={theme === "dark"}
                label={theme === "dark" ? "Tema oscuro" : "Tema claro"}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-32">
          <div key={view} className="rise">
            {view === "hoy" && <Hoy />}
            {view === "despensa" && <Despensa />}
            {view === "lista" && <Lista />}
            {view === "escanear" && <Escanear />}
            {view === "guardadas" && <Guardadas />}
            {view === "instalar" && <Instalar />}
            {view === "privacidad" && <PrivacidadView />}
          </div>
        </main>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t-[1.5px] border-line bg-card/95 backdrop-blur-md">
        <div className="mx-auto grid max-w-lg grid-cols-7 px-0.5 sm:px-1 pt-1.5 pb-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            const center = item.id === "escanear";
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                aria-label={item.id === "lista" && pending > 0 ? `${item.label}, ${pending} en la lista` : item.label}
                aria-current={active ? "page" : undefined}
                className="flex flex-col items-center gap-0.5 pb-1 text-[11px] font-semibold"
              >
                <span
                  className={cn(
                    "nav-pill relative flex size-9 sm:size-10 items-center justify-center rounded-xl sm:rounded-2xl",
                    center && "scan-fab -mt-3.5 size-11 sm:size-12 rounded-2xl",
                    !center && active && cn("nav-pill-active", item.pill),
                    !center && !active && "bg-soft/60",
                    !center && (active ? item.accent : "text-stone"),
                  )}
                >
                  <Icon className={cn(center ? "size-5 sm:size-5.5" : "size-4.5 sm:size-5")} strokeWidth={2} />
                  {item.id === "lista" && pending > 0 && (
                    <span className="pop-in absolute -top-1 -right-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full border-2 border-card bg-berry px-1 text-[10px] font-bold text-berry-ink">
                      {pending}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "max-w-full truncate px-0.5 text-[10px] sm:text-[11px] tracking-tight leading-tight",
                    active ? item.accent : "text-stone",
                    center && active && "text-clay",
                  )}
                >
                  {item.label}
                </span>
                <span
                  className={cn(
                    "h-0.5 sm:h-1 rounded-full transition-all duration-200",
                    active ? cn("w-4 sm:w-5", item.dot) : "w-0 bg-transparent",
                  )}
                />
              </button>
            );
          })}
        </div>
      </nav>

      {notice && (
        <div className="fixed top-6 right-4 left-4 z-50 mx-auto max-w-lg">
          <p className="toast-pop flex items-center gap-2.5 px-4 py-3 text-sm font-semibold shadow-none">
            <span aria-hidden="true" className="text-base">✨</span>
            {notice.text}
          </p>
        </div>
      )}
    </div>
  );
}
