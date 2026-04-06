import type { HTMLAttributes } from "react";
import { cn } from "../cn";

export function AppSection({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-xl)] border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.065),rgba(255,255,255,0.04))] p-5 shadow-[var(--shadow-section)] backdrop-blur-xl before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)] before:content-[''] relative overflow-hidden",
        className,
      )}
      {...props}
    />
  );
}
