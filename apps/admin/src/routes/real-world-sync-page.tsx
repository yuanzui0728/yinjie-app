import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type {
  RealWorldSyncCharacterDetail,
  RealWorldNewsBulletinSlot,
  RealWorldSyncRules,
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
  AdminActionFeedback,
  AdminCallout,
  AdminCodeBlock,
  AdminEmptyState,
  AdminInfoRows,
  AdminPageHero,
  AdminRecordCard,
  AdminSectionHeader,
  AdminSelectField,
  AdminTextArea,
  AdminTextField,
} from "../components/admin-workbench";
import { adminApi } from "../lib/admin-api";
import { resolveAdminCoreApiBaseUrl } from "../lib/core-api-base";

const APPLY_MODE_LABELS: Record<string, string> = {
  disabled: "关闭",
  shadow: "影子模式",
  live: "直接生效",
};

const PROVIDER_MODE_LABELS: Record<string, string> = {
  google_news_rss: "Google News RSS",
  mock: "Mock 回退",
};

const SIGNAL_STATUS_LABELS: Record<string, string> = {
  accepted: "已采纳",
  filtered_low_confidence: "低可信过滤",
  filtered_identity_mismatch: "身份不匹配",
  filtered_duplicate: "重复过滤",
  manual_excluded: "人工排除",
};

const BULLETIN_SLOT_LABELS: Record<RealWorldNewsBulletinSlot, string> = {
  morning: "早报",
  noon: "午报",
  evening: "晚报",
};

const BULLETIN_SLOT_ORDER: RealWorldNewsBulletinSlot[] = [
  "morning",
  "noon",
  "evening",
];

function listToCsv(items: string[]) {
  return items.join(", ");
}

function csvToList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePositiveNumber(value: string, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function parseConfidence(value: string, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, parsed));
}

function parseBooleanSelect(value: string) {
  return value === "true";
}

function formatTime(value?: string | null) {
  if (!value) {
    return "未执行";
  }
  return new Date(value).toLocaleString("zh-CN");
}

function toneForApplyMode(mode: string) {
  if (mode === "live") {
    return "healthy" as const;
  }
  if (mode === "shadow") {
    return "warning" as const;
  }
  return "muted" as const;
}

function toneForSignalStatus(status: string) {
  return status === "accepted" ? ("healthy" as const) : ("muted" as const);
}

function sortBulletinSlots(slots: RealWorldNewsBulletinSlot[]) {
  return [...slots].sort(
    (left, right) =>
      BULLETIN_SLOT_ORDER.indexOf(left) - BULLETIN_SLOT_ORDER.indexOf(right),
  );
}

function formatBulletinSlots(slots: RealWorldNewsBulletinSlot[]) {
  const ordered = sortBulletinSlots(slots);
  if (ordered.length === 0) {
    return "未发布";
  }
  return ordered.map((slot) => BULLETIN_SLOT_LABELS[slot]).join(" / ");
}

export function RealWorldSyncPage() {
  const baseUrl = resolveAdminCoreApiBaseUrl();
  const queryClient = useQueryClient();
  const [rulesDraft, setRulesDraft] = useState<RealWorldSyncRules | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState("");

  const overviewQuery = useQuery({
    queryKey: ["admin-real-world-sync-overview", baseUrl],
    queryFn: () => adminApi.getRealWorldSyncOverview(),
  });

  useEffect(() => {
    if (!overviewQuery.data) {
      return;
    }
    setRulesDraft(overviewQuery.data.rules);
    if (!selectedCharacterId && overviewQuery.data.characters[0]) {
      setSelectedCharacterId(overviewQuery.data.characters[0].characterId);
    }
  }, [overviewQuery.data, selectedCharacterId]);

  const detailQuery = useQuery({
    queryKey: ["admin-real-world-sync-character", baseUrl, selectedCharacterId],
    queryFn: () =>
      adminApi.getRealWorldSyncCharacterDetail(selectedCharacterId),
    enabled: Boolean(selectedCharacterId),
  });

  const saveRulesMutation = useMutation({
    mutationFn: (payload: RealWorldSyncRules) =>
      adminApi.setRealWorldSyncRules(payload),
    onSuccess: (nextRules) => {
      setRulesDraft(nextRules);
      void queryClient.invalidateQueries({
        queryKey: ["admin-real-world-sync-overview", baseUrl],
      });
    },
  });

  const runMutation = useMutation({
    mutationFn: (characterId?: string | null) =>
      adminApi.runRealWorldSync({ characterId }),
    onSuccess: async (_, characterId) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-real-world-sync-overview", baseUrl],
        }),
        characterId
          ? queryClient.invalidateQueries({
              queryKey: [
                "admin-real-world-sync-character",
                baseUrl,
                characterId,
              ],
            })
          : Promise.resolve(),
      ]);
    },
  });

  const publishBulletinMutation = useMutation({
    mutationFn: (slot: RealWorldNewsBulletinSlot) =>
      adminApi.publishRealWorldNewsBulletin({ slot }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-real-world-sync-overview", baseUrl],
        }),
        selectedCharacterId
          ? queryClient.invalidateQueries({
              queryKey: [
                "admin-real-world-sync-character",
                baseUrl,
                selectedCharacterId,
              ],
            })
          : Promise.resolve(),
      ]);
    },
  });

  const isRulesDirty = useMemo(() => {
    if (!rulesDraft || !overviewQuery.data) {
      return false;
    }
    return (
      JSON.stringify(rulesDraft) !== JSON.stringify(overviewQuery.data.rules)
    );
  }, [overviewQuery.data, rulesDraft]);

  if (overviewQuery.isLoading) {
    return <LoadingBlock label="正在读取真实世界联动..." />;
  }

  if (overviewQuery.isError && overviewQuery.error instanceof Error) {
    return <ErrorBlock message={overviewQuery.error.message} />;
  }

  if (!overviewQuery.data || !rulesDraft) {
    return (
      <AdminEmptyState
        title="真实世界联动暂不可用"
        description="后端 real-world-sync 模块还没成功返回概览数据。"
      />
    );
  }

  const overview = overviewQuery.data;
  const detail: RealWorldSyncCharacterDetail | null = detailQuery.data ?? null;
  const characterNameById = new Map(
    overview.characters.map((item) => [item.characterId, item.characterName]),
  );

  return (
    <div className="space-y-6">
      <AdminPageHero
        eyebrow="Reality Sync"
        title="真实世界新闻联动与日更提示词"
        description="每天为角色收集外部现实信号，生成现实摘要、scene patch 和现实发圈锚点，再以 overlay 方式注入聊天与内容生成链路。界闻会在此基础上固定执行早报、午报、晚报三段播报。"
        metrics={[
          { label: "已启用角色", value: overview.stats.enabledCharacters },
          { label: "Live 生效角色", value: overview.stats.liveCharacters },
          { label: "今日信号数", value: overview.stats.signalsToday },
          {
            label: "今日新闻简报",
            value: overview.stats.newsBulletinsToday,
          },
        ]}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() =>
                void queryClient.invalidateQueries({
                  queryKey: ["admin-real-world-sync-overview", baseUrl],
                })
              }
            >
              刷新概览
            </Button>
            <Button
              variant="secondary"
              disabled={runMutation.isPending}
              onClick={() => runMutation.mutate(null)}
            >
              {runMutation.isPending ? "执行中..." : "全量立即同步"}
            </Button>
            <Button
              variant="primary"
              disabled={!isRulesDirty || saveRulesMutation.isPending}
              onClick={() => saveRulesMutation.mutate(rulesDraft)}
            >
              {saveRulesMutation.isPending ? "保存中..." : "保存全局规则"}
            </Button>
          </>
        }
      />

      {saveRulesMutation.isSuccess ? (
        <AdminActionFeedback
          tone="success"
          title="Reality Sync 规则已保存"
          description="新的默认搜索窗口、信号阈值和摘要模板已经写入后台配置。"
        />
      ) : null}
      {runMutation.isSuccess ? (
        <AdminActionFeedback
          tone="success"
          title="Reality Sync 已执行"
          description={`成功 ${runMutation.data.successCount} 个，失败 ${runMutation.data.failedCount} 个。`}
        />
      ) : null}
      {publishBulletinMutation.isSuccess ? (
        <AdminActionFeedback
          tone={publishBulletinMutation.data.created ? "success" : "info"}
          title={
            publishBulletinMutation.data.created
              ? "界闻简报已发布"
              : "界闻简报未重复发布"
          }
          description={publishBulletinMutation.data.summary}
        />
      ) : null}
      {saveRulesMutation.isError && saveRulesMutation.error instanceof Error ? (
        <ErrorBlock message={saveRulesMutation.error.message} />
      ) : null}
      {runMutation.isError && runMutation.error instanceof Error ? (
        <ErrorBlock message={runMutation.error.message} />
      ) : null}
      {publishBulletinMutation.isError &&
      publishBulletinMutation.error instanceof Error ? (
        <ErrorBlock message={publishBulletinMutation.error.message} />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <Card className="bg-[color:var(--surface-console)]">
            <AdminSectionHeader
              title="全局规则"
              actions={
                <StatusPill tone={isRulesDirty ? "warning" : "muted"}>
                  {isRulesDirty ? "草稿未保存" : "已同步"}
                </StatusPill>
              }
            />
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <AdminSelectField
                label="默认采集 Provider"
                value={rulesDraft.providerMode}
                onChange={(value) =>
                  setRulesDraft((current) =>
                    current
                      ? {
                          ...current,
                          providerMode:
                            value === "google_news_rss" ? value : "mock",
                        }
                      : current,
                  )
                }
                options={[
                  {
                    value: "google_news_rss",
                    label: PROVIDER_MODE_LABELS.google_news_rss,
                  },
                  {
                    value: "mock",
                    label: PROVIDER_MODE_LABELS.mock,
                  },
                ]}
              />
              <AdminTextField
                label="默认语言区域"
                value={rulesDraft.defaultLocale}
                onChange={(value) =>
                  setRulesDraft((current) =>
                    current
                      ? {
                          ...current,
                          defaultLocale: value,
                        }
                      : current,
                  )
                }
              />
              <AdminTextField
                label="回溯小时"
                value={rulesDraft.defaultRecencyHours}
                type="number"
                min={1}
                onChange={(value) =>
                  setRulesDraft((current) =>
                    current
                      ? {
                          ...current,
                          defaultRecencyHours: parsePositiveNumber(
                            value,
                            current.defaultRecencyHours,
                          ),
                        }
                      : current,
                  )
                }
              />
              <AdminTextField
                label="每轮最多信号"
                value={rulesDraft.defaultMaxSignalsPerRun}
                type="number"
                min={1}
                onChange={(value) =>
                  setRulesDraft((current) =>
                    current
                      ? {
                          ...current,
                          defaultMaxSignalsPerRun: parsePositiveNumber(
                            value,
                            current.defaultMaxSignalsPerRun,
                          ),
                        }
                      : current,
                  )
                }
              />
              <AdminTextField
                label="最低可信阈值"
                value={rulesDraft.defaultMinimumConfidence}
                type="number"
                min={0}
                max={1}
                onChange={(value) =>
                  setRulesDraft((current) =>
                    current
                      ? {
                          ...current,
                          defaultMinimumConfidence: parseConfidence(
                            value,
                            current.defaultMinimumConfidence,
                          ),
                        }
                      : current,
                  )
                }
              />
              <AdminTextField
                label="Google News 语言"
                value={rulesDraft.googleNews.editionLanguage}
                onChange={(value) =>
                  setRulesDraft((current) =>
                    current
                      ? {
                          ...current,
                          googleNews: {
                            ...current.googleNews,
                            editionLanguage: value,
                          },
                        }
                      : current,
                  )
                }
              />
              <AdminTextField
                label="Google News 地区"
                value={rulesDraft.googleNews.editionRegion}
                onChange={(value) =>
                  setRulesDraft((current) =>
                    current
                      ? {
                          ...current,
                          googleNews: {
                            ...current.googleNews,
                            editionRegion: value,
                          },
                        }
                      : current,
                  )
                }
              />
              <AdminTextField
                label="Google News CEID"
                value={rulesDraft.googleNews.editionCeid}
                onChange={(value) =>
                  setRulesDraft((current) =>
                    current
                      ? {
                          ...current,
                          googleNews: {
                            ...current.googleNews,
                            editionCeid: value,
                          },
                        }
                      : current,
                  )
                }
              />
              <AdminTextField
                label="Google News 拉取上限"
                value={rulesDraft.googleNews.maxEntriesPerQuery}
                type="number"
                min={1}
                onChange={(value) =>
                  setRulesDraft((current) =>
                    current
                      ? {
                          ...current,
                          googleNews: {
                            ...current.googleNews,
                            maxEntriesPerQuery: parsePositiveNumber(
                              value,
                              current.googleNews.maxEntriesPerQuery,
                            ),
                          },
                        }
                      : current,
                  )
                }
              />
              <AdminSelectField
                label="无结果时回退 Mock"
                value={String(rulesDraft.googleNews.fallbackToMockOnEmpty)}
                onChange={(value) =>
                  setRulesDraft((current) =>
                    current
                      ? {
                          ...current,
                          googleNews: {
                            ...current.googleNews,
                            fallbackToMockOnEmpty: parseBooleanSelect(value),
                          },
                        }
                      : current,
                  )
                }
                options={[
                  { value: "true", label: "开启回退" },
                  { value: "false", label: "仅保留真实结果" },
                ]}
              />
            </div>
            <div className="mt-4 grid gap-4">
              <AdminCallout
                title="Provider 行为"
                tone="info"
                description={`当前默认 provider 为 ${PROVIDER_MODE_LABELS[rulesDraft.providerMode] ?? rulesDraft.providerMode}。普通公众人物会先按这里采集；界闻角色仍固定优先走专用 RSS 聚合。`}
              />
              <AdminTextField
                label="默认白名单来源"
                value={listToCsv(rulesDraft.defaultSourceAllowlist)}
                onChange={(value) =>
                  setRulesDraft((current) =>
                    current
                      ? {
                          ...current,
                          defaultSourceAllowlist: csvToList(value),
                        }
                      : current,
                  )
                }
              />
              <AdminTextField
                label="默认黑名单来源"
                value={listToCsv(rulesDraft.defaultSourceBlocklist)}
                onChange={(value) =>
                  setRulesDraft((current) =>
                    current
                      ? {
                          ...current,
                          defaultSourceBlocklist: csvToList(value),
                        }
                      : current,
                  )
                }
              />
              <AdminTextArea
                label="信号归一化提示词"
                value={rulesDraft.promptTemplates.signalNormalizationPrompt}
                onChange={(value) =>
                  setRulesDraft((current) =>
                    current
                      ? {
                          ...current,
                          promptTemplates: {
                            ...current.promptTemplates,
                            signalNormalizationPrompt: value,
                          },
                        }
                      : current,
                  )
                }
              />
              <AdminTextArea
                label="日摘要提示词"
                value={rulesDraft.promptTemplates.dailyDigestPrompt}
                onChange={(value) =>
                  setRulesDraft((current) =>
                    current
                      ? {
                          ...current,
                          promptTemplates: {
                            ...current.promptTemplates,
                            dailyDigestPrompt: value,
                          },
                        }
                      : current,
                  )
                }
              />
              <AdminTextArea
                label="Scene Patch 提示词"
                value={rulesDraft.promptTemplates.scenePatchPrompt}
                onChange={(value) =>
                  setRulesDraft((current) =>
                    current
                      ? {
                          ...current,
                          promptTemplates: {
                            ...current.promptTemplates,
                            scenePatchPrompt: value,
                          },
                        }
                      : current,
                  )
                }
              />
              <AdminTextArea
                label="现实发圈提示词"
                value={rulesDraft.promptTemplates.realityMomentPrompt}
                onChange={(value) =>
                  setRulesDraft((current) =>
                    current
                      ? {
                          ...current,
                          promptTemplates: {
                            ...current.promptTemplates,
                            realityMomentPrompt: value,
                          },
                        }
                      : current,
                  )
                }
              />
            </div>
          </Card>

          <Card className="bg-[color:var(--surface-console)]">
            <SectionHeading>最近执行</SectionHeading>
            <div className="mt-4 space-y-3">
              {overview.recentRuns.slice(0, 8).map((run) => (
                <AdminRecordCard
                  key={run.id}
                  title={
                    characterNameById.get(run.characterId) ?? run.characterId
                  }
                  badges={
                    <StatusPill
                      tone={
                        run.status === "success"
                          ? "healthy"
                          : run.status === "failed"
                            ? "warning"
                            : "muted"
                      }
                    >
                      {run.status}
                    </StatusPill>
                  }
                  meta={`查询：${run.searchQuery ?? "未记录"} | 开始：${formatTime(run.startedAt)}`}
                  description={`采纳 ${run.acceptedSignalCount} 条，过滤 ${run.filteredSignalCount} 条`}
                />
              ))}
            </div>
          </Card>

          <Card className="bg-[color:var(--surface-console)]">
            <SectionHeading>最近信号</SectionHeading>
            <div className="mt-4 space-y-3">
              {overview.recentSignals.slice(0, 8).map((signal) => (
                <AdminRecordCard
                  key={signal.id}
                  title={signal.title}
                  badges={
                    <StatusPill tone={toneForSignalStatus(signal.status)}>
                      {SIGNAL_STATUS_LABELS[signal.status] ?? signal.status}
                    </StatusPill>
                  }
                  meta={`${signal.sourceName} | ${formatTime(signal.publishedAt ?? signal.capturedAt)}`}
                  description={
                    signal.normalizedSummary ?? signal.snippet ?? "暂无摘要"
                  }
                />
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-[color:var(--surface-console)]">
            <AdminSectionHeader
              title="角色联动状态"
              actions={
                overview.characters.length > 0 ? (
                  <AdminSelectField
                    label="当前角色"
                    value={selectedCharacterId}
                    onChange={setSelectedCharacterId}
                    options={overview.characters.map((item) => ({
                      value: item.characterId,
                      label: item.characterName,
                    }))}
                    className="min-w-[220px]"
                  />
                ) : null
              }
            />
            <div className="mt-4 space-y-3">
              {overview.characters.length > 0 ? (
                overview.characters.map((item) => (
                  <AdminRecordCard
                    key={item.characterId}
                    title={item.characterName}
                    badges={
                      <>
                        {item.isWorldNewsDesk ? (
                          <StatusPill tone="healthy">三段播报角色</StatusPill>
                        ) : null}
                        <StatusPill tone={toneForApplyMode(item.applyMode)}>
                          {APPLY_MODE_LABELS[item.applyMode] ?? item.applyMode}
                        </StatusPill>
                        {item.hasActiveDigest ? (
                          <StatusPill tone="healthy">Digest 生效中</StatusPill>
                        ) : null}
                      </>
                    }
                    meta={
                      item.isWorldNewsDesk
                        ? `今日采纳 ${item.todayAcceptedSignalCount} 条 | 简报进度 ${formatBulletinSlots(item.todayBulletinSlots)}`
                        : `今日采纳 ${item.todayAcceptedSignalCount} 条 | 今日发圈 ${item.hasRealityLinkedMomentToday ? "已完成" : "未完成"}`
                    }
                    description={`主体：${item.subjectName} · 类型：${item.subjectType}`}
                    actions={
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setSelectedCharacterId(item.characterId)
                          }
                        >
                          查看详情
                        </Button>
                        <Link
                          to="/characters/$characterId/factory"
                          params={{ characterId: item.characterId }}
                        >
                          <Button variant="secondary" size="sm">
                            配置角色
                          </Button>
                        </Link>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={runMutation.isPending}
                          onClick={() => runMutation.mutate(item.characterId)}
                        >
                          立即同步
                        </Button>
                      </>
                    }
                    className={
                      selectedCharacterId === item.characterId
                        ? "border-[color:var(--border-brand)]"
                        : undefined
                    }
                  />
                ))
              ) : (
                <AdminEmptyState
                  title="还没有启用真实世界联动的角色"
                  description="先去角色工厂打开“真实世界链接”，再回来观察每日 digest 和现实发圈。"
                />
              )}
            </div>
          </Card>

          {detailQuery.isLoading ? (
            <LoadingBlock label="正在读取角色现实摘要..." />
          ) : detailQuery.isError && detailQuery.error instanceof Error ? (
            <ErrorBlock message={detailQuery.error.message} />
          ) : detail ? (
            <Card className="bg-[color:var(--surface-console)]">
              <AdminSectionHeader
                title={`${detail.characterName} · 当前 digest`}
                actions={
                  <StatusPill tone={toneForApplyMode(detail.config.applyMode)}>
                    {APPLY_MODE_LABELS[detail.config.applyMode] ??
                      detail.config.applyMode}
                  </StatusPill>
                }
              />
              <div className="mt-4 space-y-4">
                <AdminInfoRows
                  title="角色配置"
                  rows={[
                    {
                      label: "启用状态",
                      value: detail.config.enabled ? "开启" : "关闭",
                    },
                    { label: "主体名称", value: detail.config.subjectName },
                    { label: "主体类型", value: detail.config.subjectType },
                    { label: "查询模板", value: detail.config.queryTemplate },
                    {
                      label: "现实发圈策略",
                      value: detail.config.realityMomentPolicy,
                    },
                  ]}
                />

                {detail.isWorldNewsDesk ? (
                  <AdminCallout
                    title="界闻三段播报"
                    tone="success"
                    description={`今天已完成：${formatBulletinSlots(detail.todayBulletinSlots)}。调度窗口为 07:30-09:30、11:30-13:30、18:30-21:00，同一时段当天只发一次。`}
                    actions={
                      <>
                        {BULLETIN_SLOT_ORDER.map((slot) => (
                          <Button
                            key={slot}
                            variant="secondary"
                            size="sm"
                            disabled={publishBulletinMutation.isPending}
                            onClick={() =>
                              publishBulletinMutation.mutate(slot)
                            }
                          >
                            {publishBulletinMutation.isPending &&
                            publishBulletinMutation.variables === slot
                              ? `补发${BULLETIN_SLOT_LABELS[slot]}中...`
                              : `补发${BULLETIN_SLOT_LABELS[slot]}`}
                          </Button>
                        ))}
                      </>
                    }
                  />
                ) : null}

                {detail.activeDigest ? (
                  <>
                    <AdminCallout
                      title="今日现实摘要"
                      tone="info"
                      description={detail.activeDigest.dailySummary}
                    />
                    <AdminCodeBlock
                      value={JSON.stringify(
                        detail.activeDigest.scenePatchPayload,
                        null,
                        2,
                      )}
                    />
                    {detail.activeDigest.globalOverlay ? (
                      <AdminCodeBlock
                        value={detail.activeDigest.globalOverlay}
                      />
                    ) : null}
                    {detail.activeDigest.realityMomentBrief ? (
                      <AdminCallout
                        title="现实发圈锚点"
                        tone="success"
                        description={detail.activeDigest.realityMomentBrief}
                      />
                    ) : null}
                  </>
                ) : (
                  <AdminEmptyState
                    title="当前没有 active digest"
                    description="该角色还没跑出 live digest，或者当前处于 shadow / disabled 模式。"
                  />
                )}

                <div className="grid gap-3">
                  {detail.recentSignals.slice(0, 6).map((signal) => (
                    <AdminRecordCard
                      key={signal.id}
                      title={signal.title}
                      badges={
                        <StatusPill tone={toneForSignalStatus(signal.status)}>
                          {SIGNAL_STATUS_LABELS[signal.status] ?? signal.status}
                        </StatusPill>
                      }
                      meta={`${signal.sourceName} | ${formatTime(signal.publishedAt ?? signal.capturedAt)}`}
                      description={
                        signal.normalizedSummary ?? signal.snippet ?? "暂无摘要"
                      }
                    />
                  ))}
                </div>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
