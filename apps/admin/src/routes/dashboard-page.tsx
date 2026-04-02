import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { getSystemStatus, testProviderConnection } from "@yinjie/contracts";
import { providerConfigSchema, type ProviderConfig } from "@yinjie/config";
import { Card, SectionHeading, StatusPill } from "@yinjie/ui";

export function DashboardPage() {
  const statusQuery = useQuery({
    queryKey: ["admin-system-status"],
    queryFn: () => getSystemStatus(import.meta.env.VITE_CORE_API_BASE_URL),
  });

  const form = useForm<ProviderConfig>({
    resolver: zodResolver(providerConfigSchema),
    defaultValues: {
      endpoint: "http://127.0.0.1:11434/v1",
      model: "deepseek-chat",
      mode: "local-compatible",
      apiKey: "",
    },
  });

  const providerMutation = useMutation({
    mutationFn: (values: ProviderConfig) =>
      testProviderConnection(
        {
          endpoint: values.endpoint,
          model: values.model,
          apiKey: values.apiKey,
        },
        import.meta.env.VITE_CORE_API_BASE_URL,
      ),
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <Card className="bg-[color:var(--surface-console)]">
        <SectionHeading>系统概览</SectionHeading>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Core API</div>
            <div className="mt-2 text-2xl font-semibold">
              {statusQuery.data?.coreApi.version ?? "offline"}
            </div>
            <div className="mt-3">
              <StatusPill tone={statusQuery.data?.coreApi.healthy ? "healthy" : "warning"}>
                {statusQuery.isLoading ? "probing" : statusQuery.data?.coreApi.healthy ? "healthy" : "waiting"}
              </StatusPill>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-[color:var(--text-muted)]">Inference Queue</div>
            <div className="mt-2 text-2xl font-semibold">
              {statusQuery.data?.inferenceGateway.queueDepth ?? 0}
            </div>
            <div className="mt-3 text-sm text-[color:var(--text-secondary)]">
              max concurrency: {statusQuery.data?.inferenceGateway.maxConcurrency ?? 0}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-7 text-[color:var(--text-secondary)]">
          这一页是新的本地后台入口骨架。后续会在这里平移角色管理、模型配置、日志、诊断和备份恢复，
          但不会改动现有角色与消息规则。
        </div>
      </Card>

      <Card className="bg-[color:var(--surface-console)]">
        <SectionHeading>Provider Probe</SectionHeading>
        <form
          className="mt-4 space-y-4"
          onSubmit={form.handleSubmit((values) => providerMutation.mutate(values))}
        >
          <label className="block text-sm text-[color:var(--text-secondary)]">
            Endpoint
            <input
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
              {...form.register("endpoint")}
            />
          </label>
          <label className="block text-sm text-[color:var(--text-secondary)]">
            Model
            <input
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
              {...form.register("model")}
            />
          </label>
          <label className="block text-sm text-[color:var(--text-secondary)]">
            API Key
            <input
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
              type="password"
              {...form.register("apiKey")}
            />
          </label>
          <button
            className="w-full rounded-2xl bg-[linear-gradient(135deg,#f97316,#fbbf24)] px-4 py-3 text-sm font-semibold text-slate-950"
            type="submit"
          >
            测试端点
          </button>
        </form>

        <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-[color:var(--text-secondary)]">
          {providerMutation.isPending && "正在探测 provider..."}
          {providerMutation.isSuccess && providerMutation.data.message}
          {providerMutation.isError &&
            (providerMutation.error instanceof Error
              ? providerMutation.error.message
              : "Provider probe failed")}
          {!providerMutation.isPending && !providerMutation.isSuccess && !providerMutation.isError
            ? "新推理网关会统一承接云端和本地兼容端点；这里已经切换到 typed schema。"
            : null}
        </div>
      </Card>
    </div>
  );
}
