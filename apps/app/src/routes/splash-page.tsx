import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppPage, AppSection, InlineNotice } from "@yinjie/ui";
import { getPlatformCapabilities } from "../lib/platform";
import { requiresRemoteServiceConfiguration } from "../lib/runtime-config";
import { useSessionStore } from "../store/session-store";

export function SplashPage() {
  const navigate = useNavigate();
  const token = useSessionStore((state) => state.token);
  const onboardingCompleted = useSessionStore((state) => state.onboardingCompleted);
  const environmentSetupCompleted = useSessionStore((state) => state.environmentSetupCompleted);
  const { requiresEnvironmentSetup, runtimeMode } = getPlatformCapabilities();
  const needsRemoteConfiguration = runtimeMode === "remote" && requiresRemoteServiceConfiguration();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const setupPending =
        (requiresEnvironmentSetup && !environmentSetupCompleted) || needsRemoteConfiguration || !environmentSetupCompleted;

      if (!token) {
        navigate({
          to: setupPending ? "/setup" : "/onboarding",
          replace: true,
        });
        return;
      }

      if (setupPending) {
        navigate({ to: "/setup", replace: true });
        return;
      }

      navigate({ to: onboardingCompleted ? "/tabs/chat" : "/onboarding", replace: true });
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [environmentSetupCompleted, navigate, needsRemoteConfiguration, onboardingCompleted, requiresEnvironmentSetup, token]);

  return (
    <AppPage className="flex min-h-full flex-col items-center justify-center py-10 text-center">
      <AppSection className="w-full max-w-sm bg-[linear-gradient(135deg,rgba(249,115,22,0.2),rgba(255,255,255,0.04)_42%,rgba(15,23,42,0.28)_100%)] px-8 py-10">
        <div className="text-[11px] uppercase tracking-[0.42em] text-[color:var(--text-muted)]">在现实之外</div>
        <h1 className="mt-5 text-4xl font-semibold tracking-[0.22em] text-white">隐界</h1>
        <p className="mt-5 text-sm leading-8 text-[color:var(--text-secondary)]">你推开的不是一个工具，而是另一个仍在运转的世界。</p>
        <InlineNotice className="mt-6 text-left" tone="info">
          {requiresEnvironmentSetup && !environmentSetupCompleted
            ? "首次进入前，先确认本地运行环境已经准备好。"
            : needsRemoteConfiguration
              ? "先配置远程 Core API 地址，才能进入这个世界。"
            : runtimeMode === "remote"
              ? "正在连接你的远程世界。"
              : "正在整理进入路径。"}
        </InlineNotice>
      </AppSection>
    </AppPage>
  );
}
