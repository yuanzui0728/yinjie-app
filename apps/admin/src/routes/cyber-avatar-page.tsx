import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CyberAvatarRunDetail,
  CyberAvatarRunSummary,
  CyberAvatarRuntimeRules,
  CyberAvatarSignal,
} from "@yinjie/contracts";
import {
  Button,
  Card,
  ErrorBlock,
  LoadingBlock,
  MetricCard,
  SectionHeading,
  StatusPill,
} from "@yinjie/ui";
import {
  AdminActionFeedback,
  AdminCodeBlock,
  AdminDraftStatusPill,
  AdminEmptyState,
  AdminInfoRows,
  AdminRecordCard,
  AdminSectionHeader,
} from "../components/admin-workbench";
import { adminApi } from "../lib/admin-api";
import { resolveAdminCoreApiBaseUrl } from "../lib/core-api-base";

function safePrettyJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "暂无";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("zh-CN", { hour12: false });
}

function resolveRunTone(status: CyberAvatarRunSummary["status"]) {
  if (status === "success") {
    return "healthy" as const;
  }
  if (status === "failed" || status === "partial") {
    return "warning" as const;
  }
  return "muted" as const;
}

function resolveSignalTone(status: CyberAvatarSignal["status"]) {
  if (status === "merged") {
    return "healthy" as const;
  }
  if (status === "failed") {
    return "warning" as const;
  }
  return "muted" as const;
}

export function CyberAvatarPage() {
  const baseUrl = resolveAdminCoreApiBaseUrl();
  const queryClient = useQueryClient();
  const [rulesJsonDraft, setRulesJsonDraft] = useState("");
  const [selectedRunId, setSelectedRunId] = useState("");
  const [rulesParseError, setRulesParseError] = useState("");

  const overviewQuery = useQuery({
    queryKey: ["admin-cyber-avatar-overview", baseUrl],
    queryFn: () => adminApi.getCyberAvatarOverview(),
  });

  const overviewRulesJson = useMemo(
    () => (overviewQuery.data ? safePrettyJson(overviewQuery.data.rules) : ""),
    [overviewQuery.data],
  );

  useEffect(() => {
    if (!overviewQuery.data) {
      return;
    }

    if (!rulesJsonDraft.trim()) {
      setRulesJsonDraft(overviewRulesJson);
    }

    if (!selectedRunId && overviewQuery.data.recentRuns[0]) {
      setSelectedRunId(overviewQuery.data.recentRuns[0].id);
    }
  }, [overviewQuery.data, overviewRulesJson, rulesJsonDraft, selectedRunId]);

  const runDetailQuery = useQuery({
    queryKey: ["admin-cyber-avatar-run", baseUrl, selectedRunId],
    queryFn: () => adminApi.getCyberAvatarRun(selectedRunId),
    enabled: Boolean(selectedRunId),
  });

  const saveRulesMutation = useMutation({
    mutationFn: (payload: CyberAvatarRuntimeRules) =>
      adminApi.setCyberAvatarRules(payload),
    onSuccess: (nextRules) => {
      setRulesJsonDraft(safePrettyJson(nextRules));
      setRulesParseError("");
      void queryClient.invalidateQueries({
        queryKey: ["admin-cyber-avatar-overview", baseUrl],
      });
    },
  });

  const runMutation = useMutation({
    mutationFn: (mode: "incremental" | "deep_refresh" | "full_rebuild" | "project") => {
      if (mode === "incremental") {
        return adminApi.runCyberAvatarIncremental();
      }
      if (mode === "deep_refresh") {
        return adminApi.runCyberAvatarDeepRefresh();
      }
      if (mode === "full_rebuild") {
        return adminApi.runCyberAvatarFullRebuild();
      }
      return adminApi.runCyberAvatarProjection();
    },
    onSuccess: async (result) => {
      setSelectedRunId(result.id);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-cyber-avatar-overview", baseUrl],
        }),
        queryClient.invalidateQueries({
          queryKey: ["admin-cyber-avatar-run", baseUrl, result.id],
        }),
      ]);
    },
  });

  const parsedRules = useMemo(() => {
    if (!rulesJsonDraft.trim()) {
      return null;
    }

    try {
      return JSON.parse(rulesJsonDraft) as CyberAvatarRuntimeRules;
    } catch {
      return null;
    }
  }, [rulesJsonDraft]);

  const isRulesDirty = useMemo(() => {
    if (!overviewRulesJson) {
      return false;
    }

    return rulesJsonDraft.trim() !== overviewRulesJson;
  }, [overviewRulesJson, rulesJsonDraft]);

  if (overviewQuery.isLoading) {
    return <LoadingBlock label="正在读取赛博分身概览..." />;
  }

  if (overviewQuery.isError && overviewQuery.error instanceof Error) {
    return <ErrorBlock message={overviewQuery.error.message} />;
  }

  if (!overviewQuery.data) {
    return (
      <AdminEmptyState
        title="赛博分身概览暂不可用"
        description="后台还没有拿到画像、规则或运行记录。先检查后端 cyber-avatar 模块是否已成功加载。"
      />
    );
  }

  const overview = overviewQuery.data;
  const profile = overview.profile;
  const activeRun = runDetailQuery.data;

  function handleSaveRules() {
    if (!parsedRules) {
      setRulesParseError("规则 JSON 解析失败，先修正格式再保存。");
      return;
    }

    setRulesParseError("");
    saveRulesMutation.mutate(parsedRules);
  }

  return (
    <div className="space-y-6">
      <Card className="bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(242,252,247,0.96)_45%,rgba(253,246,236,0.94))]">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--text-muted)]">
              Cyber Avatar
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-[color:var(--text-primary)]">
              用户行为建模与 Prompt 投影
            </h2>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
              当前阶段只实现“行为信号采集、画像增量刷新、深度重建、Prompt 投影”链路。
              世界内交互和真实世界交互执行层暂时不在这里落地。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() =>
                void queryClient.invalidateQueries({
                  queryKey: ["admin-cyber-avatar-overview", baseUrl],
                })
              }
            >
              刷新概览
            </Button>
            <Button
              variant="primary"
              disabled={!isRulesDirty || !parsedRules || saveRulesMutation.isPending}
              onClick={handleSaveRules}
            >
              {saveRulesMutation.isPending ? "保存中..." : "保存规则"}
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="画像版本" value={profile.version} />
          <MetricCard label="总信号数" value={profile.signalCount} />
          <MetricCard label="待处理信号" value={profile.pendingSignalCount} />
          <MetricCard
            label="最近构建时间"
            value={profile.lastBuiltAt ? formatDateTime(profile.lastBuiltAt) : "暂无"}
          />
        </div>
      </Card>

      {saveRulesMutation.isSuccess ? (
        <AdminActionFeedback
          tone="success"
          title="赛博分身规则已保存"
          description="新的抓取开关、调度参数和提示词模板已经写入系统配置。"
        />
      ) : null}
      {saveRulesMutation.isError && saveRulesMutation.error instanceof Error ? (
        <ErrorBlock message={saveRulesMutation.error.message} />
      ) : null}
      {rulesParseError ? <ErrorBlock message={rulesParseError} /> : null}
      {runMutation.isSuccess ? (
        <AdminActionFeedback
          tone="success"
          title={`运行已完成：${runMutation.data.mode}`}
          description={`状态 ${runMutation.data.status}，处理了 ${runMutation.data.signalCount} 条信号。`}
        />
      ) : null}
      {runMutation.isError && runMutation.error instanceof Error ? (
        <ErrorBlock message={runMutation.error.message} />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <Card className="bg-[color:var(--surface-console)]">
            <AdminSectionHeader
              title="画像概览"
              actions={
                <StatusPill tone={profile.status === "ready" ? "healthy" : "warning"}>
                  {profile.status}
                </StatusPill>
              }
            />
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <MetricCard label="liveState 置信度" value={profile.confidence.liveState.toFixed(2)} />
              <MetricCard label="recentState 置信度" value={profile.confidence.recentState.toFixed(2)} />
              <MetricCard label="stableCore 置信度" value={profile.confidence.stableCore.toFixed(2)} />
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <AdminInfoRows
                title="构建状态"
                rows={[
                  { label: "最后信号时间", value: formatDateTime(profile.lastSignalAt) },
                  { label: "最后投影时间", value: formatDateTime(profile.lastProjectedAt) },
                  { label: "最后运行 ID", value: profile.lastRunId ?? "暂无" },
                  { label: "覆盖窗口", value: `${profile.sourceCoverage.windowDays} 天` },
                ]}
              />
              <AdminInfoRows
                title="信号覆盖"
                rows={[
                  {
                    label: "覆盖面",
                    value: profile.sourceCoverage.coveredSurfaces.join(" / ") || "暂无",
                  },
                  {
                    label: "缺失面",
                    value: profile.sourceCoverage.missingSurfaces.join(" / ") || "暂无",
                  },
                  {
                    label: "当前 focus",
                    value: profile.liveState.focus.join(" / ") || "暂无",
                  },
                  {
                    label: "活跃主题",
                    value: profile.liveState.activeTopics.join(" / ") || "暂无",
                  },
                ]}
              />
            </div>
          </Card>

          <Card className="bg-[color:var(--surface-console)]">
            <AdminSectionHeader
              title="Prompt Projection"
              actions={<StatusPill tone="muted">当前输出</StatusPill>}
            />
            <div className="mt-4 space-y-4">
              <ProjectionBlock
                title="Core Instruction"
                value={profile.promptProjection.coreInstruction}
              />
              <div className="grid gap-4 xl:grid-cols-2">
                <ProjectionBlock
                  title="World Interaction"
                  value={profile.promptProjection.worldInteractionPrompt}
                />
                <ProjectionBlock
                  title="Real World Interaction"
                  value={profile.promptProjection.realWorldInteractionPrompt}
                />
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <ProjectionBlock
                  title="Proactive Prompt"
                  value={profile.promptProjection.proactivePrompt}
                />
                <ProjectionBlock
                  title="Action Planning Prompt"
                  value={profile.promptProjection.actionPlanningPrompt}
                />
              </div>
              <ProjectionBlock
                title="Memory Block"
                value={profile.promptProjection.memoryBlock}
              />
            </div>
          </Card>

          <Card className="bg-[color:var(--surface-console)]">
            <AdminSectionHeader
              title="规则与提示词配置"
              actions={<AdminDraftStatusPill ready dirty={isRulesDirty} />}
            />
            <div className="mt-4">
              <textarea
                value={rulesJsonDraft}
                onChange={(event) => {
                  setRulesJsonDraft(event.target.value);
                  if (rulesParseError) {
                    setRulesParseError("");
                  }
                }}
                spellCheck={false}
                className="min-h-[560px] w-full rounded-[20px] border border-[color:var(--border-faint)] bg-white/90 px-4 py-4 font-mono text-xs leading-6 text-[color:var(--text-secondary)] outline-none transition focus:border-[color:var(--border-brand)]"
              />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-[color:var(--surface-console)]">
            <AdminSectionHeader title="手动运行" />
            <div className="mt-4 grid gap-3">
              <Button
                variant="primary"
                disabled={runMutation.isPending}
                onClick={() => runMutation.mutate("incremental")}
              >
                {runMutation.isPending && runMutation.variables === "incremental"
                  ? "执行中..."
                  : "跑一次增量刷新"}
              </Button>
              <Button
                variant="secondary"
                disabled={runMutation.isPending}
                onClick={() => runMutation.mutate("deep_refresh")}
              >
                {runMutation.isPending && runMutation.variables === "deep_refresh"
                  ? "执行中..."
                  : "跑一次深度刷新"}
              </Button>
              <Button
                variant="secondary"
                disabled={runMutation.isPending}
                onClick={() => runMutation.mutate("full_rebuild")}
              >
                {runMutation.isPending && runMutation.variables === "full_rebuild"
                  ? "执行中..."
                  : "全量重建"}
              </Button>
              <Button
                variant="secondary"
                disabled={runMutation.isPending}
                onClick={() => runMutation.mutate("project")}
              >
                {runMutation.isPending && runMutation.variables === "project"
                  ? "执行中..."
                  : "只重投影 Prompt"}
              </Button>
            </div>
          </Card>

          <Card className="bg-[color:var(--surface-console)]">
            <AdminSectionHeader title="最近运行" />
            <div className="mt-4 space-y-3">
              {overview.recentRuns.length ? (
                overview.recentRuns.map((run) => (
                  <AdminRecordCard
                    key={run.id}
                    title={`${run.mode} · v${run.profileVersion}`}
                    badges={<StatusPill tone={resolveRunTone(run.status)}>{run.status}</StatusPill>}
                    meta={`触发方式 ${run.trigger} · ${formatDateTime(run.createdAt)}`}
                    description={`处理信号 ${run.signalCount} 条${run.skipReason ? ` · 跳过原因 ${run.skipReason}` : ""}`}
                    actions={
                      <Button
                        variant={selectedRunId === run.id ? "primary" : "secondary"}
                        size="sm"
                        onClick={() => setSelectedRunId(run.id)}
                      >
                        查看详情
                      </Button>
                    }
                    className={selectedRunId === run.id ? "border-[color:var(--border-brand)]" : undefined}
                  />
                ))
              ) : (
                <AdminEmptyState
                  title="还没有运行记录"
                  description="先手动跑一次增量刷新或深度刷新，后台才会留下可观测的 run 快照。"
                />
              )}
            </div>
          </Card>

          <Card className="bg-[color:var(--surface-console)]">
            <AdminSectionHeader title="最近信号" />
            <div className="mt-4 space-y-3">
              {overview.recentSignals.length ? (
                overview.recentSignals.map((signal) => (
                  <AdminRecordCard
                    key={signal.id}
                    title={`${signal.signalType} · ${signal.sourceSurface}`}
                    badges={<StatusPill tone={resolveSignalTone(signal.status)}>{signal.status}</StatusPill>}
                    meta={`${formatDateTime(signal.occurredAt)} · weight ${signal.weight}`}
                    description={signal.summaryText}
                    details={
                      signal.payload ? (
                        <AdminCodeBlock
                          value={safePrettyJson(signal.payload)}
                          className="max-h-56 overflow-y-auto"
                        />
                      ) : undefined
                    }
                  />
                ))
              ) : (
                <AdminEmptyState
                  title="还没有行为信号"
                  description="等用户产生聊天、朋友圈、广场或社交操作之后，这里会开始积累赛博分身的输入证据。"
                />
              )}
            </div>
          </Card>

          <Card className="bg-[color:var(--surface-console)]">
            <AdminSectionHeader
              title="运行详情"
              actions={
                activeRun ? (
                  <StatusPill tone={resolveRunTone(activeRun.status)}>
                    {activeRun.status}
                  </StatusPill>
                ) : null
              }
            />
            <div className="mt-4">
              {runDetailQuery.isLoading ? (
                <LoadingBlock label="正在读取 run 详情..." />
              ) : runDetailQuery.isError && runDetailQuery.error instanceof Error ? (
                <ErrorBlock message={runDetailQuery.error.message} />
              ) : activeRun ? (
                <CyberAvatarRunDetailPanel detail={activeRun} />
              ) : (
                <AdminEmptyState
                  title="未选择运行记录"
                  description="从上面的最近运行里点开一条，就能看到输入快照、聚合结果、提示词和 merge diff。"
                />
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ProjectionBlock({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <SectionHeading>{title}</SectionHeading>
      <div className="mt-3">
        <AdminCodeBlock value={value || "暂无"} />
      </div>
    </div>
  );
}

function CyberAvatarRunDetailPanel({ detail }: { detail: CyberAvatarRunDetail }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <MetricCard label="模式" value={detail.mode} />
        <MetricCard label="处理信号" value={detail.signalCount} />
      </div>
      <AdminInfoRows
        title="执行摘要"
        rows={[
          { label: "触发方式", value: detail.trigger },
          { label: "画像版本", value: detail.profileVersion },
          { label: "开始窗口", value: formatDateTime(detail.windowStartedAt) },
          { label: "结束窗口", value: formatDateTime(detail.windowEndedAt) },
          { label: "跳过原因", value: detail.skipReason ?? "无" },
          { label: "错误信息", value: detail.errorMessage ?? "无" },
        ]}
      />
      <div className="space-y-4">
        <RunSnapshotBlock title="Input Snapshot" value={detail.inputSnapshot} />
        <RunSnapshotBlock title="Aggregation Payload" value={detail.aggregationPayload} />
        <RunSnapshotBlock title="Prompt Snapshot" value={detail.promptSnapshot} />
        <RunSnapshotBlock title="LLM Output Payload" value={detail.llmOutputPayload} />
        <RunSnapshotBlock title="Merge Diff" value={detail.mergeDiffPayload} />
      </div>
    </div>
  );
}

function RunSnapshotBlock({
  title,
  value,
}: {
  title: string;
  value: Record<string, unknown> | null | undefined;
}) {
  return (
    <div>
      <SectionHeading>{title}</SectionHeading>
      <div className="mt-3">
        <AdminCodeBlock value={value ? safePrettyJson(value) : "暂无"} />
      </div>
    </div>
  );
}
