import type { HTMLAttributes } from "react";
import { cn } from "../cn";

type ErrorBlockProps = HTMLAttributes<HTMLDivElement> & {
  message: string;
};

export function ErrorBlock({ className, message, ...props }: ErrorBlockProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[color:var(--border-danger)] bg-[linear-gradient(180deg,rgba(239,68,68,0.16),rgba(127,29,29,0.18))] px-5 py-4 text-sm leading-6 text-[color:var(--state-danger-text)] shadow-[var(--shadow-soft)]",
        className,
      )}
      {...props}
    >
      {message}
    </div>
  );
}
