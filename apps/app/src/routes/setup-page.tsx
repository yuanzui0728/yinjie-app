import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { getSystemStatus } from "@yinjie/contracts";
import {
  Button,
  ErrorBlock,
  InlineNotice,
  DesktopRuntimeActions,
  ProviderSetupForm,
  SetupScaffold,
  SetupStatusCard,
  SetupStepList,
  TextField,
  useDesktopRuntime,
  useProviderSetup,
} from "@yinjie/ui";
import { getPlatformCapabilities } from "../lib/platform";
import { resolveConfiguredCoreApiBaseUrl } from "../lib/runtime-config";
import { getAppRuntimeConfig, setAppRuntimeConfig, useAppRuntimeConfig } from "../runtime/runtime-config-store";
import { useSessionStore } from "../store/session-store";

export function SetupPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const runtimeConfig = useAppRuntimeConfig();
  const [remoteBaseUrlDraft, setRemoteBaseUrlDraft] = useState(runtimeConfig.apiBaseUrl ?? resolveConfiguredCoreApiBaseUrl());
  const completeEnvironmentSetup = useSessionStore((state) => state.completeEnvironmentSetup);
  const { hasDesktopRuntimeControl, runtimeMode } = getPlatformCapabilities();
  const {
    desktopAvailable,
    desktopStatusQuery,
    probeMutation,
    restartMutation,
    runtimeContextQuery,
    runtimeDiagnosticsQuery,
    startMutation,
    stopMutation,
  } = useDesktopRuntime({
    queryKeyPrefix: "setup-desktop",
    invalidateOnAction: [["setup-system-status"]],
  });

  const systemStatusQuery = useQuery({
    queryKey: ["setup-system-status", runtimeConfig.apiBaseUrl ?? "default"],
    queryFn: () => getSystemStatus(runtimeConfig.apiBaseUrl),
    enabled: !hasDesktopRuntimeControl,
    retry: false,
  });

  const testRemoteConfigMutation = useMutation({
    mutationFn: async (baseUrl: string) => {
      const normalized = normalizeRemoteBaseUrl(baseUrl);
      return getSystemStatus(normalized);
    },
  });

  const saveRemoteConfigMutation = useMutation({
    mutationFn: async (baseUrl: string) => {
      const normalized = normalizeRemoteBaseUrl(baseUrl);
      await getSystemStatus(normalized);
      const nextConfig = setAppRuntimeConfig({
        ...getAppRuntimeConfig(),
        apiBaseUrl: normalized,
        socketBaseUrl: normalized,
      });

      queryClient.clear();

      return nextConfig;
    },
  });

  useEffect(() => {
    setRemoteBaseUrlDraft(runtimeConfig.apiBaseUrl ?? resolveConfiguredCoreApiBaseUrl());
    testRemoteConfigMutation.reset();
    saveRemoteConfigMutation.reset();
  }, [runtimeConfig.apiBaseUrl]);

  const desktopCoreApiReachable = Boolean(desktopStatusQuery.data?.reachable);
  const coreApiReady = hasDesktopRuntimeControl
    ? desktopCoreApiReachable
    : Boolean(systemStatusQuery.data?.coreApi.healthy);

  const {
    availableModelsQuery,
    providerDraft,
    providerProbeMutation,
    providerQuery,
    providerReady,
    providerSaveMutation,
    providerValidationMessage,
    submitProviderProbe,
    submitProviderSave,
    updateProviderDraft,
  } = useProviderSetup({
    enabled: !hasDesktopRuntimeControl || coreApiReady,
    queryKeyPrefix: "setup",
    invalidateOnSave: [["setup-system-status"]],
  });
  const runtimeDataReady = hasDesktopRuntimeControl ? Boolean(runtimeContextQuery.data?.runtimeDataDir) : true;
  const setupSteps = [
    {
      label: "本地 Core API",
      ok: coreApiReady,
      hint: coreApiReady ? "已可达" : "需要先启动或恢复本地服务",
    },
    {
      label: "Runtime Data",
      ok: runtimeDataReady,
      hint: runtimeDataReady ? "运行目录已解析" : "等待桌面壳返回本地运行目录",
    },
    {
      label: "Provider",
      ok: providerReady,
      hint: providerReady ? "已具备真实生成链" : "可选，未配置时会走 fallback 文案",
    },
  ];
  const readyStepCount = setupSteps.filter((step) => step.ok).length;
  const primaryEntryLabel = !coreApiReady ? "先启动 Core API" : providerReady ? "进入隐界" : "继续进入隐界";
  const primaryEntryDescription = !coreApiReady
    ? "Core API 还没准备好，先把本地世界拉起来。"
    : providerReady
      ? "核心运行时和 provider 都已就绪，可以直接进入。"
      : "你也可以现在直接进入；聊天和动态会先使用 fallback 文案。";
  const desktopRuntimeBusy =
    probeMutation.isPending || startMutation.isPending || restartMutation.isPending || stopMutation.isPending;
  const desktopRuntimeError =
    (probeMutation.error instanceof Error && probeMutation.error.message) ||
    (startMutation.error instanceof Error && startMutation.error.message) ||
    (restartMutation.error instanceof Error && restartMutation.error.message) ||
    (stopMutation.error instanceof Error && stopMutation.error.message) ||
    null;
  const providerLoadError =
    (providerQuery.error instanceof Error && providerQuery.error.message) ||
    (availableModelsQuery.error instanceof Error && availableModelsQuery.error.message) ||
    null;
  const providerActionError =
    (providerProbeMutation.error instanceof Error && providerProbeMutation.error.message) ||
    (providerSaveMutation.error instanceof Error && providerSaveMutation.error.message) ||
    null;
  const remoteConfigError =
    (systemStatusQuery.error instanceof Error && systemStatusQuery.error.message) || null;

  function continueIntoWorld() {
    completeEnvironmentSetup({ providerReady, runtimeMode });
    void navigate({ to: "/onboarding" });
  }

  if (!hasDesktopRuntimeControl) {
    const serviceReady = Boolean(systemStatusQuery.data?.coreApi.healthy);
    const activeProvider = systemStatusQuery.data?.inferenceGateway.activeProvider;
    const remoteBusy = testRemoteConfigMutation.isPending || saveRemoteConfigMutation.isPending;
    const remoteMutationError =
      (testRemoteConfigMutation.error instanceof Error && testRemoteConfigMutation.error.message) ||
      (saveRemoteConfigMutation.error instanceof Error && saveRemoteConfigMutation.error.message) ||
      null;

    return (
      <SetupScaffold
        badge="环境检查"
        title="先确认远程世界已经连上"
        description="iOS 和远程模式不会托管本地 Core API。这里主要检查当前服务连通性，并给出后续入口。"
        heroAside={
          <div className="rounded-2xl border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.035))] px-4 py-3 text-sm leading-7 text-[color:var(--text-secondary)]">
            当前服务地址：{resolveConfiguredCoreApiBaseUrl()}
          </div>
        }
        left={
          <section className="space-y-4">
            <div className="rounded-[28px] border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.04))] p-5 shadow-[var(--shadow-section)]">
              <div className="text-sm font-medium text-white">连接远程 Core API</div>
              <p className="mt-2 text-sm leading-7 text-[color:var(--text-secondary)]">
                Android / iOS / 远程模式不托管本地服务。先在这里保存要连接的 Core API 地址。
              </p>
              <div className="mt-4 space-y-3">
                <TextField
                  value={remoteBaseUrlDraft}
                  onChange={(event) => setRemoteBaseUrlDraft(event.target.value)}
                  placeholder="https://your-host.example.com"
                />
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => testRemoteConfigMutation.mutate(remoteBaseUrlDraft)}
                    disabled={remoteBusy || !remoteBaseUrlDraft.trim()}
                    variant="secondary"
                  >
                    {testRemoteConfigMutation.isPending ? "测试中..." : "测试连接"}
                  </Button>
                  <Button
                    onClick={() => saveRemoteConfigMutation.mutate(remoteBaseUrlDraft)}
                    disabled={remoteBusy || !remoteBaseUrlDraft.trim()}
                    variant="primary"
                  >
                    {saveRemoteConfigMutation.isPending ? "保存中..." : "保存并连接"}
                  </Button>
                </div>
                <InlineNotice tone="muted">
                  当前已生效地址：{runtimeConfig.apiBaseUrl ?? resolveConfiguredCoreApiBaseUrl()}
                </InlineNotice>
                {testRemoteConfigMutation.data ? (
                  <InlineNotice tone="success">
                    测试成功：{testRemoteConfigMutation.data.coreApi.message || "远程 Core API 可达"}
                  </InlineNotice>
                ) : null}
                {saveRemoteConfigMutation.data ? (
                  <InlineNotice tone="success">
                    已保存远程地址：{saveRemoteConfigMutation.data.apiBaseUrl ?? resolveConfiguredCoreApiBaseUrl()}
                  </InlineNotice>
                ) : null}
                {remoteMutationError ? <ErrorBlock message={remoteMutationError} /> : null}
              </div>
            </div>
            <SetupStepList
              steps={[
                {
                  label: "远程 Core API",
                  ok: serviceReady,
                  hint: serviceReady ? "已可达" : "当前不可达，请先检查服务部署或网络",
                },
                {
                  label: "账号入口",
                  ok: true,
                  hint: "可直接进入 onboarding 或已有账号登录",
                },
                {
                  label: "Provider",
                  ok: Boolean(activeProvider),
                  hint: activeProvider ? `服务端已启用 ${activeProvider}` : "Provider 由服务端统一维护",
                },
              ]}
            />
            <SetupStatusCard
              title="远程服务"
              value={systemStatusQuery.data?.coreApi.version ?? resolveConfiguredCoreApiBaseUrl()}
              detail={
                systemStatusQuery.data?.coreApi.message ??
                "远程模式下，聊天和动态都通过线上 Core API 与推理网关提供能力。"
              }
              ok={serviceReady}
            />
            <SetupStatusCard
              title="Inference Gateway"
              value={activeProvider ?? "未配置 active provider"}
              detail={
                activeProvider
                  ? `请求将通过 ${activeProvider} 提供真实生成。`
                  : "当前没有活动 provider，服务端会决定是否回退到 fallback 文案。"
              }
              ok={Boolean(activeProvider)}
            />
            <SetupStatusCard
              title="运行模式"
              value="remote"
              detail="当前渠道不会在本地设备上管理 Core API 进程。"
              ok
            />
            {remoteConfigError ? (
              <InlineNotice tone="danger">{remoteConfigError}</InlineNotice>
            ) : null}
            <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1 text-xs text-[color:var(--text-muted)]">
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
          </section>
        }
        right={
          <section className="rounded-[28px] border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.04))] p-5 shadow-[var(--shadow-section)]">
            <div className="text-sm font-medium text-white">下一步</div>
            <InlineNotice className="mt-3" tone={serviceReady ? "success" : "warning"}>
              {serviceReady
                ? "远程服务已可达，可以直接进入隐界。"
                : "服务当前不可达。你仍可查看登录入口，但进入业务前需要先恢复远程 Core API。"}
            </InlineNotice>
            <div className="mt-4 space-y-3">
              <Button
                onClick={continueIntoWorld}
                disabled={!serviceReady}
                variant="primary"
                size="lg"
                className="w-full rounded-2xl"
              >
                继续进入隐界
              </Button>
              <Link to="/login" className="block">
                <Button variant="secondary" size="lg" className="w-full rounded-2xl">
                  我已有账号
                </Button>
              </Link>
            </div>
          </section>
        }
      />
    );
  }

  return (
    <SetupScaffold
      badge="首次启动"
      title="先确认这个世界能自己运转"
      description="桌面版第一次打开时，先检查本地 Core API、运行目录和当前 provider 配置。准备好之后，再进入隐界。"
      heroAside={
        <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="rounded-2xl border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-4 py-3 text-center">
            <div className="text-[11px] uppercase tracking-[0.24em] text-[color:var(--text-muted)]">进度</div>
            <div className="mt-2 text-2xl font-semibold text-white">
              {readyStepCount}/{setupSteps.length}
            </div>
          </div>
          <div className="rounded-2xl border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] px-4 py-3 text-sm leading-7 text-[color:var(--text-secondary)]">
            {primaryEntryDescription}
          </div>
        </div>
      }
      left={
        <>
          <section className="space-y-4">
            <SetupStepList steps={setupSteps} />
            <SetupStatusCard
              title="Core API"
              value={
                hasDesktopRuntimeControl
                  ? desktopStatusQuery.data?.baseUrl ?? "loading"
                  : systemStatusQuery.data?.coreApi.version ?? "http://127.0.0.1:39091"
              }
              detail={
                hasDesktopRuntimeControl
                  ? desktopStatusQuery.data?.message ?? "桌面壳会托管本地 Core API 进程。"
                  : systemStatusQuery.data?.coreApi.message ?? "浏览器模式下直接探测 Core API。"
              }
              ok={coreApiReady}
            />
            <SetupStatusCard
              title="Provider"
              value={providerQuery.data?.model ?? "未配置"}
              detail={
                providerReady
                  ? `${providerQuery.data?.mode ?? "local-compatible"} · ${providerQuery.data?.endpoint ?? ""}`
                  : coreApiReady
                    ? "当前没有可用 provider 配置时，业务仍会走 fallback 文案。"
                    : "等待 Core API 可达后再读取 provider 配置。"
              }
              ok={providerReady}
            />
            <SetupStatusCard
              title="Runtime Data"
              value={runtimeContextQuery.data?.runtimeDataDir ?? "runtime-data"}
              detail={runtimeContextQuery.data?.databasePath ?? "桌面模式会把 SQLite 和日志落到本地 app data 目录。"}
              ok={runtimeDataReady}
            />
            {hasDesktopRuntimeControl ? (
              <SetupStatusCard
                title="桌面诊断"
                value={runtimeDiagnosticsQuery.data?.platform ?? "desktop"}
                detail={
                  runtimeDiagnosticsQuery.data
                    ? formatDesktopDiagnostics(runtimeDiagnosticsQuery.data)
                    : "正在读取桌面运行时诊断..."
                }
                ok={
                  runtimeDiagnosticsQuery.data?.diagnosticsStatus === "ready" &&
                  (runtimeDiagnosticsQuery.data?.linuxMissingPackages.length ?? 0) === 0
                }
              />
            ) : null}
          </section>

          {hasDesktopRuntimeControl ? (
              <DesktopRuntimeActions
                title="桌面运行时操作"
                probeLabel={probeMutation.isPending ? "探活中..." : "探活"}
                startLabel={startMutation.isPending ? "启动中..." : "启动 Core API"}
                restartLabel={restartMutation.isPending ? "重启中..." : "重启 Core API"}
                stopLabel={stopMutation.isPending ? "停止中..." : "停止 Core API"}
                onProbe={() => probeMutation.mutate()}
                onStart={() => startMutation.mutate()}
                onRestart={() => restartMutation.mutate()}
                onStop={() => stopMutation.mutate()}
                busy={desktopRuntimeBusy}
                errorMessage={desktopRuntimeError}
                message={
                  probeMutation.data?.message ??
                  startMutation.data?.message ??
                  restartMutation.data?.message ??
                  stopMutation.data?.message ??
                  desktopStatusQuery.data?.message ??
                  "桌面壳会优先尝试自动拉起 Core API；这里保留手动恢复入口。"
                }
              />
            ) : null}
        </>
      }
      right={
        <>
          <ProviderSetupForm
            title="Provider 配置"
            description="首次启动建议在这里完成最小 provider 设置。没有 provider 时系统仍可运行，但只会使用 fallback 文案。"
            statusLabel={providerReady ? "configured" : "pending"}
            endpointLabel="Endpoint"
            modeLabel="Mode"
            modelLabel="Model"
            apiKeyLabel="API Key"
            endpointPlaceholder="http://127.0.0.1:11434/v1"
            modelPlaceholder="deepseek-chat"
            apiKeyPlaceholder="可选；本地兼容 provider 通常可留空"
            probeLabel="测试 Provider"
            saveLabel="保存配置"
            draft={providerDraft}
            availableModels={availableModelsQuery.data?.models ?? []}
            availableModelsId="setup-available-models"
            disabled={!coreApiReady}
            validationMessage={coreApiReady ? providerValidationMessage : null}
            errorMessage={coreApiReady ? providerLoadError : null}
            actionErrorMessage={coreApiReady ? providerActionError : null}
            footerMessage={
              !coreApiReady
                ? "先让本地 Core API 可达，再测试或保存 provider。"
                : providerLoadError
                  ? "Provider 配置或模型目录读取失败，请先修复本地 Core API / provider 状态。"
                : providerProbeMutation.data
                  ? formatProbeMessage(providerProbeMutation.data)
                  : providerSaveMutation.data
                    ? formatProviderSavedMessage(providerSaveMutation.data)
                    : "Provider 保存后，后续 moments / chat / scheduler 生成链会优先走真实 gateway。"
            }
            onSubmit={submitProviderSave}
            onProbe={submitProviderProbe}
            onChange={updateProviderDraft}
            probePending={providerProbeMutation.isPending}
            savePending={providerSaveMutation.isPending}
          />

          <section className="rounded-[28px] border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.04))] p-5 shadow-[var(--shadow-section)]">
            <div className="text-sm font-medium text-white">下一步</div>
            <InlineNotice className="mt-3" tone={coreApiReady ? (providerReady ? "success" : "warning") : "info"}>
              {primaryEntryDescription}
            </InlineNotice>
            <div className="mt-4 space-y-3">
              {coreApiReady ? (
                <Button onClick={continueIntoWorld} variant="primary" size="lg" className="w-full rounded-2xl">
                  {primaryEntryLabel}
                </Button>
              ) : (
                <Button onClick={() => startMutation.mutate()} variant="secondary" size="lg" className="w-full rounded-2xl">
                  {primaryEntryLabel}
                </Button>
              )}
              <Link to="/login" className="block">
                <Button variant="secondary" size="lg" className="w-full rounded-2xl">
                  我已有账号
                </Button>
              </Link>
            </div>
          </section>
        </>
      }
    />
  );
}

function formatDesktopDiagnostics(values: {
  coreApiCommand: string;
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
  const commandStatus = values.coreApiCommandResolved ? "command ok" : "command missing";
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

  return `${values.summary} · ${commandStatus} · ${sidecarStatus} · ${failureStatus} · ${managedStatus} · ${packageStatus} · ${values.coreApiCommand}${values.coreApiPortOccupied ? " · port-in-use" : ""}${logPath}${lastError}`;
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

function formatProviderSavedMessage(values: {
  endpoint: string;
  model: string;
  mode: string;
}) {
  return `已保存 ${values.model} (${values.mode}) @ ${values.endpoint}`;
}

function formatProbeMessage(values: {
  message: string;
  normalizedEndpoint?: string;
  statusCode?: number;
}) {
  if (values.normalizedEndpoint && typeof values.statusCode === "number") {
    return `${values.message} normalized=${values.normalizedEndpoint} status=${values.statusCode}`;
  }

  if (values.normalizedEndpoint) {
    return `${values.message} normalized=${values.normalizedEndpoint}`;
  }

  return values.message;
}

function normalizeRemoteBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}
