import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { loginUser } from "@yinjie/contracts";
import { AppPage, AppSection, Button, InlineNotice, TextField } from "@yinjie/ui";
import { DesktopEntryShell } from "../features/desktop/desktop-entry-shell";
import { useDesktopLayout } from "../features/shell/use-desktop-layout";
import { useAppRuntimeConfig } from "../runtime/runtime-config-store";
import { useSessionStore } from "../store/session-store";

export function LoginPage() {
  const isDesktopLayout = useDesktopLayout();
  const navigate = useNavigate();
  const hydrateSession = useSessionStore((state) => state.hydrateSession);
  const runtimeConfig = useAppRuntimeConfig();
  const baseUrl = runtimeConfig.apiBaseUrl ?? "default";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const canSubmit = username.trim() && password.trim();

  useEffect(() => {
    setUsername("");
    setPassword("");
    setError("");
    setLoading(false);
  }, [baseUrl]);

  async function submit() {
    setLoading(true);
    setError("");
    try {
      const session = await loginUser({ username, password });
      hydrateSession(session);
      navigate({ to: "/tabs/chat", replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  if (isDesktopLayout) {
    return (
      <DesktopEntryShell
        badge="已有入口"
        title="回到隐界"
        description="桌面端会把消息和资料并排展开。登录后你会直接回到桌面工作台，而不是落进手机画幅。"
        aside={
          <div className="space-y-3">
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-5">
              <div className="text-sm font-medium text-white">桌面工作台</div>
              <div className="mt-2 text-sm leading-7 text-slate-200/80">
                会话列表、当前聊天、资料栏会同时保留在视野内。
              </div>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/6 p-5">
              <div className="text-sm font-medium text-white">世界地址</div>
              <div className="mt-2 text-sm leading-7 text-slate-200/80">
                当前连接会沿用你在 Setup 页确认过的世界入口。
              </div>
            </div>
          </div>
        }
      >
        <AppSection className="mx-auto w-full max-w-2xl space-y-6 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(13,22,35,0.72))] px-8 py-10">
          <div className="text-[11px] uppercase tracking-[0.36em] text-[color:var(--text-muted)]">已有入口</div>
          <h2 className="text-4xl font-semibold text-white">继续你的世界时间线</h2>
          <p className="text-base leading-8 text-[color:var(--text-secondary)]">
            使用已有账号继续进入这个世界，当前资料和会话会沿着同一条时间线延续。
          </p>
          <div className="space-y-4">
            <TextField
              placeholder="用户名"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            <TextField
              type="password"
              placeholder="密码"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}
          <Button
            onClick={() => void submit()}
            disabled={loading || !canSubmit}
            variant="primary"
            size="lg"
            className="w-full rounded-2xl"
          >
            {loading ? "登录中..." : "登录"}
          </Button>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-[color:var(--text-muted)]">
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
    <AppPage className="flex min-h-full flex-col justify-center">
      <AppSection className="space-y-5 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(13,22,35,0.72))] px-6 py-8">
        <div className="text-[11px] uppercase tracking-[0.36em] text-[color:var(--text-muted)]">已有入口</div>
        <h1 className="mt-4 text-3xl font-semibold text-white">回到隐界</h1>
        <p className="text-sm leading-7 text-[color:var(--text-secondary)]">使用已有账号继续进入这个世界，当前资料和会话会沿着同一条时间线延续。</p>
        <div className="space-y-3">
          <TextField
            placeholder="用户名"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
          <TextField
            type="password"
            placeholder="密码"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}
        <Button
          onClick={() => void submit()}
          disabled={loading || !canSubmit}
          variant="primary"
          size="lg"
          className="w-full rounded-2xl"
        >
          {loading ? "登录中..." : "登录"}
        </Button>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-[color:var(--text-muted)]">
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
