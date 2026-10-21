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
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-paper text-ink">
        <Mark className="size-12 text-ink" />
        <p className="font-display text-3xl">mialacena</p>
      </main>
    );
  }

  return <Shell />;
}
