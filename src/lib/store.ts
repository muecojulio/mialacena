import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SEED } from "./seed.ts";
import type { ListLine, PantryItem, ScanReport, ShopList, ViewId } from "./types.ts";

type Notice = { id: number; text: string } | null;

type PantryState = {
  theme: "light" | "dark";
  view: ViewId;
  items: PantryItem[];
  current: ShopList | null;
  saved: ShopList[];
  lastScan: ScanReport | null;
  notice: Notice;
  oneHandedMode: boolean; // Modo de una sola mano con letras grandes
  setTheme: (theme: "light" | "dark") => void;
  setView: (view: ViewId) => void;
  setOneHandedMode: (enabled: boolean) => void;
  upsertItem: (item: PantryItem) => void;
  removeItem: (id: string) => void;
  removePreload: () => void;
  rememberScan: (report: ScanReport) => void;
  openList: (list: ShopList) => void;
  patchLine: (id: string, patch: Partial<ListLine>) => void;
  addLine: (line: Omit<ListLine, "id" | "inCart"> & { inCart?: boolean }) => void;
  removeLine: (id: string) => void;
  sendToShopList: (item: PantryItem) => void; // "Se acabó"
  setSpendingBudget: (budget: number | null) => void; // Tope de gasto
  applyTicketPrices: (ticketItems: { name: string; price: number; qty?: number }[]) => number; // Llena precios y guarda historial
  saveSnapshot: () => void;
  renameCurrent: (title: string) => void;
  finishList: () => void;
  startNew: (source?: ShopList["source"]) => void;
  reuseSaved: (id: string) => void;
  deleteSaved: (id: string) => void;
  toast: (text: string) => void;
  clearNotice: () => void;
  wipe: () => void;
  checkExpiredItems: () => void; // Checks expired items and sends to shop list
};

function nowIso(): string {
  return new Date().toISOString();
}

export function blankList(source: ShopList["source"], title?: string): ShopList {
  const createdAt = nowIso();
  return {
    id: crypto.randomUUID(),
    title: title ?? (source === "scan" ? "Faltantes del escaneo" : "Lista de compra"),
    createdAt,
    updatedAt: createdAt,
    finishedAt: null,
    status: "active",
    source,
    spendingBudget: null,
    lines: [],
  };
}

const DEFAULT_TITLES = new Set(["Faltantes del escaneo", "Lista de compra"]);

function savedTitle(title: string, taken: string[]): string {
  const clean = title.trim() || "Lista de compra";
  const stamp = new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());
  if (!DEFAULT_TITLES.has(clean) && !taken.includes(clean)) return clean;
  let candidate = `${clean} · ${stamp}`;
  let n = 2;
  while (taken.includes(candidate)) {
    candidate = `${clean} · ${stamp} (${n})`;
    n += 1;
  }
  return candidate;
}

export function lineFromItem(item: PantryItem, qty = item.targetQty): ListLine {
  // If item has a last real price paid, start with that! Otherwise usualPrice
  const initialPrice = (item.lastPrice !== undefined && item.lastPrice > 0) ? item.lastPrice : item.usualPrice;
  return {
    id: crypto.randomUUID(),
    pantryItemId: item.id,
    name: item.name,
    brand: item.brand,
    unit: item.packageType || item.unit,
    qty,
    unitPrice: initialPrice,
    inCart: false,
    isEssential: item.isEssential,
    category: item.category,
    lastPaidPrice: item.lastPrice,
  };
}

export const usePantry = create<PantryState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      view: "hoy",
      items: SEED,
      current: null,
      saved: [],
      lastScan: null,
      notice: null,
      oneHandedMode: false,
      setTheme: (theme) => set({ theme }),
      setView: (view) => set({ view }),
      setOneHandedMode: (oneHandedMode) => set({ oneHandedMode }),
      upsertItem: (item) =>
        set((state) => {
          const exists = state.items.some((row) => row.id === item.id);
          return {
            items: exists
              ? state.items.map((row) => (row.id === item.id ? item : row))
              : [item, ...state.items],
          };
        }),
      removeItem: (id) => set((state) => ({ items: state.items.filter((row) => row.id !== id) })),
      removePreload: () =>
        set((state) => {
          const preloadIds = new Set(SEED.map((row) => row.id));
          const items = state.items.filter((row) => !preloadIds.has(row.id));
          return {
            items,
            notice: { id: Date.now(), text: "Precarga quitada de la despensa." },
          };
        }),
      rememberScan: (report) => set({ lastScan: report }),
      openList: (list) => set({ current: { ...list, updatedAt: nowIso() }, view: "lista" }),
      patchLine: (id, patch) =>
        set((state) => {
          if (!state.current) return state;
          return {
            current: {
              ...state.current,
              updatedAt: nowIso(),
              lines: state.current.lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
            },
          };
        }),
      addLine: (line) =>
        set((state) => {
          const current = state.current ?? blankList("manual");
          const next: ListLine = { inCart: false, ...line, id: crypto.randomUUID() };
          return {
            current: { ...current, updatedAt: nowIso(), lines: [...current.lines, next] },
            view: "lista",
          };
        }),
      removeLine: (id) =>
        set((state) => {
          if (!state.current) return state;
          return {
            current: {
              ...state.current,
              updatedAt: nowIso(),
              lines: state.current.lines.filter((line) => line.id !== id),
            },
          };
        }),
      sendToShopList: (item) => {
        // "Se acabó": One tap sends to shopping list
        const state = get();
        const current = state.current ?? blankList("manual");
        // check if already in list
        const existing = current.lines.find((l) => l.pantryItemId === item.id);
        if (existing) {
          state.patchLine(existing.id, { qty: existing.qty + 1 });
          state.toast(`Se sumó otra unidad de «${item.name}» a la lista.`);
        } else {
          const newLine = lineFromItem(item);
          state.addLine(newLine);
          state.toast(`«${item.name}» enviado a la lista de compra.`);
        }
      },
      setSpendingBudget: (budget) => {
        set((state) => {
          if (!state.current) return state;
          return {
            current: {
              ...state.current,
              spendingBudget: budget,
              updatedAt: nowIso(),
            },
          };
        });
      },
      applyTicketPrices: (ticketItems) => {
        const state = get();
        if (!state.current || ticketItems.length === 0) return 0;

        let matchedCount = 0;
        const now = nowIso();
        const updatedLines = [...state.current.lines];
        const updatedItems = [...state.items];

        for (const tItem of ticketItems) {
          const tClean = tItem.name.toLowerCase().trim();
          // Find matching line in current list
          const lineIndex = updatedLines.findIndex((l) => {
            const lineName = l.name.toLowerCase();
            return lineName.includes(tClean) || tClean.includes(lineName);
          });

          if (lineIndex >= 0) {
            matchedCount++;
            const line = updatedLines[lineIndex];
            const newUnitPrice = tItem.price > 0 ? tItem.price : line.unitPrice;
            updatedLines[lineIndex] = {
              ...line,
              unitPrice: newUnitPrice,
              inCart: true,
            };

            // Also update pantry item's lastPrice so the NEXT list starts with this paid price!
            if (line.pantryItemId) {
              const pIdx = updatedItems.findIndex((it) => it.id === line.pantryItemId);
              if (pIdx >= 0) {
                updatedItems[pIdx] = {
                  ...updatedItems[pIdx],
                  lastPrice: newUnitPrice,
                  lastPriceDate: now,
                };
              }
            }
          }
        }

        set({
          current: {
            ...state.current,
            lines: updatedLines,
            updatedAt: now,
          },
          items: updatedItems,
        });

        return matchedCount;
      },
      saveSnapshot: () => {
        const current = get().current;
        if (!current || current.lines.length === 0) {
          set({ notice: { id: Date.now(), text: "La lista está vacía." } });
          return;
        }
        const copy: ShopList = {
          ...current,
          id: crypto.randomUUID(),
          title: savedTitle(current.title, get().saved.map((row) => row.title)),
          status: "saved",
          updatedAt: nowIso(),
          lines: current.lines.map((line) => ({ ...line })),
        };
        set((state) => ({
          saved: [copy, ...state.saved].slice(0, 40),
          notice: { id: Date.now(), text: `Guardada como «${copy.title}».` },
        }));
      },
      renameCurrent: (title) =>
        set((state) => ({
          current: state.current
            ? { ...state.current, title: title.trim() || "Lista de compra", updatedAt: nowIso() }
            : state.current,
        })),
      finishList: () => {
        const current = get().current;
        if (!current || current.lines.length === 0) {
          set({ notice: { id: Date.now(), text: "No hay una compra por cerrar." } });
          return;
        }
        const state = get();
        const taken = state.saved.filter((row) => row.id !== current.id).map((row) => row.title);
        const done: ShopList = {
          ...current,
          title: savedTitle(current.title, taken),
          status: "finished",
          finishedAt: nowIso(),
          updatedAt: nowIso(),
          lines: current.lines.map((line) => ({ ...line })),
        };

        // When finishing a list, save the real prices paid into items (Lo que has pagado)
        const updatedItems = [...state.items];
        for (const line of current.lines) {
          if (line.pantryItemId && line.unitPrice > 0) {
            const idx = updatedItems.findIndex((it) => it.id === line.pantryItemId);
            if (idx >= 0) {
              updatedItems[idx] = {
                ...updatedItems[idx],
                lastPrice: line.unitPrice,
                lastPriceDate: nowIso(),
              };
            }
          }
        }

        set({
          current: null,
          items: updatedItems,
          saved: [done, ...state.saved.filter((row) => row.id !== done.id)].slice(0, 40),
          view: "guardadas",
          notice: { id: Date.now(), text: "Compra finalizada. Precios pagados guardados." },
        });
      },
      startNew: (source = "manual") =>
        set({
          current: blankList(source),
          view: "lista",
          notice: { id: Date.now(), text: "Nueva lista lista." },
        }),
      reuseSaved: (id) => {
        const found = get().saved.find((row) => row.id === id);
        if (!found) return;
        const createdAt = nowIso();
        set({
          current: {
            ...found,
            id: crypto.randomUUID(),
            status: "active",
            source: found.source,
            createdAt,
            updatedAt: createdAt,
            finishedAt: null,
            title: found.title,
            lines: found.lines.map((line) => ({ ...line, id: crypto.randomUUID(), inCart: false })),
          },
          view: "lista",
        });
      },
      deleteSaved: (id) => set((state) => ({ saved: state.saved.filter((row) => row.id !== id) })),
      toast: (text) => set({ notice: { id: Date.now(), text } }),
      clearNotice: () => set({ notice: null }),
      wipe: () =>
        set({
          items: [],
          current: null,
          saved: [],
          lastScan: null,
          view: "hoy",
          notice: { id: Date.now(), text: "Se borraron despensa y listas de este teléfono." },
        }),
      checkExpiredItems: () => {
        const state = get();
        const todayStr = new Date().toISOString().slice(0, 10);
        const expired = state.items.filter((item) => item.expiresAt && item.expiresAt <= todayStr);
        if (expired.length === 0) return;

        let addedCount = 0;
        for (const exp of expired) {
          const current = get().current ?? blankList("manual");
          const exists = current.lines.some((l) => l.pantryItemId === exp.id);
          if (!exists) {
            get().addLine(lineFromItem(exp));
            addedCount++;
          }
        }
        if (addedCount > 0) {
          get().toast(`${addedCount} producto(s) vencido(s) pasaron a la lista de compra.`);
        }
      },
    }),
    {
      name: "mialacena",
      version: 2,
      partialize: (state) => ({
        theme: state.theme,
        view: state.view,
        items: state.items,
        current: state.current,
        saved: state.saved,
        lastScan: state.lastScan,
        oneHandedMode: state.oneHandedMode,
      }),
    },
  ),
);
