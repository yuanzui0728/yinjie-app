import type { ReactNode } from "react";
import { AvatarChip } from "./avatar-chip";

type SocialPostCardProps = {
  authorName: string;
  authorAvatar?: string | null;
  meta?: ReactNode;
  body: ReactNode;
  summary?: ReactNode;
  actions?: ReactNode;
  secondary?: ReactNode;
  composer?: ReactNode;
};

export function SocialPostCard({
  authorName,
  authorAvatar,
  meta,
  body,
  summary,
  actions,
  secondary,
  composer,
}: SocialPostCardProps) {
  return (
    <article className="overflow-hidden rounded-[30px] border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,254,250,0.98),rgba(255,249,240,0.96))] p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-3">
        <AvatarChip name={authorName} src={authorAvatar} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-[color:var(--text-primary)]">{authorName}</div>
          {meta ? <div className="mt-1 text-xs text-[color:var(--text-muted)]">{meta}</div> : null}
        </div>
      </div>
      <div className="mt-5 rounded-[24px] bg-[linear-gradient(180deg,rgba(255,252,245,0.96),rgba(255,255,255,0.88))] px-4 py-4 text-sm leading-7 text-[color:var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
        {body}
      </div>
      {summary ? <div className="mt-4 text-xs leading-6 text-[color:var(--text-muted)]">{summary}</div> : null}
      {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
      {secondary ? <div className="mt-4">{secondary}</div> : null}
      {composer ? <div className="mt-4 flex items-center gap-2 rounded-[24px] bg-[rgba(255,255,255,0.78)] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">{composer}</div> : null}
    </article>
  );
}
