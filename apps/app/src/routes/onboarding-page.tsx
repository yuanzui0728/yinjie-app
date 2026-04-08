import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { completeOnboarding, initUser } from "@yinjie/contracts";
import { AppPage, AppSection, Button, InlineNotice, TextField } from "@yinjie/ui";
import { DesktopEntryShell } from "../features/desktop/desktop-entry-shell";
import { useDesktopLayout } from "../features/shell/use-desktop-layout";
import { useSessionStore } from "../store/session-store";

export function OnboardingPage() {
  const isDesktopLayout = useDesktopLayout();
  const navigate = useNavigate();
  const hydrateSession = useSessionStore((state) => state.hydrateSession);
  const markOnboardingComplete = useSessionStore((state) => state.completeOnboarding);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const canSubmit = name.trim();

  async function submit() {
    const username = name.trim();
    if (!username) {
      setError("请告诉我你的名字");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const session = await initUser({ username });
      hydrateSession(session);
      await completeOnboarding(session.userId);
      markOnboardingComplete();
      navigate({ to: "/tabs/chat", replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "进入失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  if (isDesktopLayout) {
    return (
      <DesktopEntryShell
        badge="引路"
        title="告诉我，你叫什么名字？"
        description="桌面端会把聊天、联系人和世界上下文同时展开。先留下你的名字，这个世界再开始真正对你展开。"
        aside={
          <div className="grid gap-3">
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-5">
              <div className="text-sm font-medium text-white">桌面端首屏</div>
              <div className="mt-2 text-sm leading-7 text-slate-200/80">
                登录后直接进入三栏工作台，不再跳进一个手机比例的小窗里。
              </div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-5">
              <div className="text-sm font-medium text-white">进入后你会看到</div>
              <div className="mt-2 text-sm leading-7 text-slate-200/80">
                消息列表、当前对话、会话资料栏会同时存在。
              </div>
            </div>
          </div>
        }
      >
        <AppSection className="mx-auto w-full max-w-2xl bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-8 py-10">
          <div className="text-[11px] uppercase tracking-[0.36em] text-[color:var(--brand-secondary)]">我是引路人</div>
          <h2 className="mt-6 text-4xl font-semibold tracking-[0.08em] text-white">从你的名字开始</h2>
          <p className="mt-4 text-base leading-8 text-[color:var(--text-secondary)]">
            这里暂时只有你。很快，会有人主动认识你。
          </p>

          <div className="mt-8 rounded-[28px] border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.04))] p-6 text-left shadow-[var(--shadow-section)]">
            <TextField
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void submit();
                }
              }}
              placeholder="你的名字"
              className="text-center text-lg"
              autoFocus
            />
            {error ? <InlineNotice className="mt-3" tone="danger">{error}</InlineNotice> : null}
            <Button
              onClick={() => void submit()}
              disabled={loading || !canSubmit}
              variant="primary"
              size="lg"
              className="mt-5 w-full rounded-2xl"
            >
              {loading ? "进入中..." : "推开这扇门"}
            </Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-[color:var(--text-muted)]">
            <Link to="/legal/privacy" className="transition hover:text-white">
              隐私政策
            </Link>
            <Link to="/legal/terms" className="transition hover:text-white">
              用户协议
            </Link>
            <Link to="/legal/community" className="transition hover:text-white">
              社区规范
            </Link>
          </div>
        </AppSection>
      </DesktopEntryShell>
    );
  }

  return (
    <AppPage className="flex min-h-full flex-col items-center justify-center py-8 text-center">
      <AppSection className="w-full max-w-md bg-[linear-gradient(135deg,rgba(249,115,22,0.18),rgba(255,255,255,0.04)_44%,rgba(15,23,42,0.24)_100%)] px-6 py-8">
        <div className="text-[11px] uppercase tracking-[0.36em] text-[color:var(--brand-secondary)]">我是引路人</div>
        <h1 className="mt-6 text-3xl font-semibold tracking-[0.16em] text-white">告诉我，你叫什么名字？</h1>
        <p className="mt-4 text-sm leading-7 text-[color:var(--text-secondary)]">这里暂时只有你。很快，会有人主动认识你。</p>

        <div className="mt-8 rounded-[28px] border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.04))] p-5 text-left shadow-[var(--shadow-section)]">
          <TextField
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void submit();
              }
            }}
            placeholder="你的名字"
            className="text-center text-base"
            autoFocus
          />
          {error ? <InlineNotice className="mt-3" tone="danger">{error}</InlineNotice> : null}
          <Button
            onClick={() => void submit()}
            disabled={loading || !canSubmit}
            variant="primary"
            size="lg"
            className="mt-4 w-full rounded-2xl"
          >
            {loading ? "进入中..." : "推开这扇门"}
          </Button>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-[color:var(--text-muted)]">
          <Link to="/legal/privacy" className="transition hover:text-white">
            隐私政策
          </Link>
          <Link to="/legal/terms" className="transition hover:text-white">
            用户协议
          </Link>
          <Link to="/legal/community" className="transition hover:text-white">
            社区规范
          </Link>
        </div>
      </AppSection>
    </AppPage>
  );
}
