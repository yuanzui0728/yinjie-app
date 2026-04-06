import type { SelectHTMLAttributes } from "react";
import { cn } from "../cn";

export type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement>;

export function SelectField({ className, ...props }: SelectFieldProps) {
  return (
    <select
      className={cn(
        "w-full rounded-[var(--radius-lg)] border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(15,23,42,0.6),rgba(15,23,42,0.5))] px-4 py-3.5 text-sm text-[color:var(--text-primary)] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[border-color,background-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-standard)] focus:border-[color:var(--border-brand)] focus:bg-[linear-gradient(180deg,rgba(18,28,48,0.78),rgba(15,23,42,0.64))] focus:shadow-[var(--shadow-focus)]",
        className,
      )}
      {...props}
    />
  );
}
