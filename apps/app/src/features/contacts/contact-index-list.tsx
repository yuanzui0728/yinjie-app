import { cn } from "@yinjie/ui";

export function ContactIndexList({
  items,
  activeKey,
  className,
  onSelect,
}: {
  items: Array<{ key: string; indexLabel: string }>;
  activeKey?: string | null;
  className?: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-full bg-[rgba(255,255,255,0.84)] px-1 py-2 text-[10px] shadow-[0_10px_30px_rgba(15,23,42,0.10)] backdrop-blur",
        className,
      )}
    >
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSelect(item.key)}
          aria-label={`跳转到 ${item.indexLabel}`}
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded-full text-[10px] leading-none transition-colors",
            activeKey === item.key ? "bg-[rgba(22,163,74,0.14)] font-semibold text-[#16a34a]" : "text-[color:var(--text-muted)] hover:text-[color:var(--text-primary)]",
          )}
        >
          {item.indexLabel}
        </button>
      ))}
    </div>
  );
}
