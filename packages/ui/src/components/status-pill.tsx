import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "../cn";

const statusPill = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-[0.12em]",
  {
    variants: {
      tone: {
        healthy: "border-emerald-300/30 bg-emerald-500/10 text-emerald-200",
        warning: "border-amber-300/30 bg-amber-500/10 text-amber-100",
        muted: "border-white/10 bg-white/5 text-[color:var(--text-secondary)]",
      },
    },
    defaultVariants: {
      tone: "muted",
    },
  },
);

export type StatusPillProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof statusPill>;

export function StatusPill({ className, tone, ...props }: StatusPillProps) {
  return <span className={cn(statusPill({ tone }), className)} {...props} />;
}
