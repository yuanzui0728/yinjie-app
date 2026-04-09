import type { PropsWithChildren } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Compass, MessageCircleMore, UserRound, UsersRound } from "lucide-react";
import { cn } from "@yinjie/ui";

const tabs = [
  { to: "/tabs/chat", label: "消息", icon: MessageCircleMore },
  { to: "/tabs/contacts", label: "通讯录", icon: UsersRound },
  { to: "/tabs/discover", label: "发现", icon: Compass },
  { to: "/tabs/profile", label: "我", icon: UserRound },
];

export function MobileShell({ children }: PropsWithChildren) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const showTabs = pathname.startsWith("/tabs/");

  return (
    <div className="relative h-dvh min-h-dvh overflow-hidden bg-[color:var(--bg-canvas)] text-[color:var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-14 top-0 h-48 w-48 rounded-full bg-[rgba(255,179,71,0.18)] blur-3xl" />
        <div className="absolute -right-10 top-28 h-40 w-40 rounded-full bg-[rgba(96,165,250,0.16)] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-[rgba(74,222,128,0.12)] blur-3xl" />
      </div>
      <div
        className="relative mx-auto flex h-full min-h-0 w-full max-w-[460px] flex-col px-3 sm:px-4"
        style={{
          paddingTop: "max(1rem, var(--safe-area-inset-top))",
          paddingRight: "calc(0.75rem + var(--safe-area-inset-right))",
          paddingBottom: "max(1rem, var(--safe-area-inset-bottom))",
          paddingLeft: "calc(0.75rem + var(--safe-area-inset-left))",
        }}
      >
        <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[40px] border border-white/70 bg-[color:var(--surface-shell)] shadow-[var(--shadow-shell)] backdrop-blur-[22px]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0))]" />
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
          {showTabs ? (
            <nav
              className="shrink-0 grid grid-cols-4 border-t border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,249,241,0.94))] px-2 pt-2 backdrop-blur-xl"
              style={{ paddingBottom: "max(0.5rem, var(--safe-area-inset-bottom))" }}
            >
              {tabs.map(({ to, label, icon: Icon }) => {
                const active = pathname === to;
                return (
                  <Link
                    key={to}
                    to={to}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-[22px] px-2 py-2.5 text-[11px] transition-[color,background-color,transform,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-standard)]",
                      active
                        ? "bg-white/85 text-[color:var(--brand-primary)] shadow-[var(--shadow-soft)]"
                        : "text-[color:var(--text-muted)] hover:bg-white/60 hover:text-[color:var(--text-secondary)]",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-[16px] transition-[background-color,color] duration-[var(--motion-fast)] ease-[var(--ease-standard)]",
                        active ? "bg-[rgba(255,138,61,0.12)]" : "bg-transparent",
                      )}
                    >
                      <Icon size={17} />
                    </div>
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  );
}
