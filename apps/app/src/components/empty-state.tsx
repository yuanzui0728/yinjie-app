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
    <AppSection className="px-5 py-9 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(255,179,71,0.18),rgba(74,222,128,0.14))] text-[13px] font-semibold uppercase tracking-[0.22em] text-[color:var(--brand-primary)]">
        YJ
      </div>
      <div className="mt-5 text-lg font-medium text-[color:var(--text-primary)]">{title}</div>
      <p className="mt-3 text-sm leading-7 text-[color:var(--text-secondary)]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </AppSection>
  );
}
