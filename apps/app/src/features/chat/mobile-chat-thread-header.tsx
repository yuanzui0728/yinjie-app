import { ArrowLeft, Ellipsis, type LucideIcon } from "lucide-react";
type MobileChatThreadHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onMore: () => void;
  moreLabel?: string;
  actions?: Array<{
    key: string;
    icon: LucideIcon;
    label: string;
    onClick: () => void;
  }>;
};

export function MobileChatThreadHeader({
  title,
  subtitle,
  onBack,
  onMore,
  moreLabel = "更多操作",
  actions = [],
}: MobileChatThreadHeaderProps) {
  const titleLeftInset = 46;
  const titleRightInset = 46 + actions.length * 46;

  return (
    <header className="border-b border-black/5 bg-[#f7f7f7] px-1.5 py-2">
      <div className="relative flex min-h-11 items-center gap-1.5">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-[#111827] transition active:bg-black/6"
            aria-label="返回"
          >
            <ArrowLeft size={20} />
          </button>
        ) : (
          <div className="h-10 w-10 shrink-0" aria-hidden="true" />
        )}

        <div
          className="pointer-events-none absolute text-center"
          style={{
            left: `${titleLeftInset}px`,
            right: `${titleRightInset}px`,
          }}
        >
          <div className="truncate text-[17px] font-medium text-[#111827]">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-0.5 truncate text-[11px] text-[#8c8c8c]">
              {subtitle}
            </div>
          ) : null}
        </div>

        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.key}
              type="button"
              onClick={action.onClick}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-[#111827] transition active:bg-black/6"
              aria-label={action.label}
              title={action.label}
            >
              <Icon size={19} />
            </button>
          );
        })}

        <button
          type="button"
          onClick={onMore}
          className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-[#111827] transition active:bg-black/6"
          aria-label={moreLabel}
        >
          <Ellipsis size={20} />
        </button>
      </div>
    </header>
  );
}
