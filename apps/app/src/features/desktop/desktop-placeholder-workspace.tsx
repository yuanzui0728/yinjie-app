import { Button } from "@yinjie/ui";
import { AppPage } from "@yinjie/ui";
import { DesktopEntryShell } from "./desktop-entry-shell";
import { useDesktopLayout } from "../shell/use-desktop-layout";

type DesktopPlaceholderWorkspaceProps = {
  badge: string;
  title: string;
  description: string;
  spotlightTitle: string;
  spotlightBody: string;
  highlights: Array<{ label: string; value: string }>;
  ctaLabel?: string;
  onCtaClick?: () => void;
  mobileFallbackTo?: string;
};

export function DesktopPlaceholderWorkspace({
  badge,
  ctaLabel,
  description,
  highlights,
  mobileFallbackTo = "/tabs/chat",
  onCtaClick,
  spotlightBody,
  spotlightTitle,
  title,
}: DesktopPlaceholderWorkspaceProps) {
  const isDesktopLayout = useDesktopLayout();

  if (!isDesktopLayout) {
    return (
      <AppPage className="flex h-full items-center justify-center bg-[linear-gradient(180deg,#f8fcf8,#f2f8f5)]">
        <div className="w-full max-w-md rounded-[28px] border border-[color:var(--border-faint)] bg-white/92 p-8 shadow-[var(--shadow-section)]">
          <div className="text-xl font-semibold text-[color:var(--text-primary)]">
            该入口当前仅提供桌面布局
          </div>
          <div className="mt-3 text-sm leading-7 text-[color:var(--text-secondary)]">
            这项能力优先对齐微信电脑版工作区，移动端暂时不单独开放。
          </div>
          <a
            href={mobileFallbackTo}
            className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-[var(--brand-gradient)] px-4 text-sm font-medium text-[color:var(--text-on-brand)]"
          >
            返回继续使用
          </a>
        </div>
      </AppPage>
    );
  }

  return (
    <DesktopEntryShell
      badge={badge}
      title={title}
      description={description}
      aside={
        <div className="relative space-y-4">
          <div className="rounded-[26px] border border-white/70 bg-white/84 p-5 shadow-[var(--shadow-soft)]">
            <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-dim)]">
              当前重点
            </div>
            <div className="mt-3 text-xl font-semibold text-[color:var(--text-primary)]">
              {spotlightTitle}
            </div>
            <div className="mt-3 text-sm leading-7 text-[color:var(--text-secondary)]">
              {spotlightBody}
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-[28px] border border-[color:var(--border-faint)] bg-white/92 p-6 shadow-[var(--shadow-soft)]">
          <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--brand-secondary)]">
            工作区规划
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {highlights.map((item) => (
              <div
                key={item.label}
                className="rounded-[22px] border border-[color:var(--border-faint)] bg-[rgba(255,248,239,0.7)] p-4"
              >
                <div className="text-xs text-[color:var(--text-muted)]">
                  {item.label}
                </div>
                <div className="mt-2 text-sm leading-6 text-[color:var(--text-primary)]">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
          {ctaLabel && onCtaClick ? (
            <Button
              variant="primary"
              size="lg"
              onClick={onCtaClick}
              className="mt-5 rounded-2xl"
            >
              {ctaLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </DesktopEntryShell>
  );
}
