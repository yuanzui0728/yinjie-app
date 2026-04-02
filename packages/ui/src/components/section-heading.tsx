import type { HTMLAttributes } from "react";
import { cn } from "../cn";

export function SectionHeading({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--text-secondary)]",
        className,
      )}
      {...props}
    />
  );
}
