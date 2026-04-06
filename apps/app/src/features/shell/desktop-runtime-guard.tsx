import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useDesktopRuntime } from "@yinjie/ui";
import { getPlatformCapabilities } from "../../lib/platform";

export function DesktopRuntimeGuard() {
  const { hasDesktopRuntimeControl } = getPlatformCapabilities();
  const attemptedAutostartRef = useRef(false);
  const {
    desktopAvailable,
    desktopStatusQuery,
    probeMutation,
    runtimeContextQuery,
    runtimeDiagnosticsQuery,
    startMutation,
  } = useDesktopRuntime({
    queryKeyPrefix: "desktop",
    statusRefetchInterval: 3_000,
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

  if (!hasDesktopRuntimeControl || !desktopAvailable) {
    return null;
  }

  const status = desktopStatusQuery.data;
  const shouldBlock = !status || !status.reachable;
  const busy = startMutation.isPending || probeMutation.isPending;
  const errorMessage =
    (startMutation.error instanceof Error && startMutation.error.message) ||
    (probeMutation.error instanceof Error && probeMutation.error.message) ||
    null;

  if (!shouldBlock) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-[linear-gradient(180deg,rgba(7,10,18,0.96),rgba(9,13,21,0.98))] px-6">
      <div className="w-full max-w-md rounded-[32px] border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.045))] p-6 text-white shadow-[var(--shadow-shell)] backdrop-blur-xl">
        <div className="text-[11px] uppercase tracking-[0.32em] text-[color:var(--brand-secondary)]">桌面启动</div>
        <h2 className="mt-4 text-2xl font-semibold">正在唤醒你的本地世界</h2>
        <p className="mt-3 text-sm leading-7 text-[color:var(--text-secondary)]">
          桌面壳需要先确认 Core API 已经可达。首次启动时，它可能会先创建运行目录并拉起本地进程。
        </p>

        <div className="mt-5 space-y-3">
          <div className="rounded-2xl border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-4 py-3 text-sm text-[color:var(--text-secondary)]">
            状态：{startMutation.isPending ? "正在启动 Core API..." : status?.message ?? "等待运行时状态..."}
          </div>
          <div className="rounded-2xl border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-4 py-3 text-sm text-[color:var(--text-secondary)]">
            运行目录：{runtimeContextQuery.data?.runtimeDataDir ?? "loading"}
          </div>
          <div className="rounded-2xl border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-4 py-3 text-sm text-[color:var(--text-secondary)]">
            地址：{status?.baseUrl ?? runtimeContextQuery.data?.coreApiBaseUrl ?? "loading"}
          </div>
          <div className="rounded-2xl border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-4 py-3 text-sm text-[color:var(--text-secondary)]">
            诊断：{runtimeDiagnosticsQuery.data ? formatDesktopDiagnostics(runtimeDiagnosticsQuery.data) : "正在读取桌面诊断..."}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => startMutation.mutate()}
            disabled={busy}
            className="rounded-full bg-[var(--brand-gradient)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {startMutation.isPending ? "启动中..." : "再试一次"}
          </button>
          <button
            type="button"
            onClick={() => probeMutation.mutate()}
            disabled={busy}
            className="rounded-full border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] px-4 py-2 text-sm text-white disabled:opacity-60"
          >
            {probeMutation.isPending ? "探活中..." : "探活"}
          </button>
          <Link
            to="/setup"
            className="rounded-full border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] px-4 py-2 text-sm text-white"
          >
            打开首启页
          </Link>
        </div>

        <div className="mt-4 text-xs leading-6 text-[color:var(--text-muted)]">
          {probeMutation.data?.message ??
            startMutation.data?.message ??
            (startMutation.error instanceof Error ? startMutation.error.message : null) ??
            "如果长时间没有恢复，先检查桌面包内置的 core-api 是否完整，再确认是否需要通过 YINJIE_CORE_API_CMD 覆盖启动命令。"}
        </div>
        {errorMessage ? <div className="mt-3 text-sm text-[#fda4af]">{errorMessage}</div> : null}
      </div>
    </div>
  );
}

function formatDesktopDiagnostics(values: {
  platform: string;
  diagnosticsStatus?: string;
  coreApiCommandSource?: string;
  coreApiCommandResolved: boolean;
  coreApiPortOccupied?: boolean;
  bundledCoreApiExists?: boolean;
  managedByDesktopShell?: boolean;
  managedChildPid?: number | null;
  desktopLogPath?: string;
  lastCoreApiError?: string | null;
  linuxMissingPackages: string[];
  summary: string;
}) {
  const packageStatus = values.linuxMissingPackages.length
    ? `missing=${values.linuxMissingPackages.join(", ")}`
    : "linux deps ok";
  const sidecarStatus = formatCommandSource(values.coreApiCommandSource, values.bundledCoreApiExists);
  const failureStatus =
    values.diagnosticsStatus === "port-occupied"
      ? "port occupied"
      : values.diagnosticsStatus === "bundled-sidecar-missing"
        ? "bundled sidecar missing"
        : values.diagnosticsStatus === "spawn-failed"
          ? "spawn failed"
          : values.diagnosticsStatus === "health-probe-failed"
            ? "health probe failed"
            : values.diagnosticsStatus ?? "unknown";
  const managedStatus = values.managedByDesktopShell
    ? `managed${values.managedChildPid ? ` pid=${values.managedChildPid}` : ""}`
    : "unmanaged";
  const logPath = values.desktopLogPath ? ` · log=${values.desktopLogPath}` : "";
  const lastError = values.lastCoreApiError ? ` · last-error=${values.lastCoreApiError}` : "";

  return `${values.platform} · ${values.summary} · ${values.coreApiCommandResolved ? "command ok" : "command missing"} · ${sidecarStatus} · ${failureStatus} · ${managedStatus} · ${packageStatus}${values.coreApiPortOccupied ? " · port-in-use" : ""}${logPath}${lastError}`;
}

function formatCommandSource(source?: string, bundledExists?: boolean) {
  if (source === "bundled" || source === "bundled-sidecar") {
    return "bundled sidecar";
  }
  if (source === "env" || source === "env-override") {
    return "env override";
  }
  if (source === "path" || source === "path-lookup") {
    return bundledExists ? "path lookup (bundled missing)" : "path lookup";
  }

  return bundledExists ? "sidecar ready" : "sidecar missing";
}
