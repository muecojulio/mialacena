import { useState } from "react";
import { ExternalLink, Loader2, MapPin, Navigation, Store } from "lucide-react";
import { Button } from "@/components/ui";
import { findNearbyStores, formatDistance, type NearbyStore } from "@/lib/stores";

/**
 * Tiendas cercanas (OpenStreetMap · Overpass, sin llave). La ubicación se pide
 * solo al pulsar el botón, va directo del teléfono a OpenStreetMap y no se guarda.
 */
export function StoresCard() {
  const [busy, setBusy] = useState(false);
  const [stores, setStores] = useState<NearbyStore[] | null>(null);
  const [error, setError] = useState("");

  async function search() {
    setBusy(true);
    setError("");
    try {
      const found = await findNearbyStores();
      setStores(found);
      if (!found.length) setError("No apareció ninguna tienda en 2 km a la redonda.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "El mapa público no respondió.");
      setStores(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-3xl border border-line bg-card p-4" aria-label="Tiendas cercanas">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Store className="size-4 text-sage" />
            Tiendas cercanas
          </p>
          <p className="mt-0.5 text-xs text-stone">
            Súpers y tiendas en 2 km, del mapa público OpenStreetMap.
          </p>
        </div>
        <Button variant="quiet" className="h-10 shrink-0 text-xs" disabled={busy} onClick={() => void search()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <MapPin className="size-4" />}
          {busy ? "Buscando…" : "Buscar cerca de mí"}
        </Button>
      </div>

      {error && <p className="mt-2.5 text-xs leading-relaxed text-clay">{error}</p>}

      {stores && stores.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {stores.map((store) => (
            <li
              key={store.id}
              className="flex items-center justify-between gap-3 rounded-2xl bg-soft px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{store.name}</p>
                <p className="text-xs text-stone">
                  {store.kind} · a {formatDistance(store.distanceM)}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <a
                  href={store.mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Ver ${store.name} en el mapa`}
                  className="inline-flex size-9 items-center justify-center rounded-xl bg-card text-stone transition-transform active:scale-[0.96]"
                >
                  <ExternalLink className="size-4" />
                </a>
                <a
                  href={store.directionsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-9 items-center gap-1 rounded-xl bg-clay px-2.5 text-xs font-semibold text-clay-ink transition-transform active:scale-[0.96]"
                >
                  <Navigation className="size-3.5" />
                  Cómo llegar
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-2.5 text-[11px] text-stone">
        Datos © colaboradores de OpenStreetMap. Tu ubicación no pasa por mialacena ni se guarda.
      </p>
    </section>
  );
}
