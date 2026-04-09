import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@yinjie/ui";

type TabPageTopBarProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  leftActions?: ReactNode;
  rightActions?: ReactNode;
  titleAlign?: "left" | "center";
  titleClassName?: string;
};

export function TabPageTopBar({
  className,
  title,
  eyebrow,
  subtitle,
  leftActions,
  rightActions,
  titleAlign = "left",
  titleClassName,
  children,
  ...props
}: TabPageTopBarProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-20 -mx-4 -mt-6 mb-5 overflow-hidden border-b border-white/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,248,239,0.92))] px-4 py-3 backdrop-blur-xl sm:-mx-5 sm:px-5",
        className,
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[linear-gradient(180deg,rgba(255,255,255,0.56),rgba(255,255,255,0))]" />
      <div className="relative flex min-h-11 items-center justify-between gap-3">
        {leftActions ? <div className="shrink-0">{leftActions}</div> : titleAlign === "center" ? <div className="w-9 shrink-0" aria-hidden="true" /> : null}
        <div
          className={cn(
            "min-w-0",
            titleAlign === "center" ? "pointer-events-none absolute inset-x-12 text-center" : undefined,
          )}
        >
          {eyebrow ? <div className="truncate text-[11px] uppercase tracking-[0.26em] text-[color:var(--brand-secondary)]">{eyebrow}</div> : null}
          <h1
            className={cn(
              "truncate text-xl font-semibold tracking-[0.01em] text-current",
              eyebrow ? "mt-1" : undefined,
              titleClassName,
            )}
          >
            {title}
          </h1>
          {subtitle ? <div className="mt-1 truncate text-xs text-[color:var(--text-muted)]">{subtitle}</div> : null}
        </div>
        {rightActions ? (
          <div className={cn("shrink-0", titleAlign === "center" ? "ml-auto" : undefined)}>{rightActions}</div>
        ) : titleAlign === "center" ? <div className="w-9 shrink-0" aria-hidden="true" /> : null}
      </div>
      {children}
    </div>
  );
}
