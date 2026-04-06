import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

type AppHeaderProps = HTMLAttributes<HTMLElement> & {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function AppHeader({ className, eyebrow, title, description, actions, ...props }: AppHeaderProps) {
  return (
    <header
      className={cn(
        "relative flex flex-col gap-5 overflow-hidden rounded-[var(--radius-xl)] border border-[color:var(--border-faint)] bg-[linear-gradient(135deg,rgba(249,115,22,0.18),rgba(255,255,255,0.055)_42%,rgba(15,23,42,0.28)_100%)] p-6 shadow-[var(--shadow-section)] before:pointer-events-none before:absolute before:-left-10 before:top-0 before:h-28 before:w-40 before:rounded-full before:bg-[radial-gradient(circle,rgba(255,255,255,0.12),transparent_72%)] before:blur-2xl before:content-[''] sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
      {...props}
    >
      <div className="relative min-w-0">
        {eyebrow ? (
          <div className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--brand-secondary)]">{eyebrow}</div>
        ) : null}
        <h1 className="mt-3 text-[1.9rem] font-semibold leading-tight text-white">{title}</h1>
        {description ? <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200/88">{description}</p> : null}
      </div>
      {actions ? <div className="relative shrink-0 self-start">{actions}</div> : null}
    </header>
  );
}
