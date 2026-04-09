import type { HTMLAttributes } from "react";
import { cn } from "../cn";

export function AppSection({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,251,244,0.94))] p-5 shadow-[var(--shadow-section)]",
        className,
      )}
      {...props}
    />
  );
}
