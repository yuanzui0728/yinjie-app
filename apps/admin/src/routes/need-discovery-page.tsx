import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  NeedDiscoveryCandidateRecord,
  NeedDiscoveryConfig,
  NeedDiscoveryRunRecord,
  ShakeDiscoveryConfig,
  ShakeDiscoverySessionRecord,
} from "@yinjie/contracts";
import {
  DEFAULT_SHAKE_DISCOVERY_CONFIG,
  runSchedulerJob,
  SHAKE_DISCOVERY_CONFIG_KEY,
  SHAKE_DISCOVERY_SESSIONS_KEY,
} from "@yinjie/contracts";
import {
  Button,
  Card,
  ErrorBlock,
  LoadingBlock,
  SectionHeading,
  StatusPill,
} from "@yinjie/ui";
import {
  AdminPageHero,
  AdminSectionHeader,
} from "../components/admin-workbench";
import { adminApi } from "../lib/admin-api";
import { resolveAdminCoreApiBaseUrl } from "../lib/core-api-base";

export function NeedDiscoveryPage() {
  const baseUrl = resolveAdminCoreApiBaseUrl();
  const queryClient = useQueryClient();
  const overviewQuery = useQuery({
    queryKey: ["admin-need-discovery", baseUrl],
    queryFn: () => adminApi.getNeedDiscoveryOverview(),
  });
  const shakeStoreQuery = useQuery({
    queryKey: ["admin-shake-discovery-store", baseUrl],
    queryFn: () => adminApi.getConfig(),
  });
  const [draft, setDraft] = useState<NeedDiscoveryConfig | null>(null);
  const [shakeDraft, setShakeDraft] = useState<ShakeDiscoveryConfig | null>(
    null,
  );
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!overviewQuery.data) {
      return;
    }
    setDraft(overviewQuery.data.config);
  }, [overviewQuery.data]);

  useEffect(() => {
    if (!shakeStoreQuery.data) {
      return;
    }
    setShakeDraft(
      parseShakeDiscoveryConfig(
        shakeStoreQuery.data[SHAKE_DISCOVERY_CONFIG_KEY],
      ),
    );
  }, [shakeStoreQuery.data]);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const timer = window.setTimeout(() => setNotice(""), 2500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const [needConfig] = await Promise.all([
        adminApi.setNeedDiscoveryConfig(draft ?? {}),
        adminApi.setConfig(
          SHAKE_DISCOVERY_CONFIG_KEY,
          JSON.stringify(shakeDraft ?? DEFAULT_SHAKE_DISCOVERY_CONFIG),
        ),
      ]);
      return needConfig;
    },
    onSuccess: async (config) => {
      setDraft(config);
      setNotice("需求发现配置已保存。");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-need-discovery", baseUrl],
        }),
        queryClient.invalidateQueries({
          queryKey: ["admin-shake-discovery-store", baseUrl],
        }),
      ]);
    },
  });

  const runMutation = useMutation({
    mutationFn: (jobId: string) => runSchedulerJob(jobId, baseUrl),
    onSuccess: async () => {
      setNotice("需求发现调度已执行。");
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-need-discovery", baseUrl],
        }),
        queryClient.invalidateQueries({
          queryKey: ["admin-scheduler-status", baseUrl],
        }),
      ]);
    },
  });

  const shakeSessions = useMemo(
    () =>
      parseShakeDiscoverySessions(
        shakeStoreQuery.data?.[SHAKE_DISCOVERY_SESSIONS_KEY],
      ),
    [shakeStoreQuery.data],
  );

  const metrics = useMemo(
    () => [
      {
        label: "待处理候选",
        value: overviewQuery.data?.stats.pendingCandidates ?? 0,
      },
      {
        label: "已接受角色",
        value: overviewQuery.data?.stats.acceptedCandidates ?? 0,
      },
      {
        label: "休眠角色",
        value: overviewQuery.data?.stats.dormantCharacters ?? 0,
      },
      {
        label: "最近运行",
        value: overviewQuery.data?.recentRuns.length ?? 0,
      },
      {
        label: "摇一摇保留",
        value: shakeSessions.filter((item) => item.status === "kept").length,
      },
    ],
    [overviewQuery.data, shakeSessions],
  );

  if (overviewQuery.isLoading && !overviewQuery.data) {
    return <LoadingBlock label="正在读取需求发现配置..." />;
  }

  if (overviewQuery.isError && overviewQuery.error instanceof Error) {
    return (
      <ErrorBlock message={overviewQuery.error.message} />
    );
  }

  if (shakeStoreQuery.isError && shakeStoreQuery.error instanceof Error) {
    return <ErrorBlock message={shakeStoreQuery.error.message} />;
  }

  if (!overviewQuery.data || !draft || !shakeDraft) {
    return <LoadingBlock label="正在读取需求发现与摇一摇配置..." />;
  }

  return (
    <div className="space-y-6">
      <AdminPageHero
        eyebrow="需求发现"
        title="角色缺口识别与自动加友"
        description="同一页同时管理系统自动补位和用户手动摇一摇。前者解决长期角色缺口，后者负责即时相遇与保留决策。"
        metrics={metrics}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                runMutation.mutate("discover_need_characters_short_interval")
              }
              disabled={runMutation.isPending}
            >
              立即跑短周期
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => runMutation.mutate("discover_need_characters_daily")}
              disabled={runMutation.isPending}
            >
              立即跑每日
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
            >
              保存配置
            </Button>
          </>
        }
      />

      {notice ? (
        <Card className="border border-emerald-200 bg-emerald-50/80 text-sm text-emerald-700">
          {notice}
        </Card>
      ) : null}
      {saveMutation.error instanceof Error ? (
        <ErrorBlock message={saveMutation.error.message} />
      ) : null}
      {runMutation.error instanceof Error ? (
        <ErrorBlock message={runMutation.error.message} />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.25fr,0.95fr]">
        <div className="space-y-6">
          <CadenceCard
            title="短周期策略"
            description="更看重最近一段时间的压力、症状、即时求助信号。"
            cadenceType="short"
            config={draft}
            onChange={setDraft}
          />
          <CadenceCard
            title="每日策略"
            description="更看重反复出现的主题、长期缺口和稳定角色位。"
            cadenceType="daily"
            config={draft}
            onChange={setDraft}
          />
          <SharedCard config={draft} onChange={setDraft} />
          <ShakeConfigCard config={shakeDraft} onChange={setShakeDraft} />
        </div>

        <div className="space-y-6">
          <RunListCard runs={overviewQuery.data.recentRuns} />
          <ShakeSessionListCard sessions={shakeSessions} />
          <ShakeLatestTraceCard session={shakeSessions[0] ?? null} />
          <CandidateListCard
            title="当前候选"
            emptyLabel="当前没有待处理的角色候选。"
            candidates={overviewQuery.data.activeCandidates}
          />
          <CandidateListCard
            title="最近候选"
            emptyLabel="最近还没有需求发现候选。"
            candidates={overviewQuery.data.recentCandidates}
          />
        </div>
      </div>
    </div>
  );
}

function ShakeConfigCard({
  config,
  onChange,
}: {
  config: ShakeDiscoveryConfig;
  onChange: (next: ShakeDiscoveryConfig) => void;
}) {
  return (
    <Card className="bg-[color:var(--surface-console)]">
      <AdminSectionHeader title="摇一摇即时生成" />
      <p className="mt-3 text-sm leading-6 text-[color:var(--text-secondary)]">
        这里控制用户手动摇一摇时的相遇逻辑。它和系统自动补位不同：先生成临时候选，用户点击添加后才真正进入世界。
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <ConfigCheckbox
          label="启用摇一摇生成"
          checked={config.enabled}
          onChange={(checked) =>
            onChange({
              ...config,
              enabled: checked,
            })
          }
        />
        <ConfigCheckbox
          label="要求已有赛博分身信号"
          checked={config.requireCyberAvatarSignals}
          onChange={(checked) =>
            onChange({
              ...config,
              requireCyberAvatarSignals: checked,
            })
          }
        />
        <ConfigNumber
          label="冷却分钟"
          value={config.cooldownMinutes}
          onChange={(value) =>
            onChange({
              ...config,
              cooldownMinutes: value,
            })
          }
        />
        <ConfigNumber
          label="会话有效期（分钟）"
          value={config.sessionExpiryMinutes}
          onChange={(value) =>
            onChange({
              ...config,
              sessionExpiryMinutes: value,
            })
          }
        />
        <ConfigNumber
          label="每日最多摇一摇"
          value={config.maxSessionsPerDay}
          onChange={(value) =>
            onChange({
              ...config,
              maxSessionsPerDay: value,
            })
          }
        />
        <ConfigNumber
          label="回看小时"
          value={config.evidenceWindowHours}
          onChange={(value) =>
            onChange({
              ...config,
              evidenceWindowHours: value,
            })
          }
        />
        <ConfigNumber
          label="最多证据条数"
          value={config.maxEvidenceItems}
          onChange={(value) =>
            onChange({
              ...config,
              maxEvidenceItems: value,
            })
          }
        />
        <ConfigNumber
          label="候选方向数"
          value={config.candidateDirectionCount}
          onChange={(value) =>
            onChange({
              ...config,
              candidateDirectionCount: value,
            })
          }
        />
        <ConfigNumber
          label="新鲜感权重"
          step={0.05}
          value={config.noveltyWeight}
          onChange={(value) =>
            onChange({
              ...config,
              noveltyWeight: value,
            })
          }
        />
        <ConfigNumber
          label="惊喜系数"
          step={0.05}
          value={config.surpriseWeight}
          onChange={(value) =>
            onChange({
              ...config,
              surpriseWeight: value,
            })
          }
        />
        <ConfigCheckbox
          label="允许医疗类角色"
          checked={config.allowMedical}
          onChange={(checked) =>
            onChange({
              ...config,
              allowMedical: checked,
            })
          }
        />
        <ConfigCheckbox
          label="允许法律类角色"
          checked={config.allowLegal}
          onChange={(checked) =>
            onChange({
              ...config,
              allowLegal: checked,
            })
          }
        />
        <ConfigCheckbox
          label="允许金融类角色"
          checked={config.allowFinance}
          onChange={(checked) =>
            onChange({
              ...config,
              allowFinance: checked,
            })
          }
        />
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-[color:var(--text-primary)]">
          方向规划提示词
        </span>
        <textarea
          value={config.planningPrompt}
          onChange={(event) =>
            onChange({
              ...config,
              planningPrompt: event.target.value,
            })
          }
          className="mt-2 min-h-[220px] w-full rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-card)] px-4 py-3 text-sm leading-6 text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--border-brand)]"
        />
      </label>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-[color:var(--text-primary)]">
          角色生成提示词
        </span>
        <textarea
          value={config.roleGenerationPrompt}
          onChange={(event) =>
            onChange({
              ...config,
              roleGenerationPrompt: event.target.value,
            })
          }
          className="mt-2 min-h-[260px] w-full rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-card)] px-4 py-3 text-sm leading-6 text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--border-brand)]"
        />
      </label>
    </Card>
  );
}

function CadenceCard({
  title,
  description,
  cadenceType,
  config,
  onChange,
}: {
  title: string;
  description: string;
  cadenceType: "short" | "daily";
  config: NeedDiscoveryConfig;
  onChange: (next: NeedDiscoveryConfig) => void;
}) {
  const cadence =
    cadenceType === "short" ? config.shortInterval : config.daily;

  return (
    <Card className="bg-[color:var(--surface-console)]">
      <AdminSectionHeader
        title={title}
        actions={
          <StatusPill tone={cadence.enabled ? "healthy" : "muted"}>
            {cadence.enabled ? "启用中" : "已停用"}
          </StatusPill>
        }
      />
      <p className="mt-3 text-sm leading-6 text-[color:var(--text-secondary)]">
        {description}
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <ConfigCheckbox
          label="启用该节奏"
          checked={cadence.enabled}
          onChange={(checked) =>
            onChange({
              ...config,
              [cadenceType === "short" ? "shortInterval" : "daily"]: {
                ...cadence,
                enabled: checked,
              },
            })
          }
        />
        <ConfigSelect
          label="执行模式"
          value={cadence.executionMode}
          options={[
            { value: "auto_send", label: "直接创建并发起好友申请" },
            { value: "dry_run", label: "只生成候选草稿" },
          ]}
          onChange={(value) =>
            onChange({
              ...config,
              [cadenceType === "short" ? "shortInterval" : "daily"]: {
                ...cadence,
                executionMode:
                  value === "dry_run" ? "dry_run" : "auto_send",
              },
            })
          }
        />
        {cadenceType === "short" ? (
          <>
            <ConfigNumber
              label="间隔分钟"
              value={config.shortInterval.intervalMinutes}
              onChange={(value) =>
                onChange({
                  ...config,
                  shortInterval: {
                    ...config.shortInterval,
                    intervalMinutes: value,
                  },
                })
              }
            />
            <ConfigNumber
              label="回看小时"
              value={config.shortInterval.lookbackHours}
              onChange={(value) =>
                onChange({
                  ...config,
                  shortInterval: {
                    ...config.shortInterval,
                    lookbackHours: value,
                  },
                })
              }
            />
            <ConfigCheckbox
              label="无新信号则跳过"
              checked={config.shortInterval.skipIfNoNewSignals}
              onChange={(checked) =>
                onChange({
                  ...config,
                  shortInterval: {
                    ...config.shortInterval,
                    skipIfNoNewSignals: checked,
                  },
                })
              }
            />
          </>
        ) : (
          <>
            <ConfigNumber
              label="执行小时"
              value={config.daily.runAtHour}
              onChange={(value) =>
                onChange({
                  ...config,
                  daily: { ...config.daily, runAtHour: value },
                })
              }
            />
            <ConfigNumber
              label="执行分钟"
              value={config.daily.runAtMinute}
              onChange={(value) =>
                onChange({
                  ...config,
                  daily: { ...config.daily, runAtMinute: value },
                })
              }
            />
            <ConfigNumber
              label="回看天数"
              value={config.daily.lookbackDays}
              onChange={(value) =>
                onChange({
                  ...config,
                  daily: { ...config.daily, lookbackDays: value },
                })
              }
            />
          </>
        )}
        <ConfigNumber
          label="单次最多候选"
          value={cadence.maxCandidatesPerRun}
          onChange={(value) =>
            onChange({
              ...config,
              [cadenceType === "short" ? "shortInterval" : "daily"]: {
                ...cadence,
                maxCandidatesPerRun: value,
              },
            })
          }
        />
        <ConfigNumber
          label="最低置信度"
          step={0.01}
          value={cadence.minConfidenceScore}
          onChange={(value) =>
            onChange({
              ...config,
              [cadenceType === "short" ? "shortInterval" : "daily"]: {
                ...cadence,
                minConfidenceScore: value,
              },
            })
          }
        />
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-[color:var(--text-primary)]">
          分析提示词
        </span>
        <textarea
          value={cadence.promptTemplate}
          onChange={(event) =>
            onChange({
              ...config,
              [cadenceType === "short" ? "shortInterval" : "daily"]: {
                ...cadence,
                promptTemplate: event.target.value,
              },
            })
          }
          className="mt-2 min-h-[260px] w-full rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-card)] px-4 py-3 text-sm leading-6 text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--border-brand)]"
        />
      </label>
    </Card>
  );
}

function SharedCard({
  config,
  onChange,
}: {
  config: NeedDiscoveryConfig;
  onChange: (next: NeedDiscoveryConfig) => void;
}) {
  const shared = config.shared;

  return (
    <Card className="bg-[color:var(--surface-console)]">
      <AdminSectionHeader title="共享约束" />
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <ConfigNumber
          label="待处理候选上限"
          value={shared.pendingCandidateLimit}
          onChange={(value) =>
            onChange({
              ...config,
              shared: { ...shared, pendingCandidateLimit: value },
            })
          }
        />
        <ConfigNumber
          label="每日创建上限"
          value={shared.dailyCreationLimit}
          onChange={(value) =>
            onChange({
              ...config,
              shared: { ...shared, dailyCreationLimit: value },
            })
          }
        />
        <ConfigNumber
          label="好友申请有效期（天）"
          value={shared.expiryDays}
          onChange={(value) =>
            onChange({
              ...config,
              shared: { ...shared, expiryDays: value },
            })
          }
        />
        <ConfigNumber
          label="短周期抑制期（天）"
          value={shared.shortSuppressionDays}
          onChange={(value) =>
            onChange({
              ...config,
              shared: { ...shared, shortSuppressionDays: value },
            })
          }
        />
        <ConfigNumber
          label="每日抑制期（天）"
          value={shared.dailySuppressionDays}
          onChange={(value) =>
            onChange({
              ...config,
              shared: { ...shared, dailySuppressionDays: value },
            })
          }
        />
        <ConfigNumber
          label="领域重叠阈值"
          step={0.05}
          value={shared.coverageDomainOverlapThreshold}
          onChange={(value) =>
            onChange({
              ...config,
              shared: {
                ...shared,
                coverageDomainOverlapThreshold: value,
              },
            })
          }
        />
        <ConfigCheckbox
          label="允许医疗类角色"
          checked={shared.allowMedical}
          onChange={(checked) =>
            onChange({
              ...config,
              shared: { ...shared, allowMedical: checked },
            })
          }
        />
        <ConfigCheckbox
          label="允许法律类角色"
          checked={shared.allowLegal}
          onChange={(checked) =>
            onChange({
              ...config,
              shared: { ...shared, allowLegal: checked },
            })
          }
        />
        <ConfigCheckbox
          label="允许金融类角色"
          checked={shared.allowFinance}
          onChange={(checked) =>
            onChange({
              ...config,
              shared: { ...shared, allowFinance: checked },
            })
          }
        />
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-[color:var(--text-primary)]">
          角色生成提示词
        </span>
        <textarea
          value={shared.roleGenerationPrompt}
          onChange={(event) =>
            onChange({
              ...config,
              shared: { ...shared, roleGenerationPrompt: event.target.value },
            })
          }
          className="mt-2 min-h-[280px] w-full rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-card)] px-4 py-3 text-sm leading-6 text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--border-brand)]"
        />
      </label>
    </Card>
  );
}

function RunListCard({ runs }: { runs: NeedDiscoveryRunRecord[] }) {
  return (
    <Card className="bg-[color:var(--surface-console)]">
      <AdminSectionHeader title="最近运行" />
      <div className="mt-4 space-y-3">
        {runs.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">
            还没有运行记录。
          </p>
        ) : (
          runs.map((run) => (
            <div
              key={run.id}
              className="rounded-2xl border border-[color:var(--border-faint)] bg-[color:var(--surface-card)] px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-[color:var(--text-primary)]">
                  {run.cadenceType === "short_interval" ? "短周期" : "每日"} ·{" "}
                  {formatDateTime(run.startedAt)}
                </div>
                <StatusPill tone={toneForRun(run.status)}>
                  {labelForRun(run.status)}
                </StatusPill>
              </div>
              <div className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">
                {run.summary || run.skipReason || "暂无摘要"}
              </div>
              <div className="mt-2 text-xs text-[color:var(--text-muted)]">
                信号 {run.signalCount} 条
                {run.selectedNeedKeys.length > 0
                  ? ` · 选中 ${run.selectedNeedKeys.join(" / ")}`
                  : ""}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function CandidateListCard({
  title,
  emptyLabel,
  candidates,
}: {
  title: string;
  emptyLabel: string;
  candidates: NeedDiscoveryCandidateRecord[];
}) {
  return (
    <Card className="bg-[color:var(--surface-console)]">
      <AdminSectionHeader title={title} />
      <div className="mt-4 space-y-3">
        {candidates.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">{emptyLabel}</p>
        ) : (
          candidates.map((candidate) => (
            <div
              key={candidate.id}
              className="rounded-2xl border border-[color:var(--border-faint)] bg-[color:var(--surface-card)] px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-[color:var(--text-primary)]">
                    {candidate.characterName || candidate.needCategory}
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--text-muted)]">
                    {candidate.needKey}
                  </div>
                </div>
                <StatusPill tone={toneForCandidate(candidate.status)}>
                  {labelForCandidate(candidate.status)}
                </StatusPill>
              </div>
              <div className="mt-3 text-sm leading-6 text-[color:var(--text-secondary)]">
                {candidate.coverageGapSummary || "暂无缺口摘要。"}
              </div>
              {candidate.evidenceHighlights.length > 0 ? (
                <div className="mt-2 text-xs leading-5 text-[color:var(--text-muted)]">
                  证据：{candidate.evidenceHighlights.join("；")}
                </div>
              ) : null}
              <div className="mt-2 text-xs text-[color:var(--text-muted)]">
                优先级 {candidate.priorityScore.toFixed(2)} · 置信度{" "}
                {candidate.confidenceScore.toFixed(2)} · 创建于{" "}
                {formatDateTime(candidate.createdAt)}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function ShakeSessionListCard({
  sessions,
}: {
  sessions: ShakeDiscoverySessionRecord[];
}) {
  return (
    <Card className="bg-[color:var(--surface-console)]">
      <AdminSectionHeader title="最近摇一摇" />
      <div className="mt-4 space-y-3">
        {sessions.length === 0 ? (
          <p className="text-sm text-[color:var(--text-muted)]">
            最近还没有摇一摇记录。
          </p>
        ) : (
          sessions.slice(0, 10).map((session) => (
            <div
              key={session.id}
              className="rounded-2xl border border-[color:var(--border-faint)] bg-[color:var(--surface-card)] px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-[color:var(--text-primary)]">
                    {session.character.name}
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--text-muted)]">
                    {session.character.relationship}
                  </div>
                </div>
                <StatusPill tone={toneForShakeStatus(session.status)}>
                  {labelForShakeStatus(session.status)}
                </StatusPill>
              </div>
              <div className="mt-3 text-sm leading-6 text-[color:var(--text-secondary)]">
                {session.matchReason || session.failureReason || "暂无说明。"}
              </div>
              {session.selectedDirection?.expertDomains?.length ? (
                <div className="mt-2 text-xs leading-5 text-[color:var(--text-muted)]">
                  方向：{session.selectedDirection.relationshipLabel} ·{" "}
                  {session.selectedDirection.expertDomains.join("、")}
                </div>
              ) : null}
              <div className="mt-2 text-xs text-[color:var(--text-muted)]">
                {formatDateTime(session.createdAt)}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

function ShakeLatestTraceCard({
  session,
}: {
  session: ShakeDiscoverySessionRecord | null;
}) {
  if (!session) {
    return null;
  }

  return (
    <Card className="bg-[color:var(--surface-console)]">
      <AdminSectionHeader title="最近摇一摇 Trace" />
      <div className="mt-4 space-y-4 text-sm">
        <div>
          <SectionHeading className="text-xs">方向规划提示词</SectionHeading>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-2xl border border-[color:var(--border-faint)] bg-[color:var(--surface-card)] px-4 py-3 text-xs leading-6 text-[color:var(--text-secondary)]">
            {session.planningPrompt || "暂无"}
          </pre>
        </div>
        <div>
          <SectionHeading className="text-xs">角色生成提示词</SectionHeading>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-2xl border border-[color:var(--border-faint)] bg-[color:var(--surface-card)] px-4 py-3 text-xs leading-6 text-[color:var(--text-secondary)]">
            {session.generationPrompt || "暂无"}
          </pre>
        </div>
      </div>
    </Card>
  );
}

function ConfigNumber({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[color:var(--text-primary)]">
        {label}
      </span>
      <input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-card)] px-3 py-2.5 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--border-brand)]"
      />
    </label>
  );
}

function ConfigSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[color:var(--text-primary)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-card)] px-3 py-2.5 text-sm text-[color:var(--text-primary)] outline-none transition focus:border-[color:var(--border-brand)]"
      >
        {options.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ConfigCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-[color:var(--border-faint)] bg-[color:var(--surface-card)] px-4 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4"
      />
      <span className="text-sm text-[color:var(--text-primary)]">{label}</span>
    </label>
  );
}

function toneForRun(status: NeedDiscoveryRunRecord["status"]) {
  if (status === "failed") {
    return "warning" as const;
  }
  return status === "success" ? ("healthy" as const) : ("muted" as const);
}

function labelForRun(status: NeedDiscoveryRunRecord["status"]) {
  if (status === "failed") {
    return "失败";
  }
  return status === "success" ? "成功" : "跳过";
}

function toneForCandidate(status: NeedDiscoveryCandidateRecord["status"]) {
  if (
    status === "declined" ||
    status === "expired" ||
    status === "generation_failed"
  ) {
    return "warning" as const;
  }
  if (status === "accepted") {
    return "healthy" as const;
  }
  return "muted" as const;
}

function labelForCandidate(status: NeedDiscoveryCandidateRecord["status"]) {
  switch (status) {
    case "friend_request_pending":
      return "待通过";
    case "accepted":
      return "已接受";
    case "declined":
      return "已拒绝";
    case "expired":
      return "已过期";
    case "deleted":
      return "已删除";
    case "generation_failed":
      return "生成失败";
    default:
      return "草稿";
  }
}

function toneForShakeStatus(status: ShakeDiscoverySessionRecord["status"]) {
  if (status === "kept" || status === "preview_ready") {
    return "healthy" as const;
  }
  if (status === "failed") {
    return "warning" as const;
  }
  return "muted" as const;
}

function labelForShakeStatus(status: ShakeDiscoverySessionRecord["status"]) {
  switch (status) {
    case "preview_ready":
      return "待决定";
    case "kept":
      return "已保留";
    case "dismissed":
      return "已跳过";
    case "expired":
      return "已过期";
    case "failed":
      return "生成失败";
    default:
      return status;
  }
}

function parseShakeDiscoveryConfig(raw?: string | null): ShakeDiscoveryConfig {
  const fallback = DEFAULT_SHAKE_DISCOVERY_CONFIG;
  if (!raw?.trim()) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ShakeDiscoveryConfig>;
    return {
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : fallback.enabled,
      cooldownMinutes: normalizeNumber(parsed.cooldownMinutes, fallback.cooldownMinutes, 0, 1440),
      sessionExpiryMinutes: normalizeNumber(parsed.sessionExpiryMinutes, fallback.sessionExpiryMinutes, 5, 24 * 60),
      maxSessionsPerDay: normalizeNumber(parsed.maxSessionsPerDay, fallback.maxSessionsPerDay, 1, 100),
      requireCyberAvatarSignals:
        typeof parsed.requireCyberAvatarSignals === "boolean"
          ? parsed.requireCyberAvatarSignals
          : fallback.requireCyberAvatarSignals,
      evidenceWindowHours: normalizeNumber(parsed.evidenceWindowHours, fallback.evidenceWindowHours, 1, 24 * 30),
      maxEvidenceItems: normalizeNumber(parsed.maxEvidenceItems, fallback.maxEvidenceItems, 6, 80),
      candidateDirectionCount: normalizeNumber(parsed.candidateDirectionCount, fallback.candidateDirectionCount, 2, 8),
      noveltyWeight: normalizeFloat(parsed.noveltyWeight, fallback.noveltyWeight),
      surpriseWeight: normalizeFloat(parsed.surpriseWeight, fallback.surpriseWeight),
      allowMedical: typeof parsed.allowMedical === "boolean" ? parsed.allowMedical : fallback.allowMedical,
      allowLegal: typeof parsed.allowLegal === "boolean" ? parsed.allowLegal : fallback.allowLegal,
      allowFinance: typeof parsed.allowFinance === "boolean" ? parsed.allowFinance : fallback.allowFinance,
      planningPrompt:
        typeof parsed.planningPrompt === "string" && parsed.planningPrompt.trim()
          ? parsed.planningPrompt
          : fallback.planningPrompt,
      roleGenerationPrompt:
        typeof parsed.roleGenerationPrompt === "string" && parsed.roleGenerationPrompt.trim()
          ? parsed.roleGenerationPrompt
          : fallback.roleGenerationPrompt,
    };
  } catch {
    return fallback;
  }
}

function parseShakeDiscoverySessions(raw?: string | null) {
  if (!raw?.trim()) {
    return [] as ShakeDiscoverySessionRecord[];
  }

  try {
    const parsed = JSON.parse(raw) as ShakeDiscoverySessionRecord[];
    if (!Array.isArray(parsed)) {
      return [] as ShakeDiscoverySessionRecord[];
    }
    return parsed
      .filter((item): item is ShakeDiscoverySessionRecord => Boolean(item && typeof item === "object" && typeof item.id === "string"))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } catch {
    return [] as ShakeDiscoverySessionRecord[];
  }
}

function normalizeNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function normalizeFloat(value: unknown, fallback: number) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, parsed));
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "暂无";
  }

  return new Date(value).toLocaleString("zh-CN");
}
