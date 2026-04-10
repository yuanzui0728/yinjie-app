import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@yinjie/ui";
import type { DesktopChatSidePanelMode } from "./desktop-chat-header-actions";

type DesktopChatSidePanelProps = {
  mode: Exclude<DesktopChatSidePanelMode, null>;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
};

export function DesktopChatSidePanel({
  mode,
  title,
  subtitle,
  onClose,
  children,
  className,
}: DesktopChatSidePanelProps) {
  return (
    <aside
      className={cn(
        "absolute bottom-0 right-0 top-[65px] z-20 hidden w-[320px] border-l border-black/6 bg-[#f7f7f7] xl:flex xl:flex-col",
        className,
      )}
      data-mode={mode}
    >
      <div className="flex items-center justify-between border-b border-black/6 px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-[15px] font-medium text-[color:var(--text-primary)]">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-0.5 truncate text-[12px] text-[color:var(--text-muted)]">
              {subtitle}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-[color:var(--text-secondary)] transition hover:bg-[#ededed] hover:text-[color:var(--text-primary)]"
          aria-label="关闭侧栏"
        >
          <X size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
    </aside>
  );
}

export function DesktopChatSidePanelPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="text-[15px] font-medium text-[color:var(--text-primary)]">
        {title}
      </div>
      <div className="mt-2 text-sm leading-6 text-[color:var(--text-muted)]">
        {description}
      </div>
    </div>
  );
}
