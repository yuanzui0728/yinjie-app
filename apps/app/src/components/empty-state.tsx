import type { ReactNode } from "react";
import { AppSection } from "@yinjie/ui";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <AppSection className="rounded-[20px] border-black/6 bg-white px-6 py-10 text-center shadow-[0_14px_36px_rgba(15,23,42,0.05)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-black/6 bg-[#f6f6f6] text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--text-secondary)]">
        空
      </div>
      <div className="mt-5 text-lg font-medium text-[color:var(--text-primary)]">
        {title}
      </div>
      <p className="mx-auto mt-3 max-w-[28rem] text-sm leading-7 text-[color:var(--text-secondary)]">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </AppSection>
  );
}
