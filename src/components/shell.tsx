import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Archive, House, LayoutGrid, ScanLine, ShieldCheck, ShoppingBasket } from "lucide-react";
import { Mark, Switch } from "@/components/ui";
import { cn } from "@/lib/cn";
import { usePantry } from "@/lib/store";
import type { ViewId } from "@/lib/types";
import { Hoy } from "@/components/view-hoy";
import { Despensa } from "@/components/view-despensa";
import { Escanear } from "@/components/view-scan";
import { Lista } from "@/components/view-lista";
import { Guardadas } from "@/components/view-saved";

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
  { id: "escanear", label: "Escanear", icon: ScanLine, accent: "text-sun-ink", pill: "", dot: "bg-sun" },
  { id: "lista", label: "Lista", icon: ShoppingBasket, accent: "text-sky", pill: "bg-sky/15", dot: "bg-sky" },
  { id: "guardadas", label: "Guardadas", icon: Archive, accent: "text-berry", pill: "bg-berry/15", dot: "bg-berry" },
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
              <Link
                to="/privacidad"
                aria-label="Políticas de privacidad"
                className="flex size-9 items-center justify-center rounded-full bg-white/25 text-white transition-transform active:scale-95"
              >
                <ShieldCheck className="size-4.5" />
              </Link>
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
            {view === "escanear" && <Escanear />}
            {view === "lista" && <Lista />}
            {view === "guardadas" && <Guardadas />}
          </div>
        </main>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t-[1.5px] border-line bg-card/95 backdrop-blur-md">
        <div className="mx-auto grid max-w-lg grid-cols-5 px-1 pt-1.5">
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
                className="flex flex-col items-center gap-1 pb-1.5 text-xs font-semibold"
              >
                <span
                  className={cn(
                    "nav-pill relative flex size-11 items-center justify-center rounded-2xl",
                    center && "scan-fab -mt-4 size-12 rounded-2xl",
                    !center && active && cn("nav-pill-active", item.pill),
                    !center && !active && "bg-soft/60",
                    !center && (active ? item.accent : "text-stone"),
                  )}
                >
                  <Icon className={cn(center && "size-5.5")} strokeWidth={2} />
                  {item.id === "lista" && pending > 0 && (
                    <span className="pop-in absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-card bg-berry px-1 text-xs font-bold text-berry-ink">
                      {pending}
                    </span>
                  )}
                </span>
                <span className={cn(active ? item.accent : "text-stone", center && active && "text-clay")}>
                  {item.label}
                </span>
                <span
                  className={cn(
                    "h-1 rounded-full transition-all duration-200",
                    active ? cn("w-5", item.dot) : "w-0 bg-transparent",
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
