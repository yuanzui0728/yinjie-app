import type { PropsWithChildren } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { BellDot, Compass, MessageCircleMore, UsersRound, UserRound } from "lucide-react";
import { cn } from "@yinjie/ui";

const tabs = [
  { to: "/tabs/chat", label: "消息", icon: MessageCircleMore },
  { to: "/tabs/moments", label: "朋友圈", icon: BellDot },
  { to: "/tabs/discover", label: "发现", icon: Compass },
  { to: "/tabs/contacts", label: "通讯录", icon: UsersRound },
  { to: "/tabs/profile", label: "我", icon: UserRound },
];

export function MobileShell({ children }: PropsWithChildren) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const showTabs = pathname.startsWith("/tabs/");

  return (
    <div className="min-h-screen overflow-hidden bg-transparent text-[color:var(--text-primary)]">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-45"
        style={{
          backgroundImage: "var(--bg-grid)",
          backgroundSize: "22px 22px",
          maskImage: "linear-gradient(180deg, rgba(0,0,0,0.45), transparent 85%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.16),transparent_68%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 h-56 bg-[radial-gradient(circle_at_bottom,rgba(56,189,248,0.08),transparent_64%)]"
      />

      <div
        className="relative mx-auto flex min-h-screen w-full max-w-[460px] flex-col px-3 sm:px-4"
        style={{
          paddingTop: "max(1rem, var(--safe-area-inset-top))",
          paddingRight: "calc(0.75rem + var(--safe-area-inset-right))",
          paddingBottom: "max(1rem, var(--safe-area-inset-bottom))",
          paddingLeft: "calc(0.75rem + var(--safe-area-inset-left))",
        }}
      >
        <div className="mb-3 flex items-center justify-between rounded-[30px] border border-[color:var(--border-faint)] bg-[linear-gradient(135deg,rgba(255,255,255,0.1),rgba(255,255,255,0.04))] px-5 py-4 shadow-[var(--shadow-soft)] backdrop-blur-xl">
          <div>
            <div className="text-[11px] uppercase tracking-[0.34em] text-[color:var(--text-muted)]">隐界</div>
            <div className="mt-1 text-xl font-semibold tracking-[0.18em] text-white">Hidden World</div>
          </div>
          <Link
            to="/friend-requests"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.11),rgba(255,255,255,0.05))] text-[color:var(--text-secondary)] shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:text-white hover:shadow-[var(--shadow-card)]"
          >
            <BellDot size={18} />
          </Link>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[38px] border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(10,14,24,0.94),rgba(13,22,35,0.86)_48%,rgba(8,12,22,0.94))] shadow-[var(--shadow-shell)] before:pointer-events-none before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent)] before:content-['']">
          <div className="min-h-0 flex-1 overflow-auto">{children}</div>
          {showTabs ? (
            <nav
              className="grid grid-cols-5 border-t border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(7,12,20,0.62),rgba(7,12,20,0.82))] px-2 pt-2 backdrop-blur-xl"
              style={{ paddingBottom: "max(0.5rem, var(--safe-area-inset-bottom))" }}
            >
              {tabs.map(({ to, label, icon: Icon }) => {
                const active = pathname === to;
                return (
                  <Link
                    key={to}
                    to={to}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-[20px] px-2 py-2 text-[11px] transition-[background-color,color,box-shadow,transform] duration-[var(--motion-fast)] ease-[var(--ease-standard)]",
                      active
                        ? "bg-[linear-gradient(135deg,rgba(249,115,22,0.18),rgba(255,255,255,0.08))] text-white shadow-[var(--shadow-soft)]"
                        : "text-[color:var(--text-muted)] hover:bg-[color:var(--surface-soft)] hover:text-white",
                    )}
                  >
                    <Icon size={17} />
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
