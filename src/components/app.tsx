import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { Mark } from "@/components/ui";
import { usePantry } from "@/lib/store";

export function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    const done = () => {
      if (live) setReady(true);
    };
    if (usePantry.persist.hasHydrated()) done();
    const unsub = usePantry.persist.onFinishHydration(done);
    const timer = window.setTimeout(done, 500);
    return () => {
      live = false;
      unsub();
      window.clearTimeout(timer);
    };
  }, []);

  if (!ready) {
    return (
      <main className="confetti flex min-h-screen flex-col items-center justify-center gap-4 bg-paper text-ink">
        <span className="wiggle flex size-20 items-center justify-center rounded-[1.6rem] border-[1.5px] border-line bg-card shadow-lg">
          <Mark className="size-14 text-ink" />
        </span>
        <p className="font-display text-4xl font-bold">mialacena</p>
        <p className="rounded-full bg-soft px-4 py-1.5 text-sm font-medium text-stone">
          Abriendo la despensa… 🧺
        </p>
      </main>
    );
  }

  return <Shell />;
}
