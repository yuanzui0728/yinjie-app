import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSystemStatus } from "@yinjie/contracts";
import { Button, useDesktopRuntime } from "@yinjie/ui";
import { getPlatformCapabilities } from "../../lib/platform";
import { requiresRemoteServiceConfiguration } from "../../lib/runtime-config";
import { useAppRuntimeConfig } from "../../runtime/runtime-config-store";

export function DesktopRuntimeGuard() {
  const runtimeConfig = useAppRuntimeConfig();
  const { hasDesktopRuntimeControl, runtimeMode } = getPlatformCapabilities();
  const needsRemoteConfiguration = runtimeMode === "remote" && requiresRemoteServiceConfiguration();
  const attemptedAutostartRef = useRef(false);
  const {
    desktopAvailable,
    desktopStatusQuery,
    probeMutation,
    startMutation,
  } = useDesktopRuntime({
    queryKeyPrefix: "desktop",
    statusRefetchInterval: 3_000,
  });

  const remoteStatusQuery = useQuery({
    queryKey: ["app-availability", runtimeConfig.apiBaseUrl ?? "default"],
    queryFn: () => getSystemStatus(runtimeConfig.apiBaseUrl),
    enabled: !hasDesktopRuntimeControl && !needsRemoteConfiguration,
    retry: false,
    refetchInterval: 5_000,
  });

  useEffect(() => {
    if (!hasDesktopRuntimeControl || !desktopAvailable) {
      return;
    }

    const status = desktopStatusQuery.data;
    if (!status || status.reachable || startMutation.isPending || attemptedAutostartRef.current) {
      return;
    }

    attemptedAutostartRef.current = true;
    startMutation.mutate();
  }, [desktopAvailable, desktopStatusQuery.data, hasDesktopRuntimeControl, startMutation]);

  if (hasDesktopRuntimeControl && !desktopAvailable) {
    return null;
  }

  const desktopUnavailable = hasDesktopRuntimeControl && (!desktopStatusQuery.data || !desktopStatusQuery.data.reachable);
  const remoteUnavailable =
    !hasDesktopRuntimeControl &&
    (needsRemoteConfiguration ||
      remoteStatusQuery.error instanceof Error ||
      remoteStatusQuery.data?.coreApi.healthy === false);

  if (!desktopUnavailable && !remoteUnavailable) {
    return null;
  }

  const busy = hasDesktopRuntimeControl
    ? startMutation.isPending || probeMutation.isPending
    : remoteStatusQuery.isFetching;
  const title = hasDesktopRuntimeControl ? "隐界正在醒来" : "暂时无法进入隐界";
  const description = hasDesktopRuntimeControl
    ? "我们正在为你整理入口。稍等片刻，再试一次就好。"
    : needsRemoteConfiguration
      ? "入口暂时还没有准备好，请稍后再试。"
      : "连接暂时不可用，请稍后再试。";
  const helperText = hasDesktopRuntimeControl
    ? "隐界会继续在后台恢复，你只需要稍候片刻。"
    : "如果长时间没有恢复，稍后重新打开应用即可。";

  function retry() {
    if (hasDesktopRuntimeControl) {
      attemptedAutostartRef.current = false;
      startMutation.mutate();
      return;
    }

    if (needsRemoteConfiguration) {
      window.location.reload();
      return;
    }

    void remoteStatusQuery.refetch();
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[linear-gradient(180deg,rgba(7,10,18,0.96),rgba(9,13,21,0.98))] px-6">
      <div className="w-full max-w-md rounded-[32px] border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.045))] p-6 text-white shadow-[var(--shadow-shell)] backdrop-blur-xl">
        <div className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--brand-secondary)]">请稍候</div>
        <h2 className="mt-4 text-2xl font-semibold">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-[color:var(--text-secondary)]">{description}</p>

        <div className="mt-5 rounded-2xl border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-4 py-3 text-sm text-[color:var(--text-secondary)]">
          {hasDesktopRuntimeControl && busy ? "正在唤醒隐界..." : busy ? "正在重新检查入口..." : helperText}
        </div>

        <div className="mt-5">
          <Button
            onClick={retry}
            disabled={busy}
            variant="primary"
            size="lg"
            className="w-full rounded-2xl"
          >
            {busy ? "请稍候..." : "再试一次"}
          </Button>
        </div>
      </div>
    </div>
  );
}
