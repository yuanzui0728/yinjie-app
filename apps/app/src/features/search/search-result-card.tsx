import { AvatarChip } from "../../components/avatar-chip";
import { renderHighlightedText } from "./search-utils";
import { type SearchResultItem } from "./search-types";

type SearchResultCardProps = {
  item: SearchResultItem;
  keyword: string;
  layout: "mobile" | "desktop";
  onOpen: (item: SearchResultItem) => void;
};

export function SearchResultCard({
  item,
  keyword,
  layout,
  onOpen,
}: SearchResultCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={
        layout === "mobile"
          ? "flex w-full items-start gap-3 rounded-[18px] bg-white/88 px-4 py-3 text-left transition hover:bg-white"
          : "flex w-full items-start gap-3 rounded-[20px] border border-[color:var(--border-faint)] bg-[rgba(255,252,247,0.84)] px-4 py-4 text-left transition hover:border-[rgba(60,60,60,0.10)] hover:bg-white"
      }
    >
      <AvatarChip
        name={item.avatarName ?? item.title}
        src={item.avatarSrc}
        size="wechat"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-medium text-[color:var(--text-primary)]">
            {renderHighlightedText(item.title, keyword)}
          </div>
          <span className="rounded-full bg-[rgba(255,138,61,0.10)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--brand-primary)]">
            {item.badge}
          </span>
        </div>
        <div className="mt-1 text-xs text-[color:var(--text-muted)]">
          {renderHighlightedText(item.meta, keyword)}
        </div>
        <div className="mt-2 line-clamp-2 text-sm leading-6 text-[color:var(--text-secondary)]">
          {renderHighlightedText(item.description, keyword)}
        </div>
      </div>
    </button>
  );
}
