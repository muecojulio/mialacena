import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { categoryStyle } from "@/lib/colors";

/** Chip de categoría con su color de anaquel. */
export function CategoryChip({
  category,
  className,
  children,
}: {
  category: string;
  className?: string;
  children?: ReactNode;
}) {
  const style = categoryStyle(category);
  return (
    <span className={cn("cat-chip", style.bg, style.text, className)}>
      <span className={cn("size-1.5 rounded-full", style.dot)} aria-hidden="true" />
      {children ?? category}
    </span>
  );
}
