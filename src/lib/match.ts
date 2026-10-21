import type { PantryItem, ScanHit } from "@/lib/types";

export type Gap = {
  item: PantryItem;
  status: "missing" | "low" | "ok";
  seenQty: number | null;
  missingQty: number;
};

function norm(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string): string[] {
  return norm(value)
    .split(" ")
    .filter((token) => token.length >= 2);
}

function nameScore(a: string, b: string): number {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.length || !right.length) return 0;
  if (left.join(" ") === right.join(" ")) return 1;
  const sa = new Set(left);
  const sb = new Set(right);
  let inter = 0;
  for (const token of sa) if (sb.has(token)) inter += 1;
  if (inter === 0) return 0;
  const smaller = Math.min(sa.size, sb.size);
  if (inter === smaller) return 0.86;
  const union = sa.size + sb.size - inter;
  return (inter / union) * 0.75;
}

function brandAdjust(itemBrand: string, hitBrand: string, base: number): number {
  const a = norm(itemBrand);
  const b = norm(hitBrand);
  if (!a || !b || base <= 0) return base;
  if (a === b || a.includes(b) || b.includes(a)) return Math.min(1, base + 0.08);
  return Math.max(0, base - 0.12);
}

function sameUnit(a: string, b: string): boolean {
  const left = norm(a);
  const right = norm(b);
  if (!left || !right) return false;
  return left === right || left.startsWith(right) || right.startsWith(left);
}

export function diffPantry(items: PantryItem[], hits: ScanHit[]): Gap[] {
  const used = new Set<number>();
  return items.map((item) => {
    let best = -1;
    let bestScore = 0;
    hits.forEach((hit, index) => {
      if (used.has(index)) return;
      const score = brandAdjust(item.brand, hit.brand, nameScore(item.name, hit.name));
      if (score > bestScore) {
        bestScore = score;
        best = index;
      }
    });
    if (best < 0 || bestScore < 0.72) {
      return { item, status: "missing", seenQty: null, missingQty: item.targetQty };
    }
    used.add(best);
    const hit = hits[best]!;
    const seen = hit.quantity;
    if (seen != null && seen > 0 && sameUnit(item.unit, hit.unit) && seen < item.targetQty) {
      return {
        item,
        status: "low",
        seenQty: seen,
        missingQty: Math.round((item.targetQty - seen) * 100) / 100,
      };
    }
    return { item, status: "ok", seenQty: seen, missingQty: 0 };
  });
}

export function surprises(items: PantryItem[], hits: ScanHit[]): ScanHit[] {
  return hits.filter((hit) => {
    const score = Math.max(0, ...items.map((item) => nameScore(item.name, hit.name)));
    return score < 0.72 && tokens(hit.name).length > 0;
  });
}
