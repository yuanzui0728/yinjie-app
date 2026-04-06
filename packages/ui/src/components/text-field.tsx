import type { InputHTMLAttributes } from "react";
import { cn } from "../cn";

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement>;

export function TextField({ className, ...props }: TextFieldProps) {
  return (
    <input
      className={cn(
        "w-full rounded-[var(--radius-lg)] border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(15,23,42,0.56),rgba(15,23,42,0.48))] px-4 py-3.5 text-sm text-[color:var(--text-primary)] outline-none shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-[border-color,background-color,box-shadow,transform,filter] duration-[var(--motion-fast)] ease-[var(--ease-standard)] placeholder:text-[color:var(--text-dim)] hover:border-[rgba(255,255,255,0.08)] hover:bg-[linear-gradient(180deg,rgba(16,24,44,0.62),rgba(16,24,44,0.52))] focus:border-[color:var(--border-brand)] focus:bg-[linear-gradient(180deg,rgba(18,28,48,0.78),rgba(15,23,42,0.64))] focus:shadow-[var(--shadow-focus)]",
        className,
      )}
      {...props}
    />
  );
}
