import type { HTMLAttributes } from "react";
import { cn } from "../cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-primary)] p-5 shadow-[var(--shadow-card)] backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}
