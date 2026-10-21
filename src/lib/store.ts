import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SEED } from "@/lib/seed";
import type { ListLine, PantryItem, ScanReport, ShopList, ViewId } from "@/lib/types";

type Notice = { id: number; text: string } | null;

type PantryState = {
  theme: "light" | "dark";
  view: ViewId;
  items: PantryItem[];
  current: ShopList | null;
  saved: ShopList[];
  lastScan: ScanReport | null;
  notice: Notice;
  setTheme: (theme: "light" | "dark") => void;
  setView: (view: ViewId) => void;
  upsertItem: (item: PantryItem) => void;
  removeItem: (id: string) => void;
  rememberScan: (report: ScanReport) => void;
  openList: (list: ShopList) => void;
  patchLine: (id: string, patch: Partial<ListLine>) => void;
  addLine: (line: Omit<ListLine, "id" | "inCart"> & { inCart?: boolean }) => void;
  removeLine: (id: string) => void;
  saveSnapshot: () => void;
  finishList: () => void;
  startNew: (source?: ShopList["source"]) => void;
  reuseSaved: (id: string) => void;
  deleteSaved: (id: string) => void;
  toast: (text: string) => void;
  clearNotice: () => void;
  wipe: () => void;
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
    lines: [],
  };
}

export function lineFromItem(item: PantryItem, qty = item.targetQty): ListLine {
  return {
    id: crypto.randomUUID(),
    pantryItemId: item.id,
    name: item.name,
    brand: item.brand,
    unit: item.unit,
    qty,
    unitPrice: item.usualPrice,
    inCart: false,
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
      setTheme: (theme) => set({ theme }),
      setView: (view) => set({ view }),
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
      saveSnapshot: () => {
        const current = get().current;
        if (!current || current.lines.length === 0) {
          set({ notice: { id: Date.now(), text: "La lista está vacía." } });
          return;
        }
        const copy: ShopList = {
          ...current,
          id: crypto.randomUUID(),
          status: "saved",
          updatedAt: nowIso(),
          lines: current.lines.map((line) => ({ ...line })),
        };
        set((state) => ({
          saved: [copy, ...state.saved].slice(0, 40),
          notice: { id: Date.now(), text: "Lista guardada en este teléfono." },
        }));
      },
      finishList: () => {
        const current = get().current;
        if (!current || current.lines.length === 0) {
          set({ notice: { id: Date.now(), text: "No hay una compra por cerrar." } });
          return;
        }
        const done: ShopList = {
          ...current,
          status: "finished",
          finishedAt: nowIso(),
          updatedAt: nowIso(),
          lines: current.lines.map((line) => ({ ...line })),
        };
        set((state) => ({
          current: null,
          saved: [done, ...state.saved.filter((row) => row.id !== done.id)].slice(0, 40),
          view: "guardadas",
          notice: { id: Date.now(), text: "Compra finalizada. Puedes empezar otra cuando quieras." },
        }));
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
    }),
    {
      name: "mialacena",
      version: 1,
      partialize: (state) => ({
        theme: state.theme,
        view: state.view,
        items: state.items,
        current: state.current,
        saved: state.saved,
        lastScan: state.lastScan,
      }),
    },
  ),
);
