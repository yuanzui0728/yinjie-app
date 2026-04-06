import type { HTMLAttributes } from "react";
import { cn } from "../cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(17,24,39,0.86),rgba(13,22,35,0.76))] p-5 shadow-[var(--shadow-card)] backdrop-blur-xl",
        className,
      )}
      {...props}
    />
  );
}
