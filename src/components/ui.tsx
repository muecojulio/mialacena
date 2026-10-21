import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="31" cy="16" r="7" className="fill-clay" />
      <rect x="6" y="28" width="36" height="2.5" rx="1.25" fill="currentColor" />
      <rect x="10" y="33" width="28" height="2" rx="1" className="fill-sage" />
    </svg>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "quiet" | "ghost" | "sage";
};

export function Button({ variant = "primary", className, type = "button", ...props }: ButtonProps) {
  const look = {
    primary: "bg-clay text-clay-ink",
    quiet: "bg-soft text-ink",
    ghost: "border border-line bg-card text-ink",
    sage: "bg-sage text-sage-ink",
  }[variant];
  return (
    <button
      type={type}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-medium",
        "transition-[scale,background-color,opacity] duration-150 ease-out",
        "active:not-disabled:scale-[0.96] disabled:opacity-50",
        look,
        className,
      )}
      {...props}
    />
  );
}

export function TextField({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-stone">{label}</span>
      <input
        className={cn(
          "h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-ink",
          className,
        )}
        {...props}
      />
    </label>
  );
}

export function SelectField({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-stone">{label}</span>
      <select
        className="h-12 w-full rounded-2xl border border-line bg-card px-4 text-base text-ink"
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Switch({
  checked,
  label,
  onClick,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "relative h-8 w-14 shrink-0 rounded-full border border-line transition-colors duration-200",
        checked ? "bg-clay" : "bg-soft",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 size-6 rounded-full bg-card transition-transform duration-200 ease-out",
          checked && "translate-x-6",
        )}
      />
    </button>
  );
}
