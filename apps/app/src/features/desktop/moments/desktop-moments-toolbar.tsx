import { Button, ErrorBlock, InlineNotice, TextField, cn } from "@yinjie/ui";
import { ArrowUp, PenSquare, RefreshCcw, Search } from "lucide-react";

export type DesktopMomentsFeedFilter = "all" | "owner" | "character";

type DesktopMomentsToolbarProps = {
  activeFilter: DesktopMomentsFeedFilter;
  commentErrorMessage?: string | null;
  errors?: string[];
  filteredCountLabel: string;
  likeErrorMessage?: string | null;
  searchText: string;
  successNotice?: string;
  onBackToTop: () => void;
  onFilterChange: (nextValue: DesktopMomentsFeedFilter) => void;
  onOpenCompose: () => void;
  onRefresh: () => void;
  onSearchChange: (value: string) => void;
};

const filterOptions: Array<{ key: DesktopMomentsFeedFilter; label: string }> = [
  { key: "all", label: "全部" },
  { key: "owner", label: "只看我" },
  { key: "character", label: "只看角色" },
];

export function DesktopMomentsToolbar({
  activeFilter,
  commentErrorMessage,
  errors = [],
  filteredCountLabel,
  likeErrorMessage,
  searchText,
  successNotice,
  onBackToTop,
  onFilterChange,
  onOpenCompose,
  onRefresh,
  onSearchChange,
}: DesktopMomentsToolbarProps) {
  const activeChipClassName =
    "border-[rgba(7,193,96,0.12)] bg-white text-[color:var(--text-primary)] shadow-[inset_0_-2px_0_0_var(--brand-primary)]";

  return (
    <div className="border-b border-[color:var(--border-faint)] bg-white/74 px-6 py-4 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-[720px]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-[color:var(--text-muted)]">
              朋友圈
            </div>
            <div className="mt-1 text-[18px] font-semibold text-[color:var(--text-primary)]">
              连续浏览，右侧承接上下文
            </div>
            <div className="mt-1 text-[12px] leading-6 text-[color:var(--text-muted)]">
              桌面态聚焦连续浏览、互动和进入好友独立朋友圈页。
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onRefresh}>
              <RefreshCcw size={14} />
              刷新
            </Button>
            <Button variant="secondary" size="sm" onClick={onBackToTop}>
              <ArrowUp size={14} />
              回到顶部
            </Button>
            <Button variant="primary" size="sm" onClick={onOpenCompose}>
              <PenSquare size={14} />
              发朋友圈
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => onFilterChange(option.key)}
              className={cn(
                "rounded-xl border px-4 py-2 text-[12px] font-medium transition-[border-color,background-color,color]",
                activeFilter === option.key
                  ? activeChipClassName
                  : "border-[color:var(--border-faint)] bg-white text-[color:var(--text-secondary)] hover:bg-[color:var(--surface-console)] hover:text-[color:var(--text-primary)]",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="relative block min-w-[240px] max-w-[420px] flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--text-dim)]"
            />
            <TextField
              value={searchText}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="搜索动态正文、作者或评论"
              className="rounded-xl border-[color:var(--border-faint)] bg-[color:var(--surface-console)] py-2.5 pl-11 text-[13px] shadow-none hover:bg-white focus:border-[color:var(--border-brand)] focus:bg-white focus:shadow-none"
            />
          </label>
          <div className="text-[12px] text-[color:var(--text-muted)]">
            {filteredCountLabel}
          </div>
        </div>

        {successNotice ? (
          <div className="mt-4">
            <InlineNotice
              tone="success"
              className="border-[color:var(--border-faint)] bg-white"
            >
              {successNotice}
            </InlineNotice>
          </div>
        ) : null}

        {errors.length > 0 ? (
          <div className="mt-4 space-y-3">
            {errors.map((message, index) => (
              <ErrorBlock key={`${message}-${index}`} message={message} />
            ))}
          </div>
        ) : null}

        {likeErrorMessage ? (
          <div className="mt-4">
            <ErrorBlock message={likeErrorMessage} />
          </div>
        ) : null}

        {commentErrorMessage ? (
          <div className="mt-4">
            <ErrorBlock message={commentErrorMessage} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
