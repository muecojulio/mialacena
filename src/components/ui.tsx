import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** La marca: sol de mercado sobre estantes llenos. */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="22" className="fill-sun" opacity="0.35" />
      <circle cx="31" cy="14" r="8" className="fill-clay" />
      <circle cx="31" cy="14" r="4" className="fill-sun" />
      <rect x="5" y="26" width="38" height="3.5" rx="1.75" fill="currentColor" />
      <rect x="8" y="32" width="32" height="3" rx="1.5" className="fill-sage" />
      <rect x="12" y="37.5" width="24" height="2.5" rx="1.25" className="fill-sky" />
      <circle cx="12" cy="22" r="3.2" className="fill-berry" />
      <circle cx="19" cy="23.4" r="2.4" className="fill-lime" />
    </svg>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "quiet" | "ghost" | "sage" | "sun" | "sky";
};

export function Button({ variant = "primary", className, type = "button", ...props }: ButtonProps) {
  const look = {
    primary: "bg-clay text-clay-ink",
    quiet: "bg-soft text-ink",
    ghost: "border border-line bg-card text-ink",
    sage: "bg-sage text-sage-ink",
    sun: "bg-sun text-sun-ink",
    sky: "bg-sky text-sky-ink",
  }[variant];
  return (
    <button
      type={type}
      className={cn(
        "btn-chunky inline-flex h-12 items-center justify-center gap-2 px-4 text-sm font-semibold",
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
      <span className="mb-1.5 block text-xs font-semibold text-stone">{label}</span>
      <input
        className={cn(
          "h-12 w-full rounded-2xl border-[1.5px] border-line bg-card px-4 text-base text-ink",
          "transition-colors duration-150 focus:border-clay focus:bg-card",
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
      <span className="mb-1.5 block text-xs font-semibold text-stone">{label}</span>
      <select
        className="h-12 w-full rounded-2xl border-[1.5px] border-line bg-card px-4 text-base text-ink transition-colors duration-150 focus:border-clay"
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
        "relative h-8 w-14 shrink-0 rounded-full border-[1.5px] border-line transition-colors duration-200",
        checked
          ? "bg-linear-to-r from-grape to-sky"
          : "bg-soft",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 size-6 rounded-full bg-card shadow-sm transition-transform duration-200 ease-out",
          checked && "translate-x-6",
        )}
      />
    </button>
  );
}
