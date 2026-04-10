import type { ReactNode } from "react";
import { cn } from "@yinjie/ui";

type ChatDetailsSectionProps = {
  title?: string;
  children: ReactNode;
  className?: string;
  variant?: "default" | "wechat";
};

export function ChatDetailsSection({
  title,
  children,
  className,
  variant = "default",
}: ChatDetailsSectionProps) {
  const isWechat = variant === "wechat";

  return (
    <section className={cn("px-3", className)}>
      {title ? (
        <div
          className={cn(
            "px-1 pb-2 text-[11px] uppercase tracking-[0.14em] text-[color:var(--text-dim)]",
            isWechat && "text-[13px] font-normal normal-case tracking-normal text-[#8c8c8c]",
          )}
        >
          {title}
        </div>
      ) : null}
      <div
        className={cn(
          "overflow-hidden rounded-[16px] border border-black/5 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
          isWechat && "rounded-[12px] border-black/4 shadow-none",
        )}
      >
        {children}
      </div>
    </section>
  );
}
