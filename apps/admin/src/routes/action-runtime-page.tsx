import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ActionRuntimeOverview,
  ActionRuntimeRules,
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
  AdminEmptyState,
  AdminInfoRows,
  AdminPageHero,
  AdminRecordCard,
  AdminSectionHeader,
  AdminTextArea,
} from "../components/admin-workbench";
import { adminApi } from "../lib/admin-api";
import { resolveAdminCoreApiBaseUrl } from "../lib/core-api-base";

export function ActionRuntimePage() {
  const baseUrl = resolveAdminCoreApiBaseUrl();
  const queryClient = useQueryClient();
  const [rulesDraft, setRulesDraft] = useState<ActionRuntimeRules | null>(null);
  const [previewMessage, setPreviewMessage] = useState("");
  const [selectedRunId, setSelectedRunId] = useState("");

  const overviewQuery = useQuery({
    queryKey: ["admin-action-runtime-overview", baseUrl],
    queryFn: () => adminApi.getActionRuntimeOverview(),
  });

  useEffect(() => {
    if (!overviewQuery.data) {
      return;
    }
    setRulesDraft(overviewQuery.data.rules);
    if (!selectedRunId && overviewQuery.data.recentRuns[0]) {
      setSelectedRunId(overviewQuery.data.recentRuns[0].id);
    }
  }, [overviewQuery.data, selectedRunId]);

  const runDetailQuery = useQuery({
    queryKey: ["admin-action-runtime-run", baseUrl, selectedRunId],
    queryFn: () => adminApi.getActionRuntimeRun(selectedRunId),
    enabled: Boolean(selectedRunId),
  });

  const saveRulesMutation = useMutation({
    mutationFn: (payload: ActionRuntimeRules) =>
      adminApi.setActionRuntimeRules(payload),
    onSuccess: (nextRules) => {
      setRulesDraft(nextRules);
      void queryClient.invalidateQueries({
        queryKey: ["admin-action-runtime-overview", baseUrl],
      });
    },
  });

  const previewMutation = useMutation({
    mutationFn: (message: string) => adminApi.previewActionRuntime(message),
  });

  const connectorMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      status: "disabled" | "ready";
    }) =>
      adminApi.updateActionRuntimeConnector(payload.id, {
        status: payload.status,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["admin-action-runtime-overview", baseUrl],
      });
    },
  });

  const isRulesDirty = useMemo(() => {
    if (!rulesDraft || !overviewQuery.data) {
      return false;
    }
    return JSON.stringify(rulesDraft) !== JSON.stringify(overviewQuery.data.rules);
  }, [overviewQuery.data, rulesDraft]);

  if (overviewQuery.isLoading) {
    return <LoadingBlock label="正在读取 Action Runtime..." />;
  }

  if (overviewQuery.isError && overviewQuery.error instanceof Error) {
    return <ErrorBlock message={overviewQuery.error.message} />;
  }

  if (!overviewQuery.data || !rulesDraft) {
    return (
      <AdminEmptyState
        title="Action Runtime 暂不可用"
        description="稍后再刷新一次；如果持续为空，先检查后端 action-runtime 模块是否已成功加载。"
      />
    );
  }

  const overview = overviewQuery.data;

  return (
    <div className="space-y-6">
      <AdminPageHero
        eyebrow="Action Runtime"
        title="self 角色真实世界动作台"
        description="先围绕“我自己”角色打通真实世界动作能力。当前版本先跑 mock 连接器、澄清、确认和执行回执闭环，同时把规则和提示模板收口到后台。"
        metrics={[
          { label: "总动作数", value: overview.counts.totalRuns },
          { label: "待补参数", value: overview.counts.awaitingSlots },
          { label: "待确认", value: overview.counts.awaitingConfirmation },
          { label: "已就绪连接器", value: overview.counts.readyConnectors },
        ]}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                void queryClient.invalidateQueries({
                  queryKey: ["admin-action-runtime-overview", baseUrl],
                })
              }
            >
              刷新概览
            </Button>
            <Button
              variant="primary"
              disabled={!isRulesDirty || saveRulesMutation.isPending}
              onClick={() => saveRulesMutation.mutate(rulesDraft)}
            >
              {saveRulesMutation.isPending ? "保存中..." : "保存规则"}
            </Button>
          </>
        }
      />

      {saveRulesMutation.isSuccess ? (
        <AdminActionFeedback
          tone="success"
          title="Action Runtime 规则已保存"
          description="新的提示模板和门控策略已经写入系统配置。"
        />
      ) : null}
      {saveRulesMutation.isError && saveRulesMutation.error instanceof Error ? (
        <ErrorBlock message={saveRulesMutation.error.message} />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <Card className="bg-[color:var(--surface-console)]">
            <AdminSectionHeader
              title="运行总览"
              actions={
                overview.selfCharacter ? (
                  <StatusPill tone="healthy">
                    self 角色：{overview.selfCharacter.name}
                  </StatusPill>
                ) : (
                  <StatusPill tone="warning">缺少 self 角色</StatusPill>
                )
              }
            />
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <MetricCard label="Planner" value={overview.rules.plannerMode} />
              <MetricCard
                label="自动执行风险等级"
                value={overview.rules.policy.autoExecuteRiskLevels.join(" / ") || "无"}
              />
              <MetricCard
                label="确认关键词数"
                value={overview.rules.policy.confirmationKeywords.length}
              />
            </div>
            <div className="mt-4">
              <AdminInfoRows
                title="当前门控"
                rows={[
                  {
                    label: "动作入口",
                    value: overview.rules.policy.enabled ? "已启用" : "已关闭",
                  },
                  {
                    label: "仅 self 角色",
                    value: overview.rules.policy.selfRoleOnly ? "是" : "否",
                  },
                  {
                    label: "可信自动执行操作",
                    value:
                      overview.rules.policy.trustedOperationKeys.join(" / ") || "无",
                  },
                ]}
              />
            </div>
          </Card>

          <Card className="bg-[color:var(--surface-console)]">
            <AdminSectionHeader
              title="规则与提示模板"
              actions={
                <StatusPill tone={isRulesDirty ? "warning" : "muted"}>
                  {isRulesDirty ? "草稿未保存" : "已同步"}
                </StatusPill>
              }
            />
            <div className="mt-4 grid gap-4">
              <AdminTextArea
                label="Planner Prompt"
                value={rulesDraft.promptTemplates.plannerSystemPrompt}
                onChange={(value) =>
                  setRulesDraft((current) =>
                    current
                      ? {
                          ...current,
                          promptTemplates: {
                            ...current.promptTemplates,
                            plannerSystemPrompt: value,
                          },
                        }
                      : current,
                  )
                }
                textareaClassName="min-h-36"
              />
              <AdminTextArea
                label="澄清模板"
                value={rulesDraft.promptTemplates.clarificationTemplate}
                onChange={(value) =>
                  setRulesDraft((current) =>
                    current
                      ? {
                          ...current,
                          promptTemplates: {
                            ...current.promptTemplates,
                            clarificationTemplate: value,
                          },
                        }
                      : current,
                  )
                }
              />
              <AdminTextArea
                label="确认模板"
                value={rulesDraft.promptTemplates.confirmationTemplate}
                onChange={(value) =>
                  setRulesDraft((current) =>
                    current
                      ? {
                          ...current,
                          promptTemplates: {
                            ...current.promptTemplates,
                            confirmationTemplate: value,
                          },
                        }
                      : current,
                  )
                }
              />
              <div className="grid gap-4 xl:grid-cols-2">
                <AdminTextArea
                  label="成功模板"
                  value={rulesDraft.promptTemplates.successTemplate}
                  onChange={(value) =>
                    setRulesDraft((current) =>
                      current
                        ? {
                            ...current,
                            promptTemplates: {
                              ...current.promptTemplates,
                              successTemplate: value,
                            },
                          }
                        : current,
                    )
                  }
                />
                <AdminTextArea
                  label="失败模板"
                  value={rulesDraft.promptTemplates.failureTemplate}
                  onChange={(value) =>
                    setRulesDraft((current) =>
                      current
                        ? {
                            ...current,
                            promptTemplates: {
                              ...current.promptTemplates,
                              failureTemplate: value,
                            },
                          }
                        : current,
                    )
                  }
                />
              </div>
            </div>
          </Card>

          <Card className="bg-[color:var(--surface-console)]">
            <AdminSectionHeader
              title="消息预演"
              actions={
                <Button
                  variant="primary"
                  disabled={!previewMessage.trim() || previewMutation.isPending}
                  onClick={() => previewMutation.mutate(previewMessage.trim())}
                >
                  {previewMutation.isPending ? "预演中..." : "运行预演"}
                </Button>
              }
            />
            <div className="mt-4">
              <AdminTextArea
                label="候选消息"
                value={previewMessage}
                onChange={setPreviewMessage}
                placeholder="例如：帮我把客厅空调调到 24 度，或者今晚给我点个 40 块以内的轻食外卖。"
              />
            </div>
            {previewMutation.isError && previewMutation.error instanceof Error ? (
              <ErrorBlock className="mt-4" message={previewMutation.error.message} />
            ) : null}
            {previewMutation.data ? (
              <div className="mt-4 space-y-4">
                <AdminRecordCard
                  title={previewMutation.data.handled ? "命中动作链" : "未命中动作链"}
                  badges={
                    <StatusPill tone={previewMutation.data.handled ? "healthy" : "muted"}>
                      {previewMutation.data.reason}
                    </StatusPill>
                  }
                  description={previewMutation.data.responsePreview ?? "当前消息会继续走普通聊天链路。"}
                />
                {previewMutation.data.plan ? (
                  <AdminCodeBlock value={prettyJson(previewMutation.data.plan)} />
                ) : null}
              </div>
            ) : null}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-[color:var(--surface-console)]">
            <AdminSectionHeader title="连接器" />
            <div className="mt-4 space-y-3">
              {overview.connectors.map((connector) => {
                const isBusy =
                  connectorMutation.isPending &&
                  connectorMutation.variables?.id === connector.id;
                return (
                  <AdminRecordCard
                    key={connector.id}
                    title={connector.displayName}
                    badges={
                      <StatusPill tone={resolveConnectorTone(connector.status)}>
                        {connector.status}
                      </StatusPill>
                    }
                    meta={`${connector.connectorKey} · ${connector.providerType}`}
                    description={connector.capabilities
                      .map((item) => `${item.label}(${item.riskLevel})`)
                      .join(" / ")}
                    details={<AdminCodeBlock value={prettyJson(connector.endpointConfig ?? {})} />}
                    actions={
                      <>
                        <Button
                          variant="secondary"
                          disabled={isBusy || connector.status === "ready"}
                          onClick={() =>
                            connectorMutation.mutate({
                              id: connector.id,
                              status: "ready",
                            })
                          }
                        >
                          {isBusy && connectorMutation.variables?.status === "ready"
                            ? "启用中..."
                            : "启用"}
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={isBusy || connector.status === "disabled"}
                          onClick={() =>
                            connectorMutation.mutate({
                              id: connector.id,
                              status: "disabled",
                            })
                          }
                        >
                          {isBusy && connectorMutation.variables?.status === "disabled"
                            ? "停用中..."
                            : "停用"}
                        </Button>
                      </>
                    }
                  />
                );
              })}
            </div>
          </Card>

          <Card className="bg-[color:var(--surface-console)]">
            <AdminSectionHeader title="最近动作运行" />
            {overview.recentRuns.length ? (
              <div className="mt-4 space-y-3">
                {overview.recentRuns.map((run) => (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => setSelectedRunId(run.id)}
                    className={[
                      "w-full rounded-[18px] border p-4 text-left transition",
                      selectedRunId === run.id
                        ? "border-[color:var(--brand-primary)] bg-white shadow-[var(--shadow-soft)]"
                        : "border-[color:var(--border-faint)] bg-[color:var(--surface-card)] hover:border-[color:var(--border-subtle)]",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-[color:var(--text-primary)]">
                        {run.title}
                      </div>
                      <StatusPill tone={resolveRunTone(run.status)}>
                        {run.status}
                      </StatusPill>
                    </div>
                    <div className="mt-2 text-xs text-[color:var(--text-muted)]">
                      {run.connectorKey} · {run.operationKey} · {formatDateTime(run.updatedAt)}
                    </div>
                    <div className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
                      {run.resultSummary ?? run.userGoal}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <AdminEmptyState
                title="还没有动作运行记录"
                description="等 self 会话里第一次命中动作链后，这里会出现澄清、确认和执行轨迹。"
                className="mt-4"
              />
            )}
          </Card>

          <Card className="bg-[color:var(--surface-console)]">
            <AdminSectionHeader title="动作详情" />
            {!selectedRunId ? (
              <AdminEmptyState
                title="还没有选中动作"
                description="点左侧任意一条最近动作运行记录，这里会展示完整 trace。"
                className="mt-4"
              />
            ) : runDetailQuery.isLoading ? (
              <LoadingBlock label="正在读取动作详情..." />
            ) : runDetailQuery.isError && runDetailQuery.error instanceof Error ? (
              <ErrorBlock message={runDetailQuery.error.message} />
            ) : runDetailQuery.data ? (
              <div className="mt-4 space-y-4">
                <AdminInfoRows
                  title="当前状态"
                  rows={[
                    { label: "标题", value: runDetailQuery.data.title },
                    { label: "状态", value: runDetailQuery.data.status },
                    { label: "风险等级", value: runDetailQuery.data.riskLevel },
                    {
                      label: "更新时间",
                      value: formatDateTime(runDetailQuery.data.updatedAt),
                    },
                  ]}
                />
                <AdminCodeBlock value={prettyJson(runDetailQuery.data.planPayload ?? {})} />
                <AdminCodeBlock value={prettyJson(runDetailQuery.data.tracePayload ?? {})} />
                <AdminCodeBlock value={prettyJson(runDetailQuery.data.resultPayload ?? {})} />
              </div>
            ) : (
              <AdminEmptyState
                title="动作详情暂不可用"
                description="刷新一次概览；如果仍然为空，说明当前动作还没写入详情。"
                className="mt-4"
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function prettyJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "未记录";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveConnectorTone(status: ActionRuntimeOverview["connectors"][number]["status"]) {
  if (status === "ready") {
    return "healthy" as const;
  }
  if (status === "error") {
    return "warning" as const;
  }
  return "muted" as const;
}

function resolveRunTone(status: ActionRuntimeOverview["recentRuns"][number]["status"]) {
  if (status === "succeeded") {
    return "healthy" as const;
  }
  if (status === "failed" || status === "awaiting_confirmation") {
    return "warning" as const;
  }
  return "muted" as const;
}
