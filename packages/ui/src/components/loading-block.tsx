import type { HTMLAttributes } from "react";
import { cn } from "../cn";

type LoadingBlockProps = HTMLAttributes<HTMLDivElement> & {
  label?: string;
};

export function LoadingBlock({ className, label = "加载中...", ...props }: LoadingBlockProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,248,239,0.92))] px-5 py-8 text-center text-sm text-[color:var(--text-secondary)] shadow-[var(--shadow-soft)]",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[rgba(255,138,61,0.4)] animate-pulse" />
          <span className="h-2.5 w-2.5 rounded-full bg-[rgba(255,179,71,0.75)] animate-pulse [animation-delay:120ms]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[rgba(74,222,128,0.45)] animate-pulse [animation-delay:240ms]" />
        </div>
        <div>{label}</div>
      </div>
    </div>
  );
}
