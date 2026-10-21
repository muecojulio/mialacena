import { useEffect } from "react";
import { Archive, House, LayoutGrid, ScanLine, ShoppingBasket } from "lucide-react";
import { Mark, Switch } from "@/components/ui";
import { cn } from "@/lib/cn";
import { usePantry } from "@/lib/store";
import type { ViewId } from "@/lib/types";
import { Hoy } from "@/components/view-hoy";
import { Despensa } from "@/components/view-despensa";
import { Escanear } from "@/components/view-scan";
import { Lista } from "@/components/view-lista";
import { Guardadas } from "@/components/view-saved";

const NAV: { id: ViewId; label: string; icon: typeof House }[] = [
  { id: "hoy", label: "Hoy", icon: House },
  { id: "despensa", label: "Despensa", icon: LayoutGrid },
  { id: "escanear", label: "Escanear", icon: ScanLine },
  { id: "lista", label: "Lista", icon: ShoppingBasket },
  { id: "guardadas", label: "Guardadas", icon: Archive },
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
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col">
        <header className="safe-top sticky top-0 z-20 flex items-center justify-between bg-paper px-5 pb-3">
          <div className="flex items-center gap-3">
            <Mark className="size-9 text-ink" />
            <div>
              <p className="font-display text-2xl leading-none">mialacena</p>
              <p className="mt-1 text-xs text-stone">Tu despensa, clara</p>
            </div>
          </div>
          <Switch
            checked={theme === "dark"}
            label={theme === "dark" ? "Tema oscuro" : "Tema claro"}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          />
        </header>

        <main className="flex-1 px-5 pb-32">
          <div key={view} className="rise">
            {view === "hoy" && <Hoy />}
            {view === "despensa" && <Despensa />}
            {view === "escanear" && <Escanear />}
            {view === "lista" && <Lista />}
            {view === "guardadas" && <Guardadas />}
          </div>
        </main>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            const center = item.id === "escanear";
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors duration-150",
                  active ? "text-clay" : "text-stone",
                )}
              >
                <span
                  className={cn(
                    "relative flex size-11 items-center justify-center rounded-full transition-transform duration-150 ease-out active:scale-[0.96]",
                    center && "bg-clay text-clay-ink",
                    !center && active && "bg-soft",
                  )}
                >
                  <Icon className="size-5" strokeWidth={1.75} />
                  {item.id === "lista" && pending > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1 text-xs text-paper">
                      {pending}
                    </span>
                  )}
                </span>
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      {notice && (
        <div className="fixed top-6 right-4 left-4 z-50 mx-auto max-w-lg">
          <p className="rise rounded-2xl bg-ink px-4 py-3 text-sm text-paper shadow-none">{notice.text}</p>
        </div>
      )}
    </div>
  );
}
