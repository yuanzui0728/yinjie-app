import { useQuery } from "@tanstack/react-query";
import { LEGACY_HTTP_SURFACE, LEGACY_MIGRATED_MODULES, getAiModel, getAvailableModels } from "@yinjie/contracts";
import { Card, SectionHeading, StatusPill } from "@yinjie/ui";

const deliveryTargets = [
  "Signed desktop installer with auto-update",
  "Rust Core API and inference gateway runtime",
  "Shared typed contracts for app, admin, and desktop shell",
  "Local-first secrets, logs, diagnostics, backup, and restore flows",
];

export function SettingsPage() {
  const baseUrl = import.meta.env.VITE_CORE_API_BASE_URL;

  const aiModelQuery = useQuery({
    queryKey: ["settings-ai-model", baseUrl],
    queryFn: () => getAiModel(baseUrl),
  });

  const modelsQuery = useQuery({
    queryKey: ["settings-available-models", baseUrl],
    queryFn: () => getAvailableModels(baseUrl),
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
      <Card>
        <SectionHeading>Default Decisions</SectionHeading>
        <div className="mt-4 flex flex-wrap gap-3">
          <StatusPill tone="healthy">Cross-platform Desktop</StatusPill>
          <StatusPill>Rust-first Runtime</StatusPill>
          <StatusPill>OpenAI-compatible Providers</StatusPill>
          <StatusPill>Self-hosted Single User</StatusPill>
        </div>
        <p className="mt-5 text-sm leading-7 text-[color:var(--text-secondary)]">
          This refactor only upgrades structure, runtime, language boundaries, UI, and UX. Product rules stay frozen
          while the delivery path becomes installable, diagnosable, and maintainable.
        </p>

        <div className="mt-5 grid gap-3">
          <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-[color:var(--text-secondary)]">
            Active AI model: {aiModelQuery.data?.model ?? "pending"}
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-[color:var(--text-secondary)]">
            Available model catalog: {modelsQuery.data?.models.length ?? 0}
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-[color:var(--text-secondary)]">
            Migrated modules in contracts: {LEGACY_MIGRATED_MODULES.join(", ")}
          </div>
        </div>
      </Card>

      <Card className="bg-[color:var(--surface-secondary)]">
        <SectionHeading>Delivery Surface</SectionHeading>
        <div className="mt-4 grid gap-3">
          {deliveryTargets.map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-sm text-[color:var(--text-secondary)]"
            >
              {item}
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/10 p-4">
          <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Legacy Compatibility</div>
          <ul className="mt-4 space-y-2 text-sm leading-7 text-[color:var(--text-secondary)]">
            {LEGACY_HTTP_SURFACE.map((route) => (
              <li key={route}>{route}</li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}
