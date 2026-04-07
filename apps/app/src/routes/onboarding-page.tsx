import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { completeOnboarding, initUser } from "@yinjie/contracts";
import { AppPage, AppSection, Button, InlineNotice, TextField } from "@yinjie/ui";
import { useSessionStore } from "../store/session-store";

export function OnboardingPage() {
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
