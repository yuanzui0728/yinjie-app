import { useQuery } from "@tanstack/react-query";
import { LEGACY_HTTP_SURFACE, LEGACY_MIGRATED_MODULES, getAiModel, getAvailableModels } from "@yinjie/contracts";
import { AppHeader, AppPage, AppSection, InlineNotice, MetricCard, SectionHeading, StatusPill } from "@yinjie/ui";
import { useAppRuntimeConfig } from "../runtime/runtime-config-store";

const deliveryTargets = [
  "Signed desktop installer with auto-update",
  "Rust Core API and inference gateway runtime",
  "Shared typed contracts for app, admin, and desktop shell",
  "Local-first secrets, logs, diagnostics, backup, and restore flows",
];

export function SettingsPage() {
  const runtimeConfig = useAppRuntimeConfig();
  const baseUrl = runtimeConfig.apiBaseUrl;

  const aiModelQuery = useQuery({
    queryKey: ["settings-ai-model", baseUrl],
    queryFn: () => getAiModel(baseUrl),
  });

  const modelsQuery = useQuery({
    queryKey: ["settings-available-models", baseUrl],
    queryFn: () => getAvailableModels(baseUrl),
  });

  const loadingCount = Number(aiModelQuery.isLoading) + Number(modelsQuery.isLoading);

  return (
    <AppPage className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
      <div className="xl:col-span-2">
        <AppHeader
          eyebrow="Runtime Policy"
          title="Default Decisions"
          description="这里记录当前迁移过程中的默认交付决策、兼容面和运行方向。"
        />
      </div>

      <AppSection className="space-y-5">
        <SectionHeading>Default Decisions</SectionHeading>
        <div className="flex flex-wrap gap-3">
          <StatusPill tone="healthy">Cross-platform Desktop</StatusPill>
          <StatusPill>Rust-first Runtime</StatusPill>
          <StatusPill>OpenAI-compatible Providers</StatusPill>
          <StatusPill>Self-hosted Single User</StatusPill>
        </div>
        <p className="text-sm leading-7 text-[color:var(--text-secondary)]">
          This refactor only upgrades structure, runtime, language boundaries, UI, and UX. Product rules stay frozen
          while the delivery path becomes installable, diagnosable, and maintainable.
        </p>

        {loadingCount > 0 ? <InlineNotice tone="info">正在同步运行时配置与模型目录。</InlineNotice> : null}
        {aiModelQuery.error instanceof Error || modelsQuery.error instanceof Error ? (
          <InlineNotice tone="warning">
            {aiModelQuery.error instanceof Error ? `当前模型读取失败：${aiModelQuery.error.message}` : null}
            {aiModelQuery.error instanceof Error && modelsQuery.error instanceof Error ? " " : null}
            {modelsQuery.error instanceof Error ? `模型目录读取失败：${modelsQuery.error.message}` : null}
          </InlineNotice>
        ) : null}

        <div className="grid gap-3">
          <MetricCard label="Active AI Model" value={aiModelQuery.data?.model ?? "pending"} />
          <MetricCard label="Available Catalog" value={modelsQuery.data?.models.length ?? 0} />
          <MetricCard
            label="Migrated Modules"
            value={LEGACY_MIGRATED_MODULES.length}
            detail={LEGACY_MIGRATED_MODULES.join(", ")}
          />
        </div>
      </AppSection>

      <AppSection className="space-y-5">
        <SectionHeading>Delivery Surface</SectionHeading>
        <div className="grid gap-3">
          {deliveryTargets.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.03))] px-4 py-3 text-sm text-[color:var(--text-secondary)]"
            >
              {item}
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[color:var(--border-faint)] bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.03))] p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Legacy Compatibility</div>
          <ul className="mt-4 space-y-2 text-sm leading-7 text-[color:var(--text-secondary)]">
            {LEGACY_HTTP_SURFACE.map((route) => (
              <li key={route}>{route}</li>
            ))}
          </ul>
        </div>
      </AppSection>
    </AppPage>
  );
}
